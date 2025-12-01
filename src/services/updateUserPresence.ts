import { INotifierProvider } from "../providers/INotifierProvider";

export class UpdateUserPresenceService {
  constructor(private notifier: INotifierProvider) {}

  async notifyUserOnline(roomId: string, userId: string) {
    const online = this.notifier.getOnlineUsersInRoom(roomId);
    const onlineUsers = online.map((u) => ({ id: u.id, name: u.name || "" }));

    this.notifier.sendMessageToRoom(roomId, {
      type: "users_status",
      users: onlineUsers,
    });

    console.log(`🟢 User ${userId} is online in room ${roomId}`);
  }

  async notifyUserOffline(roomId: string, userId: string) {
    const online = this.notifier.getOnlineUsersInRoom(roomId);
    const onlineUsers = online.map((u) => ({ id: u.id, name: u.name || "" }));

    this.notifier.sendMessageToRoom(roomId, {
      type: "users_status",
      users: onlineUsers,
    });

    console.log(`🔴 User ${userId} is offline in room ${roomId}`);
  }
}
