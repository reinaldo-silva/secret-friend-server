import { INotifierProvider } from "../providers/INotifierProvider";
import { RoomRepository } from "../repositories/RoomRepository";
import { AppError } from "../utils/AppError";

export class CreateRoomService {
  constructor(
    private roomRepository: RoomRepository,
    private notifier: INotifierProvider
  ) {}

  async handle(
    roomId: string,
    roomName: string,
    adminId: string,
    adminName: string,
    socketId: string
  ) {
    const roomAlreadyExists = await this.roomRepository.exists(roomId);
    if (roomAlreadyExists) {
      throw new AppError("room_already_exists");
    }

    const room = {
      id: roomId,
      name: roomName,
      adminId,
      participants: [{ id: adminId, name: adminName, isAdmin: true, socketId }],
    };

    const newRoom = await this.roomRepository.newRoom(room.id, room);

    this.notifier.joinParticipantRoom(socketId, roomId);

    this.notifier.send(socketId, { type: "room_created", roomId });

    this.notifier.send(socketId, {
      type: "joined",
      roomId,
      participants: newRoom.participants,
    });

    console.log(`🏠 Room ${roomId} created by ${adminName}`);
  }
}
