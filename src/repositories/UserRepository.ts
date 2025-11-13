import { IDatabaseProvider } from "../providers/IDatabaseProvider";
import { User } from "../types";

export class UserRepository {
  constructor(private databaseProvider: IDatabaseProvider) {}

  async new(user: User): Promise<void> {
    const exists = await this.databaseProvider.checkIfExists(`user:${user.id}`);
    if (exists) throw new Error("User already exists");

    await this.databaseProvider.setData(
      `user:${user.id}`,
      JSON.stringify(user)
    );
  }

  async findById(id: string): Promise<User | null> {
    const data = await this.databaseProvider.getData(`user:${id}`);
    return data ? JSON.parse(data) : null;
  }

  async exists(id: string) {
    return this.databaseProvider.checkIfExists(`user:${id}`);
  }

  async update(userId: string, user: User): Promise<void> {
    const current = await this.databaseProvider.getData(`user:${userId}`);
    if (!current) throw new Error("User not found");

    await this.databaseProvider.setData(
      `user:${userId}`,
      JSON.stringify({ ...JSON.parse(current), ...user })
    );
  }

  async delete(id: string) {
    await this.databaseProvider.deleteData(`user:${id}`);
  }

  async listAllById(ids: string[]) {
    const allUsers: User[] = [];
    for (const userId of ids) {
      const data = await this.databaseProvider.getData(`user:${userId}`);

      if (data) {
        allUsers.push(JSON.parse(data));
      }
    }

    return allUsers;
  }
}
