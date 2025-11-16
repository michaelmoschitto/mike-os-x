import asyncio
import json
import logging
import uuid
from fastapi import WebSocket, WebSocketDisconnect

from services.container_manager import ContainerManager
from services.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)


class TerminalBridge:
    def __init__(self) -> None:
        self.container_manager = ContainerManager()
        self.rate_limiter = RateLimiter()

    async def handle_websocket(self, websocket: WebSocket, client_ip: str) -> None:
        await websocket.accept()
        logger.info(f"WebSocket connection accepted from {client_ip}")

        connection_id = str(uuid.uuid4())
        user_agent = websocket.headers.get("user-agent", "unknown")
        exec_socket = None
        sock = None

        try:
            await self.rate_limiter.check_connection_limit(client_ip)
            self.rate_limiter.track_connection(connection_id, client_ip, user_agent)

            container = self.container_manager.ensure_container_running()
            logger.info(f"Container {container.id} is running")

            exec_id = container.client.api.exec_create(
                container.id,
                cmd="/bin/bash",
                stdin=True,
                stdout=True,
                stderr=True,
                tty=True,
                user="workspace",
                environment={"TERM": "xterm-256color"},
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
                            
                            try:
                                msg = json.loads(data)
                                if isinstance(msg, dict) and msg.get("type") == "resize":
                                    cols = msg.get("cols", 80)
                                    rows = msg.get("rows", 24)
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
                            
                            encoded_data = data.encode()
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

            read_task = asyncio.create_task(read_from_container())
            write_task = asyncio.create_task(write_to_container())

            _, pending = await asyncio.wait(
                [read_task, write_task],
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
            if sock:
                try:
                    sock.close()
                except Exception:
                    pass

