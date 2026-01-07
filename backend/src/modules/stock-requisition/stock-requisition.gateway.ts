import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class StockRequisitionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log('Stock Requisition WS Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Stock Requisition WS Client disconnected:', client.id);
  }

  // ───────────────────────────────────
  // EMIT EVENTS
  // ───────────────────────────────────

  notifyCreated(data: any) {
    this.server.emit('stockRequisitionCreated', data);
  }

  notifyUpdated(data: any) {
    this.server.emit('stockRequisitionUpdated', data);
  }

  notifyApproved(data: any) {
    this.server.emit('stockRequisitionApproved', data);
  }

  notifyReceived(data: any) {
    this.server.emit('stockRequisitionReceived', data);
  }

  notifyRejected(data: any) {
    this.server.emit('stockRequisitionRejected', data);
  }

  notifyDeleted(id: string) {
    this.server.emit('stockRequisitionDeleted', { id });
  }
}