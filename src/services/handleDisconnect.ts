import { INotifierProvider } from "../providers/INotifierProvider";

export class HandleDisconnectService {
  constructor(private notifier: INotifierProvider) {}

  async handle(socketId: string, userId?: string, roomId?: string) {
    this.notifier.untrackUserRoom(socketId);
  }
}
