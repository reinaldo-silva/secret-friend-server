import http from "http";
import { Server, Socket } from "socket.io";
import { RoomRepository } from "../repositories/RoomRepository";
import { UserRepository } from "../repositories/UserRepository";
import { AddParticipantService } from "../services/addParticipant";
import { BroadcastService } from "../services/broadcast";
import { ConnectNotification } from "../services/connectNotification";
import { CreateRoomService } from "../services/createRoom";
import { GetRoomById } from "../services/getRoomById";
import { JoinRoomService } from "../services/joinRoom";
import { LeaveRoomService } from "../services/leaveRoom";
import { StarDrawService } from "../services/startDraw";
import { IncomingMessage, OutgoingMessage } from "../types";
import { AppError } from "../utils/AppError";
import { INotifierProvider } from "./INotifierProvider";

export class SocketIoProvider implements INotifierProvider {
  client: Server;

  constructor(
    server: http.Server,
    roomRepository: RoomRepository,
    userRepository: UserRepository
  ) {
    const io = new Server(server, {
      cors: {
        origin:
          process.env.ENV === "development" ? "*" : process.env.FRONTEND_URL,
      },
    });

    io.on("connection", (socket: Socket) => {
      console.log("✅ Client connected:", socket.id);

      socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id);
      });

      socket.on("message", async (msg: IncomingMessage) => {
        console.log("📩 Received:", msg);

        try {
          if (!msg || typeof msg !== "object" || !("type" in msg)) {
            throw new AppError("invalid_message");
          }

          if (msg.type === "connect_server") {
            const { user } = msg;

            const connectNotification = new ConnectNotification(userRepository);

            await connectNotification.handler(user, socket.id);

            return;
          }

          if (msg.type === "ping") {
            this.send(socket.id, { type: "pong" });
            return;
          }

          if (msg.type === "create_room") {
            const { roomId, roomName, adminId, adminName } = msg;

            const createRoomService = new CreateRoomService(
              roomRepository,
              this
            );

            await createRoomService.handle(
              roomId,
              roomName || "Room_Name_Default",
              adminId,
              adminName,
              socket.id
            );

            return;
          }

          if (msg.type === "join_room") {
            const { roomId, clientId, name } = msg;

            const joinRoomService = new JoinRoomService(roomRepository, this);

            await joinRoomService.handle(roomId, clientId, name, socket.id);

            return;
          }

          if (msg.type === "add_participant") {
            const { roomId, adminId, participantId, name } = msg;

            const addParticipantService = new AddParticipantService(
              roomRepository,
              this
            );

            await addParticipantService.handle(
              roomId,
              adminId,
              participantId,
              name
            );

            return;
          }

          if (msg.type === "leave_room") {
            const { roomId, clientId } = msg;

            const leaveRoomService = new LeaveRoomService(roomRepository, this);

            await leaveRoomService.handle(roomId, clientId);

            return;
          }

          if (msg.type === "broadcast") {
            const { roomId, adminId, message } = msg;

            const broadcastService = new BroadcastService(roomRepository, this);

            await broadcastService.handle(roomId, message, adminId);

            return;
          }

          if (msg.type === "start_draw") {
            const { roomId, adminId } = msg;

            const starDrawService = new StarDrawService(
              roomRepository,
              userRepository,
              this
            );

            await starDrawService.handle(roomId, adminId);

            return;
          }

          if (msg.type === "get_room_by_id") {
            const { roomId, clientId } = msg;

            const getRoomById = new GetRoomById(roomRepository, this);

            await getRoomById.handle(roomId, socket.id, clientId);

            return;
          }

          throw new AppError("unknown_message_type");
        } catch (err) {
          if (err instanceof AppError) {
            return this.makeError(socket.id, err.message);
          }

          console.error("Error handling message:", err);
          this.makeError(socket.id, "internal_server_error");
        }
      });
    });

    this.client = io;
  }

  leaveParticipantRoom(socketId: string, roomId: string) {
    const socket = this.getSocketById(socketId);
    if (!socket) {
      console.error("Socket not found for leaveParticipantRoom:", socketId);
      return;
    }
    socket.leave(roomId);
  }

  makeError(socketId: string, message: string) {
    console.log("❗ Error:", message);
    const socket = this.getSocketById(socketId);
    if (!socket) {
      console.error("Socket not found for makeError:", socketId);
      return;
    }
    this.send(socket.id, { type: "error", message });
  }

  send(socketId: string, payload: OutgoingMessage) {
    const socket = this.getSocketById(socketId);
    if (!socket) {
      console.error("Socket not found for send:", socketId);
      return;
    }
    try {
      socket.emit("message", payload);
    } catch (err) {
      console.error("send error", err);
    }
  }

  sendMessageToRoom(roomId: string, payload: OutgoingMessage) {
    this.client.to(roomId).emit("message", payload);
  }

  joinParticipantRoom(socketId: string, roomId: string) {
    const socket = this.getSocketById(socketId);
    if (!socket) {
      console.error("Socket not found for joinParticipantRoom:", socketId);
      return;
    }
    socket.join(roomId);
  }

  private getSocketById(socketId: string | undefined): Socket | null {
    if (!socketId) return null;
    const socket = this.client.sockets.sockets.get(socketId);
    return socket || null;
  }
}
