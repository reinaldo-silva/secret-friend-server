import { OutgoingMessage } from "../types";

export interface INotifierProvider {
  makeError: (socketId: string, message: string) => void;
  send: (socketId: string, payload: OutgoingMessage) => void;
  sendMessageToRoom: (roomId: string, payload: OutgoingMessage) => void;
  joinParticipantRoom: (socketId: string, roomId: string) => void;
  leaveParticipantRoom: (socketId: string, roomId: string) => void;
  trackUserRoom: (
    socketId: string,
    userId: string,
    roomId: string,
    userName?: string
  ) => void;
  untrackUserRoom: (socketId: string) => void;
  getOnlineUsersInRoom: (roomId: string) => { id: string; name?: string }[];
}
