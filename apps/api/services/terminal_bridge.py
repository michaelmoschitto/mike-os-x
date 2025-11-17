import asyncio
import json
import logging
import time
import uuid
from fastapi import WebSocket, WebSocketDisconnect

from services.container_manager import ContainerManager
from services.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)

MAX_WEBSOCKET_MESSAGE_SIZE = 64 * 1024
MAX_INPUT_SIZE = 64 * 1024
MAX_TOTAL_INPUT_PER_SESSION = 10 * 1024 * 1024
MIN_TERMINAL_COLS = 1
MAX_TERMINAL_COLS = 1000
MIN_TERMINAL_ROWS = 1
MAX_TERMINAL_ROWS = 1000
SESSION_IDLE_TIMEOUT = 30 * 60


class TerminalBridge:
    def __init__(self) -> None:
        self.container_manager = ContainerManager()
        self.rate_limiter = RateLimiter()
        self.session_input_totals: dict[str, int] = {}
        self.session_last_activity: dict[str, float] = {}

    async def handle_websocket(self, websocket: WebSocket, client_ip: str) -> None:
        await websocket.accept()
        logger.info(f"WebSocket connection accepted from {client_ip}")

        connection_id = str(uuid.uuid4())
        user_agent = websocket.headers.get("user-agent", "unknown")
        exec_socket = None
        sock = None
        timeout_task = None

        try:
            await self.rate_limiter.check_connection_limit(client_ip)
            self.rate_limiter.track_connection(connection_id, client_ip, user_agent)
            self.session_last_activity[connection_id] = time.time()

            container = self.container_manager.ensure_container_running()
            logger.info(f"Container {container.id} is running")

            exec_id = container.client.api.exec_create(
                container.id,
                cmd="/bin/zsh",
                stdin=True,
                stdout=True,
                stderr=True,
                tty=True,
                user="workspace",
                environment={
                    "TERM": "xterm-256color",
                    "LANG": "en_US.UTF-8",
                    "LC_ALL": "en_US.UTF-8",
                },
            )
            logger.info(f"Created exec instance {exec_id['Id']}")

            exec_socket = container.client.api.exec_start(
                exec_id['Id'],
                socket=True,
                tty=True,
            )
            logger.info("Exec socket started")
            
            sock = exec_socket._sock
            sock.setblocking(False)

            read_task = None
            write_task = None

            async def read_from_container() -> None:
                nonlocal read_task
                loop = asyncio.get_event_loop()
                try:
                    while True:
                        try:
                            data = await loop.sock_recv(sock, 4096)
                            if data:
                                self.session_last_activity[connection_id] = time.time()
                                decoded = data.decode("utf-8", errors="replace")
                                await websocket.send_text(decoded)
                            else:
                                logger.info("Socket closed by container")
                                break
                        except OSError as e:
                            logger.info(f"Socket error during read: {e}")
                            break
                        except Exception as e:
                            logger.error(f"Error reading from container: {e}")
                            break
                except WebSocketDisconnect:
                    logger.info("WebSocket disconnected during read")
                except Exception as e:
                    logger.error(f"Unexpected error in read_from_container: {e}")

            async def write_to_container() -> None:
                nonlocal write_task
                loop = asyncio.get_event_loop()
                try:
                    while True:
                        try:
                            data = await websocket.receive_text()
                            
                            if len(data.encode('utf-8')) > MAX_WEBSOCKET_MESSAGE_SIZE:
                                logger.warning(f"WebSocket message too large: {len(data.encode('utf-8'))} bytes")
                                await websocket.send_text(
                                    "\r\nMessage too large. Maximum size is 64KB.\r\n"
                                )
                                continue
                            
                            try:
                                msg = json.loads(data)
                                if isinstance(msg, dict) and msg.get("type") == "resize":
                                    cols = msg.get("cols", 80)
                                    rows = msg.get("rows", 24)
                                    
                                    if not isinstance(cols, int) or not isinstance(rows, int):
                                        logger.warning(f"Invalid resize dimensions type: cols={type(cols)}, rows={type(rows)}")
                                        continue
                                    
                                    if cols < MIN_TERMINAL_COLS or cols > MAX_TERMINAL_COLS:
                                        logger.warning(f"Invalid cols value: {cols}")
                                        continue
                                    
                                    if rows < MIN_TERMINAL_ROWS or rows > MAX_TERMINAL_ROWS:
                                        logger.warning(f"Invalid rows value: {rows}")
                                        continue
                                    
                                    logger.info(f"Resize request: {cols}x{rows}")
                                    try:
                                        container.client.api.exec_resize(exec_id['Id'], height=rows, width=cols)
                                        logger.info(f"Resized PTY to {cols}x{rows}")
                                    except Exception as e:
                                        logger.error(f"Failed to resize PTY: {e}")
                                    continue
                            except json.JSONDecodeError:
                                pass
                            
                            if not await self.rate_limiter.check_command_limit(connection_id):
                                await websocket.send_text(
                                    "\r\nRate limit exceeded. Please wait.\r\n"
                                )
                                continue
                            
                            encoded_data = data.encode('utf-8')
                            
                            if len(encoded_data) > MAX_INPUT_SIZE:
                                logger.warning(f"Input too large: {len(encoded_data)} bytes")
                                await websocket.send_text(
                                    "\r\nInput too large. Maximum size is 64KB.\r\n"
                                )
                                continue
                            
                            try:
                                encoded_data.decode('utf-8')
                            except UnicodeDecodeError:
                                logger.warning("Input contains invalid UTF-8 encoding")
                                await websocket.send_text(
                                    "\r\nInvalid character encoding.\r\n"
                                )
                                continue
                            
                            self.session_input_totals[connection_id] = (
                                self.session_input_totals.get(connection_id, 0) + len(encoded_data)
                            )
                            
                            if self.session_input_totals[connection_id] > MAX_TOTAL_INPUT_PER_SESSION:
                                logger.warning(f"Session {connection_id} exceeded total input limit")
                                await websocket.send_text(
                                    "\r\nSession input limit exceeded (10MB). Please reconnect.\r\n"
                                )
                                break
                            
                            self.session_last_activity[connection_id] = time.time()
                            
                            total_sent = 0
                            while total_sent < len(encoded_data):
                                try:
                                    await loop.sock_sendall(sock, encoded_data[total_sent:])
                                    total_sent = len(encoded_data)
                                except BlockingIOError:
                                    await asyncio.sleep(0.01)
                                except OSError as e:
                                    logger.error(f"Socket error during write: {e}")
                                    return
                        except OSError as e:
                            logger.error(f"OSError during write: {e}")
                            break
                except WebSocketDisconnect:
                    logger.info("WebSocket disconnected during write")
                except Exception as e:
                    logger.error(f"Unexpected error in write_to_container: {e}")

            async def check_idle_timeout() -> None:
                while True:
                    await asyncio.sleep(60)
                    current_time = time.time()
                    last_activity = self.session_last_activity.get(connection_id, current_time)
                    if current_time - last_activity > SESSION_IDLE_TIMEOUT:
                        logger.info(f"Session {connection_id} idle timeout, closing")
                        try:
                            await websocket.send_text(
                                "\r\n\x1b[33mSession idle timeout (30 minutes). Closing connection.\x1b[0m\r\n"
                            )
                        except Exception:
                            pass
                        try:
                            await websocket.close(code=1000, reason="Idle timeout")
                        except Exception:
                            pass
                        if sock:
                            try:
                                sock.close()
                            except Exception:
                                pass
                        break

            read_task = asyncio.create_task(read_from_container())
            write_task = asyncio.create_task(write_to_container())
            timeout_task = asyncio.create_task(check_idle_timeout())

            _, pending = await asyncio.wait(
                [read_task, write_task, timeout_task],
                return_when=asyncio.FIRST_COMPLETED,
            )

            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

            logger.info("WebSocket connection closed")

        except Exception as e:
            logger.error(f"Error in handle_websocket: {e}", exc_info=True)
            try:
                await websocket.close(code=1011, reason=str(e))
            except Exception:
                pass
        finally:
            self.rate_limiter.untrack_connection(connection_id)
            self.session_input_totals.pop(connection_id, None)
            self.session_last_activity.pop(connection_id, None)
            if timeout_task:
                try:
                    timeout_task.cancel()
                    try:
                        await timeout_task
                    except asyncio.CancelledError:
                        pass
                except Exception:
                    pass
            if read_task:
                try:
                    read_task.cancel()
                    try:
                        await read_task
                    except asyncio.CancelledError:
                        pass
                except Exception:
                    pass
            if write_task:
                try:
                    write_task.cancel()
                    try:
                        await write_task
                    except asyncio.CancelledError:
                        pass
                except Exception:
                    pass
            if sock:
                try:
                    sock.close()
                except Exception:
                    pass
            if exec_socket:
                try:
                    exec_socket.close()
                except Exception:
                    pass

