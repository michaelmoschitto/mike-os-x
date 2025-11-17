from typing import Literal, TypedDict


class CreateSessionMessage(TypedDict):
    type: Literal["create_session"]
    sessionId: str


class InputMessage(TypedDict):
    type: Literal["input"]
    sessionId: str
    data: str


class ResizeMessage(TypedDict):
    type: Literal["resize"]
    sessionId: str
    cols: int
    rows: int


class CloseSessionMessage(TypedDict):
    type: Literal["close_session"]
    sessionId: str


ClientMessage = CreateSessionMessage | InputMessage | ResizeMessage | CloseSessionMessage


class OutputMessage(TypedDict):
    type: Literal["output"]
    sessionId: str
    data: str


class SessionCreatedMessage(TypedDict):
    type: Literal["session_created"]
    sessionId: str


class SessionClosedMessage(TypedDict):
    type: Literal["session_closed"]
    sessionId: str


class ErrorMessage(TypedDict):
    type: Literal["error"]
    sessionId: str
    error: str


ServerMessage = OutputMessage | SessionCreatedMessage | SessionClosedMessage | ErrorMessage
