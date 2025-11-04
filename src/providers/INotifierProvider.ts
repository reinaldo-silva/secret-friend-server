import { OutgoingMessage } from "../types";

export interface INotifierProvider {
  makeError: (socketId: string, message: string) => void;
  send: (socketId: string, payload: OutgoingMessage) => void;
  sendMessageToRoom: (roomId: string, payload: OutgoingMessage) => void;
  joinParticipantRoom: (socketId: string, roomId: string) => void;
  leaveParticipantRoom: (socketId: string, roomId: string) => void;
}
