import { RoomRepository } from "../repositories/RoomRepository";
import { AppError } from "../utils/AppError";

export class CreateRoomService {
  constructor(private roomRepository: RoomRepository) {}

  async handle(
    roomId: string,
    roomName: string,
    adminId: string,
    adminName: string,
    socketId: string
  ) {
    const roomAlreadyExists = await this.roomRepository.exists(roomId);
    if (roomAlreadyExists) {
      throw new AppError("room_already_exists");
    }

    const room = {
      id: roomId,
      name: roomName,
      adminId,
      participants: [{ id: adminId, name: adminName, isAdmin: true, socketId }],
    };

    return await this.roomRepository.newRoom(room.id, room);
  }
}
