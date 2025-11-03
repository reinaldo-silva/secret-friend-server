import http from "http";
import { Server, Socket } from "socket.io";
import { IncomingMessage, OutgoingMessage, Room, Participant } from "./types";
import { generateValidMapping } from "./helper";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3333;

const rooms: Map<string, Room> = new Map();
const clientIdToSocket: Map<string, Socket> = new Map();

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: "*" },
});

// Funções auxiliares
function send(socket: Socket, payload: OutgoingMessage) {
  try {
    socket.emit("message", payload);
  } catch (err) {
    console.error("send error", err);
  }
}

function broadcastToRoom(room: Room, payload: OutgoingMessage) {
  for (const [id] of room.participants) {
    const socket = clientIdToSocket.get(id);
    if (socket) send(socket, payload);
  }
}

function makeError(socket: Socket, message: string) {
  console.log(message);

  send(socket, { type: "error", message });
}

io.on("connection", (socket: Socket) => {
  console.log("✅ Client connected:", socket.id);

  socket.on("disconnect", () => {
    for (const [clientId, s] of clientIdToSocket.entries()) {
      if (s.id === socket.id) {
        clientIdToSocket.delete(clientId);
        console.log(`❌ Client ${clientId} disconnected`);
        break;
      }
    }
  });

  socket.on("message", (msg: IncomingMessage) => {
    console.log("📩 Received:", msg);

    if (!msg || typeof msg !== "object" || !("type" in msg)) {
      makeError(socket, "invalid_message");
      return;
    }

    switch (msg.type) {
      case "ping":
        send(socket, { type: "pong" });
        return;

      case "create_room": {
        const { roomId, roomName, adminId, adminName } = msg;
        if (rooms.has(roomId)) {
          makeError(socket, "room_already_exists");
          return;
        }

        const participants = new Map<string, Participant>();
        const admin: Participant = {
          id: adminId,
          name: adminName,
          isAdmin: true,
        };
        participants.set(adminId, admin);

        const room: Room = {
          id: roomId,
          name: roomName,
          adminId,
          participants,
        };
        rooms.set(roomId, room);

        clientIdToSocket.set(adminId, socket);
        socket.join(roomId);

        send(socket, { type: "room_created", roomId });
        send(socket, {
          type: "joined",
          roomId,
          participants: Array.from(participants.values()),
        });
        console.log(`🏠 Room ${roomId} created by ${adminName}`);
        return;
      }

      case "join_room": {
        const { roomId, clientId, name } = msg;
        const room = rooms.get(roomId);
        if (!room) return makeError(socket, "room_not_found");
        if (room.participants.has(clientId))
          return makeError(socket, "client_id_already_in_room");

        const participant: Participant = { id: clientId, name };
        room.participants.set(clientId, participant);

        clientIdToSocket.set(clientId, socket);
        socket.join(roomId);

        // Envia os participantes atuais para o novo usuário
        send(socket, {
          type: "joined",
          roomId,
          participants: Array.from(room.participants.values()),
        });

        // Notifica todos da sala
        io.to(roomId).emit("message", {
          type: "participant_added",
          participant,
        });
        console.log(`👤 ${name} joined room ${roomId}`);
        return;
      }

      case "add_participant": {
        const { roomId, adminId, participantId, name } = msg;
        const room = rooms.get(roomId);
        if (!room) return makeError(socket, "room_not_found");
        if (room.adminId !== adminId)
          return makeError(socket, "only_admin_can_add");
        if (room.participants.has(participantId))
          return makeError(socket, "participant_already_exists");

        const participant: Participant = { id: participantId, name };
        room.participants.set(participantId, participant);

        io.to(roomId).emit("message", {
          type: "participant_added",
          participant,
        });
        console.log(`➕ Admin ${adminId} added ${name} to room ${roomId}`);
        return;
      }

      case "start_draw": {
        const { roomId, adminId } = msg;
        const room = rooms.get(roomId);
        if (!room) return makeError(socket, "room_not_found");
        if (room.adminId !== adminId)
          return makeError(socket, "only_admin_can_start_draw");

        const participants = Array.from(room.participants.values());
        if (participants.length < 2)
          return makeError(socket, "need_at_least_two_participants");

        const mapping = generateValidMapping(participants);
        if (!mapping) return makeError(socket, "could_not_generate_mapping");

        // Envia o resultado individual
        for (const { from, to } of mapping) {
          const targetSocket = clientIdToSocket.get(from.id);
          if (targetSocket)
            send(targetSocket, { type: "your_match", match: to });
        }

        // Envia o mapeamento completo ao admin
        const adminSocket = clientIdToSocket.get(adminId);
        if (adminSocket)
          send(adminSocket, { type: "draw_result_admin", mapping });

        console.log(`🎲 Draw executed on room ${roomId} by ${adminId}`);
        return;
      }

      case "leave_room": {
        const { roomId, clientId } = msg;
        const room = rooms.get(roomId);
        if (!room) return makeError(socket, "room_not_found");

        room.participants.delete(clientId);
        clientIdToSocket.delete(clientId);
        socket.leave(roomId);

        io.to(roomId).emit("message", { type: "left", roomId, clientId });
        console.log(`👋 Client ${clientId} left room ${roomId}`);
        return;
      }

      case "broadcast": {
        const { roomId, adminId, message } = msg;
        const room = rooms.get(roomId);
        if (!room) return makeError(socket, "room_not_found");

        const admin = room.participants.get(adminId);
        if (!admin) return makeError(socket, "admin_not_in_room");

        io.to(roomId).emit("message", {
          type: "broadcast",
          from: admin,
          message,
        });
        console.log(`📢 Broadcast in ${roomId}: ${message}`);
        return;
      }

      default:
        makeError(socket, "unknown_message_type");
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Socket.io server running on port ${PORT}`);
});
