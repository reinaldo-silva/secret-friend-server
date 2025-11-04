import http from "http";
import { Server, Socket } from "socket.io";
import { AddParticipantService } from "../services/addParticipant";
import { BroadcastService } from "../services/broadcast";
import { CreateRoomService } from "../services/createRoom";
import { JoinRoomService } from "../services/joinRoom";
import { LeaveRoomService } from "../services/leaveRoom";
import { StarDrawService } from "../services/startDraw";
import { IncomingMessage, OutgoingMessage } from "../types";
import { AppError } from "../utils/AppError";

export class SocketIoProvider {
  client: Server;

  constructor(
    server: http.Server,
    createRoomService: CreateRoomService,
    joinRoomService: JoinRoomService,
    addParticipantService: AddParticipantService,
    leaveRoomService: LeaveRoomService,
    broadcastService: BroadcastService,
    starDrawService: StarDrawService
  ) {
    const io = new Server(server, {
      cors: { origin: "*" },
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

          if (msg.type === "ping") {
            this.send(socket, { type: "pong" });
            return;
          }

          if (msg.type === "create_room") {
            const { roomId, roomName, adminId, adminName } = msg;

            const newRoom = await createRoomService.handle(
              roomId,
              roomName || "Room_Name_Default",
              adminId,
              adminName,
              socket.id
            );

            socket.join(roomId);

            this.send(socket, { type: "room_created", roomId });
            this.send(socket, {
              type: "joined",
              roomId,
              participants: newRoom.participants,
            });
            console.log(`🏠 Room ${roomId} created by ${adminName}`);

            return;
          }

          if (msg.type === "join_room") {
            const { roomId, clientId, name } = msg;

            const { room, participant } = await joinRoomService.handle(
              roomId,
              clientId,
              name,
              socket.id
            );

            socket.join(roomId);

            // Envia os participantes atuais para o novo usuário
            this.send(socket, {
              type: "joined",
              roomId,
              participants: room.participants,
            });

            // Notifica todos da sala
            this.sendMessageToRoom(roomId, {
              type: "participant_added",
              participant,
            });
            console.log(`👤 ${name} joined room ${roomId}`);

            return;
          }

          if (msg.type === "add_participant") {
            const { roomId, adminId, participantId, name } = msg;

            const { participant } = await addParticipantService.handle(
              roomId,
              adminId,
              participantId,
              name
            );

            this.sendMessageToRoom(roomId, {
              type: "participant_added",
              participant,
            });
            console.log(`➕ Admin ${adminId} added ${name} to room ${roomId}`);
            return;
          }

          if (msg.type === "leave_room") {
            const { roomId, clientId } = msg;

            await leaveRoomService.handle(roomId, clientId);

            socket.leave(roomId);

            this.sendMessageToRoom(roomId, {
              type: "left",
              roomId,
              clientId,
            });
            console.log(`👋 Client ${clientId} left room ${roomId}`);
            return;
          }

          if (msg.type === "broadcast") {
            const { roomId, adminId, message } = msg;

            const { admin } = await broadcastService.handle(
              roomId,
              message,
              adminId
            );

            this.sendMessageToRoom(roomId, {
              type: "broadcast",
              from: admin,
              message,
            });
            console.log(`📢 Broadcast in ${roomId}: ${message}`);
            return;
          }

          if (msg.type === "start_draw") {
            const { roomId, adminId } = msg;

            const mapping = await starDrawService.handle(roomId, adminId);

            // Envia o resultado individual
            for (const { from, to } of mapping) {
              const targetSocket = this.getSocketById(from.socketId);
              if (targetSocket) {
                this.send(targetSocket, { type: "your_match", match: to });
              }
            }

            // Envia o mapeamento completo ao admin
            const adminSocket = this.getSocketById(
              mapping.find(({ from }) => from.id === adminId)?.from.socketId
            );
            if (adminSocket) {
              this.send(adminSocket, { type: "draw_result_admin", mapping });
            }

            console.log(`🎲 Draw executed on room ${roomId} by ${adminId}`);
            return;
          }

          throw new AppError("unknown_message_type");
        } catch (err) {
          if (err instanceof AppError) {
            return this.makeError(socket, err.message);
          }

          console.error("Error handling message:", err);
          this.makeError(socket, "internal_server_error");
        }
      });
    });

    this.client = io;
  }

  makeError(socket: Socket, message: string) {
    console.log("❗ Error:", message);
    this.send(socket, { type: "error", message });
  }

  send(socket: Socket, payload: OutgoingMessage) {
    try {
      socket.emit("message", payload);
    } catch (err) {
      console.error("send error", err);
    }
  }

  sendMessageToRoom(roomId: string, payload: OutgoingMessage) {
    this.client.to(roomId).emit("message", payload);
  }

  getSocketById(socketId: string | undefined): Socket | null {
    if (!socketId) return null;
    const socket = this.client.sockets.sockets.get(socketId);
    return socket || null;
  }
}
