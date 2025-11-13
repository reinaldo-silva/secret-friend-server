export type Id = string;

export interface User {
  id: Id;
  name: string;
  isAdmin?: boolean;
  socketId?: string;
}

export interface Room {
  id: string;
  name?: string;
  adminId: Id;
  participants: User[];
  alreadyDraw: boolean;
}

export type IncomingMessage =
  | { type: "connect_server"; user: User }
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
  | { type: "broadcast"; roomId: string; adminId: Id; message: string }
  | { type: "get_room_by_id"; roomId: string };

export type OutgoingMessage =
  | { type: "error"; message: string }
  | { type: "room_created"; roomId: string }
  | { type: "joined"; roomId: string; participants: User[] }
  | { type: "participant_added"; participant: User }
  | { type: "your_match"; match: User }
  | {
      type: "draw_result_admin";
      mapping: { from: User; to: User }[];
    }
  | { type: "left"; roomId: string; clientId: Id }
  | { type: "pong" }
  | { type: "broadcast"; from: User; message: string }
  | { type: "room_found"; room: Room };
