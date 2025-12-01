import { INotifierProvider } from "../providers/INotifierProvider";
import { RoomRepository } from "../repositories/RoomRepository";
import { AppError } from "../utils/AppError";
import { UpdateUserPresenceService } from "./updateUserPresence";

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

    if (!room) {
      throw new AppError("room_not_found");
    }

    if (room.secretList) {
      throw new AppError("room_already_draw");
    }

    const participantAlreadyExists = room.participants.find(
      (p) => p.id === clientId
    );

    const newParticipant = { id: clientId, name };

    if (!participantAlreadyExists) {
      room.participants.push(newParticipant);

      await this.roomRepository.updateRoom(roomId, room);

      // Notifica todos da sala
      this.notifier.sendMessageToRoom(roomId, {
        type: "participant_added",
        participant: newParticipant,
      });
    }

    this.notifier.joinParticipantRoom(socketId, roomId);

    // Track user in room for disconnect handling and in-memory presence
    this.notifier.trackUserRoom(socketId, clientId, roomId, name);

    // Envia os participantes atuais para o novo usuário
    this.notifier.send(socketId, {
      type: "joined",
      roomId,
      participants: room.participants,
    });

    // Notifica presença para toda a sala
    const presenceService = new UpdateUserPresenceService(this.notifier);
    await presenceService.notifyUserOnline(roomId, clientId);

    console.log(`👤 ${name} joined room ${roomId}`);
  }
}
