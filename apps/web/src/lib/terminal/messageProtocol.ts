export type ClientMessageType =
  | 'create_session'
  | 'input'
  | 'resize'
  | 'close_session';

export type ServerMessageType =
  | 'output'
  | 'session_created'
  | 'session_closed'
  | 'error';

export interface CreateSessionMessage {
  type: 'create_session';
  sessionId: string;
}

export interface InputMessage {
  type: 'input';
  sessionId: string;
  data: string;
}

export interface ResizeMessage {
  type: 'resize';
  sessionId: string;
  cols: number;
  rows: number;
}

export interface CloseSessionMessage {
  type: 'close_session';
  sessionId: string;
}

export type ClientMessage =
  | CreateSessionMessage
  | InputMessage
  | ResizeMessage
  | CloseSessionMessage;

export interface OutputMessage {
  type: 'output';
  sessionId: string;
  data: string;
}

export interface SessionCreatedMessage {
  type: 'session_created';
  sessionId: string;
}

export interface SessionClosedMessage {
  type: 'session_closed';
  sessionId: string;
}

export interface ErrorMessage {
  type: 'error';
  sessionId: string;
  error: string;
}

export type ServerMessage =
  | OutputMessage
  | SessionCreatedMessage
  | SessionClosedMessage
  | ErrorMessage;

