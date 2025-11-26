import jwt from "jsonwebtoken";
import { INotifierProvider } from "../providers/INotifierProvider";
import { RoomRepository } from "../repositories/RoomRepository";
import { AppError } from "../utils/AppError";

export class GetResultByToken {
  constructor(
    private roomRepository: RoomRepository,
    private notifier: INotifierProvider
  ) {}

  async handle(roomId: string, socketId: string, token: string) {
    const roomFound = await this.roomRepository.findRoom(roomId);
    if (!roomFound) {
      throw new AppError("room_not_found");
    }

    const { participants, secretList } = roomFound;

    if (!secretList) {
      throw new AppError("no_draw_result");
    }

    let payload: {
      from: string;
      to: string;
    };

    try {
      payload = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key"
      ) as { from: string; to: string };
    } catch (err) {
      throw new AppError("invalid_token");
    }

    const { to, from } = payload;

    const toUser = participants.find((p) => p.id === to);
    const fromUser = participants.find((p) => p.id === from);

    if (!toUser || !fromUser) {
      throw new AppError("user_not_found");
    }

    this.notifier.send(socketId, {
      type: "result",
      toName: toUser.name,
      fromName: fromUser.name,
    });
  }
}
