import { INotifierProvider } from "../providers/INotifierProvider";
import { RoomRepository } from "../repositories/RoomRepository";
import { AppError } from "../utils/AppError";

export class GetRoomById {
  constructor(
    private roomRepository: RoomRepository,
    private notifier: INotifierProvider
  ) {}

  async handle(roomId: string, socketId: string, userId: string) {
    const roomFound = await this.roomRepository.findRoom(roomId);
    if (!roomFound) {
      throw new AppError("room_not_found");
    }

    const { adminId, id, participants, name, secretList } = roomFound;

    this.notifier.send(socketId, {
      type: "room_found",
      room: { adminId, id, participants, name },
    });

    // Envia o resultado individual e os resultados para o admin
    if (secretList) {
      this.notifier.send(socketId, {
        type: "your_match",
        token: secretList[userId],
      });

      if (userId === adminId) {
        this.notifier.send(socketId, {
          type: "draw_result_admin",
          mapping: secretList,
        });
      }
    }

    this.notifier.joinParticipantRoom(socketId, roomId);
  }
}
