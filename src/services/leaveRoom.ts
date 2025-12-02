import { INotifierProvider } from "../providers/INotifierProvider";
import { RoomRepository } from "../repositories/RoomRepository";
import { AppError } from "../utils/AppError";

export class LeaveRoomService {
  constructor(
    private roomRepository: RoomRepository,
    private notifier: INotifierProvider
  ) {}

  async handle(roomId: string, participantId: string) {
    const room = await this.roomRepository.findRoom(roomId);

    if (!room) {
      throw new AppError("room_not_found");
    }

    const roomUpdated = room.participants.filter((p) => p.id !== participantId);

    await this.roomRepository.updateRoom(roomId, {
      ...room,
      participants: roomUpdated,
    });

    const user = room.participants.find((p) => p.id === participantId);

    if (!user) {
      throw new AppError("participant_not_found");
    }

    this.notifier.leaveParticipantRoom(user.socketId || "", roomId);

    this.notifier.sendMessageToRoom(roomId, {
      type: "left",
      clientName: user.name,
      clientId: participantId,
    });

    this.notifier.untrackUserRoom(user.socketId || "");

    console.log(`👋 Client ${participantId} left room ${roomId}`);
  }
}
