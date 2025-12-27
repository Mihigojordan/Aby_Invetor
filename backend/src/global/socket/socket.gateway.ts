import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export type SocketUserType = 'ADMIN' | 'PARTNER' | 'EMPLOYEE';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class GlobalSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // ──────────────────────────────────────────────
  // Socket maps
  // ──────────────────────────────────────────────
  employeeSockets = new Map<string, Set<string>>();
  adminSockets = new Map<string, Set<string>>();
  partnerSockets = new Map<string, Set<string>>();

  // ──────────────────────────────────────────────
  // On connect
  // ──────────────────────────────────────────────
  handleConnection(socket: Socket) {
    console.log(`🔵 Socket connected: ${socket.id}`);
  }

  // ──────────────────────────────────────────────
  // On disconnect
  // ──────────────────────────────────────────────
  handleDisconnect(socket: Socket) {
    console.log(`🔴 Socket disconnected: ${socket.id}`);
    this.removeSocketFromMaps(socket.id);
  }

  // ──────────────────────────────────────────────
  // Cleanup socket from all maps
  // ──────────────────────────────────────────────
  private removeSocketFromMaps(socketId: string) {
    const removeFromMap = (map: Map<string, Set<string>>) => {
      map.forEach((set, id) => {
        if (set.delete(socketId) && set.size === 0) {
          map.delete(id);
        }
      });
    };

    removeFromMap(this.employeeSockets);
    removeFromMap(this.adminSockets);
    removeFromMap(this.partnerSockets);
  }

  // ──────────────────────────────────────────────
  // CLIENT:
  // socket.emit("registerUser", { id, type })
  // type = ADMIN | PARTNER | EMPLOYEE
  // ──────────────────────────────────────────────
  @SubscribeMessage('registerUser')
  registerUser(
    @MessageBody()
    data: { id: string; type: SocketUserType },
    @ConnectedSocket() socket: Socket,
  ) {
    if (!data?.id || !data?.type) return;

    const register = (
      map: Map<string, Set<string>>,
      label: string,
    ) => {
      if (!map.has(data.id)) {
        map.set(data.id, new Set());
      }
      map.get(data.id)!.add(socket.id);
      console.log(`${label} ${data.id} registered → ${socket.id}`);
    };

    if (data.type === 'EMPLOYEE') register(this.employeeSockets, '👤 EMPLOYEE');
    if (data.type === 'ADMIN') register(this.adminSockets, '🛡️ ADMIN');
    if (data.type === 'PARTNER') register(this.partnerSockets, '🤝 PARTNER');

    return { success: true };
  }

  // ──────────────────────────────────────────────
  // Emit helpers
  // ──────────────────────────────────────────────
  emitToEmployee(employeeId: string, event: string, data: any) {
    this.emitFromMap(this.employeeSockets, employeeId, event, data);
  }

  emitToAdmin(adminId: string, event: string, data: any) {
    this.emitFromMap(this.adminSockets, adminId, event, data);
  }

  emitToPartner(partnerId: string, event: string, data: any) {
    this.emitFromMap(this.partnerSockets, partnerId, event, data);
  }

  private emitFromMap(
    map: Map<string, Set<string>>,
    id: string,
    event: string,
    data: any,
  ) {
    const sockets = map.get(id);
    if (!sockets) return;

    sockets.forEach((socketId) => {
      this.server.to(socketId).emit(event, data);
    });
  }

  // ──────────────────────────────────────────────
  // Emit to mixed recipients
  // ──────────────────────────────────────────────
  emitToRecipients(
    recipients: { id: string; type: SocketUserType }[],
    event: string,
    data: any,
  ) {
    recipients.forEach((r) => {
      switch (r.type) {
        case 'EMPLOYEE':
          this.emitToEmployee(r.id, event, data);
          break;
        case 'ADMIN':
          this.emitToAdmin(r.id, event, data);
          break;
        case 'PARTNER':
          this.emitToPartner(r.id, event, data);
          break;
      }
    });
  }
}
