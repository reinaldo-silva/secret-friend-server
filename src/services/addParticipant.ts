import { INotifierProvider } from "../providers/INotifierProvider";
import { RoomRepository } from "../repositories/RoomRepository";
import { AppError } from "../utils/AppError";

export class AddParticipantService {
  constructor(
    private roomRepository: RoomRepository,
    private notifier: INotifierProvider
  ) {}

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

    const newParticipant = { id: participantId, name: participantName };
    room.participants.push(newParticipant);

    await this.roomRepository.updateRoom(roomId, room);

    this.notifier.sendMessageToRoom(roomId, {
      type: "participant_added",
      participant: newParticipant,
    });

    console.log(`➕ Admin ${adminId} added ${name} to room ${roomId}`);
  }
}
