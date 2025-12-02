import http from "http";
import { Server, Socket } from "socket.io";
import { RoomRepository } from "../repositories/RoomRepository";
import { UserRepository } from "../repositories/UserRepository";
import { AddParticipantService } from "../services/addParticipant";
import { BroadcastService } from "../services/broadcast";
import { ConnectNotification } from "../services/connectNotification";
import { CreateRoomService } from "../services/createRoom";
import { GetResultByToken } from "../services/getResultByToken";
import { GetRoomById } from "../services/getRoomById";
import { HandleDisconnectService } from "../services/handleDisconnect";
import { JoinRoomService } from "../services/joinRoom";
import { LeaveRoomService } from "../services/leaveRoom";
import { StarDrawService } from "../services/startDraw";
import { IncomingMessage, OutgoingMessage } from "../types";
import { AppError } from "../utils/AppError";
import { INotifierProvider } from "./INotifierProvider";

export class SocketIoProvider implements INotifierProvider {
  client: Server;
  private socketUserMap: Map<
    string,
    { userId: string; userName?: string; room: string }
  > = new Map();

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

      socket.on("disconnect", async () => {
        console.log("❌ Client disconnected:", socket.id);

        const info = this.socketUserMap.get(socket.id);

        const handleDisconnect = new HandleDisconnectService(this);

        await handleDisconnect.handle(socket.id, info?.userId, info?.room);
      });

      socket.on("message", async (msg: IncomingMessage) => {
        console.log("📩 Received:", msg);

        try {
          if (!msg || typeof msg !== "object" || !("type" in msg)) {
            throw new AppError("invalid_message");
          }

          if (msg.type === "connect_server") {
            const { user, roomId } = msg;

            const connectNotification = new ConnectNotification(
              userRepository,
              roomRepository,
              this
            );

            await connectNotification.handler(user, socket.id, roomId);

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
              userRepository,
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

          if (msg.type === "get_result_by_token") {
            const { roomId, token } = msg;

            const getResultByToken = new GetResultByToken(roomRepository, this);

            await getResultByToken.handle(roomId, socket.id, token);

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

  trackUserRoom(
    socketId: string,
    userId: string,
    roomId: string,
    userName?: string
  ) {
    if (!this.socketUserMap.has(socketId)) {
      this.socketUserMap.set(socketId, { userId, userName, room: roomId });
    }
    const info = this.socketUserMap.get(socketId)!;
    info.userId = userId;
    if (userName) {
      info.userName = userName;
    }
    info.room = roomId;

    this.notifyUserStatusChange(roomId);
  }

  untrackUserRoom(socketId: string) {
    const info = this.socketUserMap.get(socketId);
    if (!info) {
      return;
    }
    this.socketUserMap.delete(socketId);
    this.notifyUserStatusChange(info.room);
  }

  getOnlineUsersInRoom(roomId: string) {
    const result: { id: string; name?: string }[] = [];

    for (const [, info] of this.socketUserMap) {
      if (info.room === roomId) {
        result.push({ id: info.userId, name: info.userName });
      }
    }
    return result;
  }

  private notifyUserStatusChange(roomId: string) {
    const online = this.getOnlineUsersInRoom(roomId);
    const onlineUsers = online.map((u) => ({ id: u.id, name: u.name || "" }));

    this.sendMessageToRoom(roomId, {
      type: "users_status",
      users: onlineUsers,
    });
  }

  private getSocketById(socketId: string | undefined): Socket | null {
    if (!socketId) return null;
    const socket = this.client.sockets.sockets.get(socketId);
    return socket || null;
  }
}
