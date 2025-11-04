import { RoomRepository } from "../repositories/RoomRepository";
import { AppError } from "../utils/AppError";

export class BroadcastService {
  constructor(private roomRepository: RoomRepository) {}

  async handle(roomId: string, message: string, adminId: string) {
    const room = await this.roomRepository.findRoom(roomId);

    if (!room) {
      throw new AppError("room_not_found");
    }

    const admin = room.participants.find((p) => p.id === adminId);

    if (!admin) {
      throw new AppError("admin_not_in_room");
    }

    return { room, admin };
  }
}
