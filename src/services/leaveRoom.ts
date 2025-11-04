import { RoomRepository } from "../repositories/RoomRepository";
import { AppError } from "../utils/AppError";

export class LeaveRoomService {
  constructor(private roomRepository: RoomRepository) {}

  async handle(roomId: string, participantId: string) {
    const room = await this.roomRepository.findRoom(roomId);

    if (!room) {
      throw new AppError("room_not_found");
    }

    room.participants.filter((p) => p.id !== participantId);

    await this.roomRepository.updateRoom(roomId, room);

    return room;
  }
}
