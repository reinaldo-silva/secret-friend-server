export interface IDatabaseProvider {
  setData(key: string, value: string): Promise<void>;
  getData(key: string): Promise<string | null>;
  checkIfExists(key: string): Promise<boolean>;
  deleteData(key: string): Promise<void>;
}
