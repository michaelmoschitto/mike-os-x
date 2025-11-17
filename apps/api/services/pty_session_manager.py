import asyncio
import logging

from docker.models.containers import Container

from services.container_manager import ContainerManager
from services.message_protocol import ServerMessage

logger = logging.getLogger(__name__)


class PTYSession:
    def __init__(
        self,
        session_id: str,
        exec_id: str,
        exec_socket,
        sock,
        container: Container,
    ) -> None:
        self.session_id = session_id
        self.exec_id = exec_id
        self.exec_socket = exec_socket
        self.sock = sock
        self.container = container
        self.read_task: asyncio.Task | None = None
        self.write_task: asyncio.Task | None = None

    def close(self) -> None:
        if self.sock:
            try:
                self.sock.close()
            except Exception:
                pass

        if self.read_task:
            self.read_task.cancel()

        if self.write_task:
            self.write_task.cancel()


class PTYSessionManager:
    def __init__(self, container_manager: ContainerManager) -> None:
        self.container_manager = container_manager
        self.sessions: dict[str, PTYSession] = {}

    async def create_session(self, session_id: str) -> PTYSession:
        if session_id in self.sessions:
            logger.warning(f"Session {session_id} already exists")
            return self.sessions[session_id]

        container = self.container_manager.ensure_container_running()
        logger.info(f"Container {container.id} is running for session {session_id}")

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
        logger.info(f"Created exec instance {exec_id['Id']} for session {session_id}")

        exec_socket = container.client.api.exec_start(
            exec_id["Id"],
            socket=True,
            tty=True,
        )
        logger.info(f"Exec socket started for session {session_id}")

        sock = exec_socket._sock
        sock.setblocking(False)

        session = PTYSession(session_id, exec_id["Id"], exec_socket, sock, container)
        self.sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> PTYSession | None:
        return self.sessions.get(session_id)

    async def close_session(self, session_id: str) -> None:
        session = self.sessions.pop(session_id, None)
        if session:
            session.close()
            logger.info(f"Closed session {session_id}")

    async def resize_session(self, session_id: str, cols: int, rows: int) -> None:
        session = self.sessions.get(session_id)
        if not session:
            logger.warning(f"Session {session_id} not found for resize")
            return

        try:
            session.container.client.api.exec_resize(session.exec_id, height=rows, width=cols)
            logger.info(f"Resized PTY {session_id} to {cols}x{rows}")
        except Exception as e:
            logger.error(f"Failed to resize PTY {session_id}: {e}")

    async def write_to_session(self, session_id: str, data: bytes) -> None:
        session = self.sessions.get(session_id)
        if not session:
            logger.warning(f"Session {session_id} not found for write")
            return

        loop = asyncio.get_event_loop()
        total_sent = 0
        while total_sent < len(data):
            try:
                await loop.sock_sendall(session.sock, data[total_sent:])
                total_sent = len(data)
            except BlockingIOError:
                await asyncio.sleep(0.01)
            except OSError as e:
                logger.error(f"Socket error during write to session {session_id}: {e}")
                await self.close_session(session_id)
                return

    async def read_from_session(self, session_id: str, websocket, send_message_callback) -> None:
        session = self.sessions.get(session_id)
        if not session:
            logger.warning(f"Session {session_id} not found for read")
            return

        loop = asyncio.get_event_loop()
        try:
            while True:
                try:
                    data = await loop.sock_recv(session.sock, 4096)
                    if data:
                        decoded = data.decode("utf-8", errors="replace")
                        message: ServerMessage = {
                            "type": "output",
                            "sessionId": session_id,
                            "data": decoded,
                        }
                        await send_message_callback(message)
                    else:
                        logger.info(f"Socket closed by container for session {session_id}")
                        break
                except OSError as e:
                    logger.info(f"Socket error during read from session {session_id}: {e}")
                    break
                except Exception as e:
                    logger.error(f"Error reading from session {session_id}: {e}")
                    break
        except Exception as e:
            logger.error(f"Unexpected error in read_from_session for {session_id}: {e}")

    def close_all_sessions(self) -> None:
        for session_id in list(self.sessions.keys()):
            session = self.sessions.pop(session_id)
            if session:
                session.close()
        logger.info("Closed all sessions")
