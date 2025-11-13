import { UserRepository } from "../repositories/UserRepository";
import { User } from "../types";

export class ConnectNotification {
  constructor(private userRepository: UserRepository) {}

  async handler(user: User, socketId: string) {
    const userFound = await this.userRepository.findById(user.id);

    if (!userFound) {
      Object.assign(user, { socketId });

      await this.userRepository.new(user);

      return;
    }

    Object.assign(userFound, { socketId });

    await this.userRepository.update(user.id, userFound);
  }
}
