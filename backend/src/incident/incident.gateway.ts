import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { IncidentTimelineEntry } from '../entities/incident-timeline-entry.entity';
import { IncidentRunbookStep } from '../entities/incident-runbook-step.entity';
import { IncidentRole } from '../entities/incident-role.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'incidents',
})
export class IncidentGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(IncidentGateway.name);

  afterInit() {
    this.logger.log('Incident WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:incident')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() incidentId: string) {
    client.join(`incident:${incidentId}`);
    this.logger.debug(`Client ${client.id} joined incident room: ${incidentId}`);
  }

  @SubscribeMessage('leave:incident')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() incidentId: string) {
    client.leave(`incident:${incidentId}`);
  }

  emitTimelineEntry(incidentId: string, entry: IncidentTimelineEntry) {
    this.server.to(`incident:${incidentId}`).emit('timeline:new', entry);
  }

  emitRunbookStep(incidentId: string, step: IncidentRunbookStep) {
    this.server.to(`incident:${incidentId}`).emit('runbook:updated', step);
  }

  emitRoleAssigned(incidentId: string, role: IncidentRole) {
    this.server.to(`incident:${incidentId}`).emit('role:assigned', role);
  }

  emitStatusChange(incidentId: string, status: string, severity: string) {
    this.server.to(`incident:${incidentId}`).emit('status:changed', { status, severity });
  }

  emitPostMortemReady(incidentId: string) {
    this.server.to(`incident:${incidentId}`).emit('postmortem:ready');
  }
}
