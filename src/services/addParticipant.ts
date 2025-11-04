import { RoomRepository } from "../repositories/RoomRepository";
import { AppError } from "../utils/AppError";

export class AddParticipantService {
  constructor(private roomRepository: RoomRepository) {}

  async handle(
    roomId: string,
    adminId: string,
    participantId: string,
    participantName: string
  ) {
    const room = await this.roomRepository.findRoom(roomId);

    if (!room) {
      throw new AppError("room_not_found");
    }

    if (room.adminId !== adminId) {
      throw new AppError("only_admin_can_add");
    }

    const participantAlreadyExists = room.participants.find(
      (p) => p.id === participantId
    );

    if (participantAlreadyExists) {
      throw new AppError("participant_already_exists");
    }

    room.participants.push({ id: participantId, name: participantName });

    await this.roomRepository.updateRoom(roomId, room);

    return room;
  }
}
