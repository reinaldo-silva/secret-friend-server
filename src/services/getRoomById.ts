import { INotifierProvider } from "../providers/INotifierProvider";
import { RoomRepository } from "../repositories/RoomRepository";
import { AppError } from "../utils/AppError";

export class GetRoomById {
  constructor(
    private roomRepository: RoomRepository,
    private notifier: INotifierProvider
  ) {}

  async handle(roomId: string, socketId: string) {
    const roomFound = await this.roomRepository.findRoom(roomId);
    if (!roomFound) {
      throw new AppError("room_not_found");
    }

    this.notifier.send(socketId, {
      type: "room_found",
      room: roomFound,
    });

    this.notifier.joinParticipantRoom(socketId, roomId);
  }
}
