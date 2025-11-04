export type Id = string;

export interface Participant {
  id: Id;
  name: string;
  isAdmin?: boolean;
  socketId?: string;
}

export interface Room {
  id: string;
  name?: string;
  adminId: Id;
  participants: Participant[];
}

export type IncomingMessage =
  | {
      type: "create_room";
      roomId: string;
      roomName?: string;
      adminId: Id;
      adminName: string;
    }
  | { type: "join_room"; roomId: string; clientId: Id; name: string }
  | {
      type: "add_participant";
      roomId: string;
      adminId: Id;
      participantId: Id;
      name: string;
    }
  | { type: "start_draw"; roomId: string; adminId: Id }
  | { type: "leave_room"; roomId: string; clientId: Id }
  | { type: "ping" }
  | { type: "broadcast"; roomId: string; adminId: Id; message: string };

export type OutgoingMessage =
  | { type: "error"; message: string }
  | { type: "room_created"; roomId: string }
  | { type: "joined"; roomId: string; participants: Participant[] }
  | { type: "participant_added"; participant: Participant }
  | { type: "your_match"; match: Participant }
  | {
      type: "draw_result_admin";
      mapping: { from: Participant; to: Participant }[];
    }
  | { type: "left"; roomId: string; clientId: Id }
  | { type: "pong" }
  | { type: "broadcast"; from: Participant; message: string };
