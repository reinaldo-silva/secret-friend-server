import "dotenv/config";
import http from "http";
import { RedisProvider } from "./providers/RedisProvider";
import { SocketIoProvider } from "./providers/SocketIoProvider";
import { RoomRepository } from "./repositories/RoomRepository";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3333;

const dbProvider = new RedisProvider();
const roomRepository = new RoomRepository(dbProvider);

const server = http.createServer();
new SocketIoProvider(server, roomRepository);

server.listen(PORT, () => {
  console.log(`🚀 Socket.io server running on port ${PORT}`);
});
