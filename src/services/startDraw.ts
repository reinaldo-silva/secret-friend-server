import { INotifierProvider } from "../providers/INotifierProvider";
import { RoomRepository } from "../repositories/RoomRepository";
import { Participant } from "../types";
import { AppError } from "../utils/AppError";

export class StarDrawService {
  constructor(
    private roomRepository: RoomRepository,
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

    const mapping = this.generateValidMapping(participants);

    if (!mapping) {
      throw new AppError("could_not_generate_mapping");
    }

    // Envia o resultado individual
    for (const { from, to } of mapping) {
      if (from.socketId) {
        this.notifier.send(from.socketId, { type: "your_match", match: to });
      }
    }

    // Envia o mapeamento completo ao admin - REMOVER DEPOIS
    const adminSocketId = mapping.find(({ from }) => from.id === adminId)?.from
      .socketId;

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
    participants: Participant[]
  ): { from: Participant; to: Participant }[] | null {
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
        const mapping: { from: Participant; to: Participant }[] = [];
        for (let i = 0; i < n; i++)
          mapping.push({ from: participants[i], to: shuffled[i] });
        return mapping;
      }
    }
    return null;
  }
}
