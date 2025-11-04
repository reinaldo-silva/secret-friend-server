import { RoomRepository } from "../repositories/RoomRepository";
import { AppError } from "../utils/AppError";

export class JoinRoomService {
  constructor(private roomRepository: RoomRepository) {}

  async handle(
    roomId: string,
    clientId: string,
    name: string,
    socketId: string
  ) {
    const room = await this.roomRepository.findRoom(roomId);
    if (!room) throw new AppError("room_not_found");

    const participantAlreadyExists = room.participants.find(
      (p) => p.id === clientId
    );

    if (participantAlreadyExists) {
      throw new AppError("client_id_already_in_room");
    }

    const newParticipant = { id: clientId, name, socketId };

    room.participants.push(newParticipant);

    return { room, participant: newParticipant };
  }
}
