import { RoomRepository } from "../repositories/RoomRepository";
import { Participant } from "../types";
import { AppError } from "../utils/AppError";

export class StarDrawService {
  constructor(private roomRepository: RoomRepository) {}

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

    return mapping;
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
