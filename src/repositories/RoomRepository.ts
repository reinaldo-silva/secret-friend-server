import { IDatabaseProvider } from "../providers/IDatabaseProvider";
import { Room } from "../types";

export class RoomRepository {
  constructor(private databaseProvider: IDatabaseProvider) {}

  async newRoom(roomId: string, data: Room) {
    const exists = await this.databaseProvider.checkIfExists(`room:${roomId}`);
    if (exists) throw new Error("Room already exists");

    await this.databaseProvider.setData(`room:${roomId}`, JSON.stringify(data));

    return data;
  }

  async findRoom(roomId: string): Promise<Room | null> {
    const data = await this.databaseProvider.getData(`room:${roomId}`);
    return data ? JSON.parse(data) : null;
  }

  async exists(roomId: string) {
    return this.databaseProvider.checkIfExists(`room:${roomId}`);
  }

  async updateRoom(roomId: string, update: Room) {
    const current = await this.databaseProvider.getData(roomId);
    if (!current) throw new Error("Room not found");

    await this.databaseProvider.setData(
      `room:${roomId}`,
      JSON.stringify({ ...JSON.parse(current), ...update })
    );
  }

  async deleteRoom(roomId: string) {
    await this.databaseProvider.deleteData(`room:${roomId}`);
  }
}
