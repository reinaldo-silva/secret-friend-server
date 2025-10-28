import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import { IncomingMessage, OutgoingMessage, Room, Participant } from "./types";
import { generateValidMapping } from "./helper";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3333;

const rooms: Map<string, Room> = new Map();

const wsToClientId: WeakMap<WebSocket, string> = new WeakMap();
const clientIdToWs: Map<string, WebSocket> = new Map();

const server = http.createServer();
const wss = new WebSocketServer({ server });

function send(ws: WebSocket, payload: OutgoingMessage) {
  try {
    ws.send(JSON.stringify(payload));
  } catch (err) {
    console.error("send error", err);
  }
}

function broadcastToRoom(room: Room, payload: OutgoingMessage) {
  for (const [id] of room.participants) {
    const ws = clientIdToWs.get(id);
    if (ws && ws.readyState === WebSocket.OPEN) send(ws, payload);
  }
}

function makeError(ws: WebSocket, message: string) {
  send(ws, { type: "error", message });
}

wss.on("connection", (ws) => {
  console.log("client connected");

  ws.on("message", (raw) => {
    let msg: IncomingMessage | null = null;
    console.log("received message:", String(raw));

    try {
      msg = JSON.parse(String(raw));
    } catch (err) {
      makeError(ws, "invalid_json");
      return;
    }

    if (!msg || typeof msg !== "object" || !("type" in msg)) {
      makeError(ws, "invalid_message");
      return;
    }

    switch (msg.type) {
      case "ping":
        send(ws, { type: "pong" });
        return;

      case "create_room": {
        const { roomId, roomName, adminId, adminName } = msg;
        if (rooms.has(roomId)) {
          makeError(ws, "room_already_exists");
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

        // register ws
        wsToClientId.set(ws, adminId);
        clientIdToWs.set(adminId, ws);

        send(ws, { type: "room_created", roomId });
        send(ws, {
          type: "joined",
          roomId,
          participants: Array.from(participants.values()),
        });
        console.log(`room ${roomId} created by ${adminName}`);
        return;
      }

      case "join_room": {
        const { roomId, clientId, name } = msg;
        const room = rooms.get(roomId);
        if (!room) {
          makeError(ws, "room_not_found");
          return;
        }
        if (room.participants.has(clientId)) {
          makeError(ws, "client_id_already_in_room");
          return;
        }
        const p: Participant = { id: clientId, name };
        room.participants.set(clientId, p);

        wsToClientId.set(ws, clientId);
        clientIdToWs.set(clientId, ws);

        // notify the joining client with current participants
        send(ws, {
          type: "joined",
          roomId,
          participants: Array.from(room.participants.values()),
        });

        // and notify all room participants that a new participant arrived
        broadcastToRoom(room, { type: "participant_added", participant: p });

        console.log(`${name} joined room ${roomId}`);
        return;
      }

      case "add_participant": {
        const { roomId, adminId, participantId, name } = msg;
        const room = rooms.get(roomId);
        if (!room) {
          makeError(ws, "room_not_found");
          return;
        }
        if (room.adminId !== adminId) {
          makeError(ws, "only_admin_can_add");
          return;
        }
        if (room.participants.has(participantId)) {
          makeError(ws, "participant_already_exists");
          return;
        }
        const p: Participant = { id: participantId, name };
        room.participants.set(participantId, p);

        // If the participant is not connected (no ws), it's okay: admin added manually.
        // Notify all connected clients in room about the new participant.
        broadcastToRoom(room, { type: "participant_added", participant: p });
        console.log(
          `admin ${adminId} added participant ${name} to room ${roomId}`
        );
        return;
      }

      case "start_draw": {
        const { roomId, adminId } = msg;
        const room = rooms.get(roomId);
        if (!room) {
          makeError(ws, "room_not_found");
          return;
        }
        if (room.adminId !== adminId) {
          makeError(ws, "only_admin_can_start_draw");
          return;
        }

        const participants = Array.from(room.participants.values());
        if (participants.length < 2) {
          makeError(ws, "need_at_least_two_participants");
          return;
        }

        // perform a random full permutation assignment ensuring no one gets themselves
        const mapping = generateValidMapping(participants);
        if (!mapping) {
          makeError(ws, "could_not_generate_mapping");
          return;
        }

        // Send each participant their match privately (if connected)
        for (const { from, to } of mapping) {
          const wsTarget = clientIdToWs.get(from.id);
          if (wsTarget && wsTarget.readyState === WebSocket.OPEN) {
            send(wsTarget, { type: "your_match", match: to });
          }
        }

        // Send full mapping to admin (so admin can save in localStorage)
        const adminWs = clientIdToWs.get(adminId);
        if (adminWs && adminWs.readyState === WebSocket.OPEN) {
          send(adminWs, { type: "draw_result_admin", mapping });
        }

        console.log(`draw executed on room ${roomId} by admin ${adminId}`);
        return;
      }

      case "leave_room": {
        const { roomId, clientId } = msg;
        const room = rooms.get(roomId);
        if (!room) {
          makeError(ws, "room_not_found");
          return;
        }
        room.participants.delete(clientId);
        clientIdToWs.delete(clientId);
        // remove from wsToClientId if matches
        const stored = wsToClientId.get(ws);
        if (stored === clientId) wsToClientId.delete(ws);

        broadcastToRoom(room, { type: "left", roomId, clientId });
        console.log(`client ${clientId} left room ${roomId}`);
        return;
      }

      case "broadcast": {
        const { roomId, adminId, message } = msg;
        const room = rooms.get(roomId);
        if (!room) {
          makeError(ws, "room_not_found");
          return;
        }
        const admin = room.participants.get(adminId);
        if (!admin) {
          makeError(ws, "admin_not_in_room");
          return;
        }
        broadcastToRoom(room, { type: "broadcast", from: admin, message });
        return;
      }

      default:
        makeError(ws, "unknown_message_type");
    }
  });

  ws.on("close", () => {
    const clientId = wsToClientId.get(ws);
    if (clientId) {
      // remove mapping from clientIdToWs but keep participant in room (so admin can still have them)
      clientIdToWs.delete(clientId);
      console.log(`ws closed for client ${clientId}`);
    }
  });
});

wss.on("close", () => {
  console.log("WebSocket server closed");
});

server.listen(PORT, () => {
  console.log(`WebSocket server started on port ${PORT}`);
});
