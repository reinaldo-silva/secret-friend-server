import { INotifierProvider } from "../providers/INotifierProvider";
import { RoomRepository } from "../repositories/RoomRepository";
import { UserRepository } from "../repositories/UserRepository";
import { User } from "../types";
import { AppError } from "../utils/AppError";

export class StarDrawService {
  constructor(
    private roomRepository: RoomRepository,
    private userRepository: UserRepository,
    private notifier: INotifierProvider
  ) {}

  async handle(roomId: string, adminId: string) {
    const room = await this.roomRepository.findRoom(roomId);

    if (!room) {
      throw new AppError("room_not_found");
    }

    if (room.adminId !== adminId) {
      throw new AppError("only_admin_can_start_draw");
    }

    const participants = room.participants;
    if (participants.length < 2) {
      throw new AppError("need_at_least_two_participants");
    }

    const allParticipantsIds = participants.map((e) => e.id);

    const allParticipants = await this.userRepository.listAllById(
      allParticipantsIds
    );

    const mapping = this.generateValidMapping(allParticipants);

    if (!mapping) {
      throw new AppError("could_not_generate_mapping");
    }

    Object.assign(room, { secretList: mapping });

    await this.roomRepository.updateRoom(roomId, room);

    // Envia o resultado individual
    for (const user of allParticipants) {
      if (user.socketId) {
        this.notifier.send(user.socketId, {
          type: "your_match",
          match: mapping[user.id],
        });
      }
    }

    // Envia o mapeamento completo ao admin - REMOVER DEPOIS
    const adminSocketId = allParticipants.find(
      (user) => user.id === adminId
    )?.socketId;

    if (adminSocketId) {
      this.notifier.send(adminSocketId, { type: "draw_result_admin", mapping });
    }

    console.log(`🎲 Draw executed on room ${roomId} by ${adminId}`);
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private generateValidMapping(
    participants: User[]
  ): Record<string, User> | null {
    const n = participants.length;

    const MAX_ATTEMPTS = 2000;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const shuffled = this.shuffle(participants);
      let valid = true;
      for (let i = 0; i < n; i++) {
        if (participants[i].id === shuffled[i].id) {
          valid = false;
          break;
        }
      }
      if (valid) {
        const mapping: Record<string, User> = {};
        for (let i = 0; i < n; i++) {
          mapping[participants[i].id] = shuffled[i];
        }
        return mapping;
      }
    }
    return null;
  }
}
