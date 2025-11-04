import "dotenv/config";
import http from "http";
import { RedisProvider } from "./providers/RedisProvider";
import { SocketIoProvider } from "./providers/SocketIoProvider";
import { RoomRepository } from "./repositories/RoomRepository";
import { AddParticipantService } from "./services/addParticipant";
import { BroadcastService } from "./services/broadcast";
import { CreateRoomService } from "./services/createRoom";
import { JoinRoomService } from "./services/joinRoom";
import { LeaveRoomService } from "./services/leaveRoom";
import { StarDrawService } from "./services/startDraw";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3333;

const dbProvider = new RedisProvider();
const roomRepository = new RoomRepository(dbProvider);

const createRoomService = new CreateRoomService(roomRepository);
const joinRoomService = new JoinRoomService(roomRepository);
const addParticipantService = new AddParticipantService(roomRepository);
const leaveRoomService = new LeaveRoomService(roomRepository);
const broadcastService = new BroadcastService(roomRepository);
const starDrawService = new StarDrawService(roomRepository);

const server = http.createServer();
new SocketIoProvider(
  server,
  createRoomService,
  joinRoomService,
  addParticipantService,
  leaveRoomService,
  broadcastService,
  starDrawService
);

server.listen(PORT, () => {
  console.log(`🚀 Socket.io server running on port ${PORT}`);
});

// function broadcastToRoom(room: Room, payload: OutgoingMessage) {
//   for (const [id] of room.participants) {
//     const socket = clientIdToSocket.get(id);
//     if (socket) send(socket, payload);
//   }
// }
