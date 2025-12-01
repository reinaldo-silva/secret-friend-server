import { INotifierProvider } from "../providers/INotifierProvider";
import { UpdateUserPresenceService } from "./updateUserPresence";

export class HandleDisconnectService {
  constructor(private notifier: INotifierProvider) {}

  async handle(socketId: string, userId?: string, roomId?: string) {
    this.notifier.untrackUserRoom(socketId);

    if (userId && roomId) {
      const presenceService = new UpdateUserPresenceService(this.notifier);
      await presenceService.notifyUserOffline(roomId, userId);
    }
  }
}
