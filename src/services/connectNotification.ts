import { INotifierProvider } from "../providers/INotifierProvider";
import { RoomRepository } from "../repositories/RoomRepository";
import { UserRepository } from "../repositories/UserRepository";
import { User } from "../types";

export class ConnectNotification {
  constructor(
    private userRepository: UserRepository,
    private roomRepository: RoomRepository,
    private notifier: INotifierProvider
  ) {}

  async handler(user: User, socketId: string, roomId?: string) {
    const userFound = await this.userRepository.findById(user.id);
    const roomFound = await this.roomRepository.findRoom(roomId || "");

    if (!userFound) {
      Object.assign(user, { socketId });

      await this.userRepository.new(user);

      if (roomFound) {
        this.notifier.joinParticipantRoom(socketId, roomFound.id);

        // Track user in room for presence
        this.notifier.trackUserRoom(socketId, user.id, roomFound.id, user.name);
      }

      return;
    }

    Object.assign(userFound, { socketId });

    await this.userRepository.update(user.id, userFound);

    if (roomFound) {
      this.notifier.joinParticipantRoom(socketId, roomFound.id);

      // Track user in room for presence
      this.notifier.trackUserRoom(socketId, user.id, roomFound.id, user.name);
    }
  }
}
