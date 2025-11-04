import { Redis } from "@upstash/redis";
import { IDatabaseProvider } from "./IDatabaseProvider";

export class RedisProvider implements IDatabaseProvider {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  async setData(key: string, value: string): Promise<void> {
    await this.client.set(key, JSON.stringify(value));
  }

  async getData(key: string): Promise<string | null> {
    return this.client.get<string>(key);
  }

  async checkIfExists(key: string): Promise<boolean> {
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  async deleteData(key: string): Promise<void> {
    await this.client.del(key);
  }
}
