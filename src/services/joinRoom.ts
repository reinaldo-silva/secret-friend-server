import { INotifierProvider } from "../providers/INotifierProvider";
import { RoomRepository } from "../repositories/RoomRepository";
import { AppError } from "../utils/AppError";

export class JoinRoomService {
  constructor(
    private roomRepository: RoomRepository,
    private notifier: INotifierProvider
  ) {}

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

    this.notifier.joinParticipantRoom(socketId, roomId);

    // Envia os participantes atuais para o novo usuário
    this.notifier.send(socketId, {
      type: "joined",
      roomId,
      participants: room.participants,
    });

    // Notifica todos da sala
    this.notifier.sendMessageToRoom(roomId, {
      type: "participant_added",
      participant: newParticipant,
    });

    console.log(`👤 ${name} joined room ${roomId}`);
  }
}
