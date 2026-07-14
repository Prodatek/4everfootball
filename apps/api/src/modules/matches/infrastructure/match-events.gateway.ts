import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

function fixtureRoom(fixtureId: string): string {
  return `fixture:${fixtureId}`;
}

// Read-only broadcast channel: clients only ever receive `match-event` /
// `match-state`, they never send anything that mutates data (recording an
// event only ever happens over the authenticated REST endpoint). The one
// inbound message, `join-fixture`, just subscribes a socket to a room, so no
// socket-level auth guard is needed here. CORS is left open (`origin: true`)
// since there is nothing privileged to protect on this channel.
@WebSocketGateway({ namespace: '/live', cors: { origin: true } })
export class MatchEventsGateway {
  @WebSocketServer()
  private server!: Server;

  @SubscribeMessage('join-fixture')
  handleJoinFixture(
    @MessageBody() fixtureId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(fixtureRoom(fixtureId));
  }

  broadcastEvent(fixtureId: string, event: unknown) {
    this.server?.to(fixtureRoom(fixtureId)).emit('match-event', event);
  }

  broadcastEventRemoved(fixtureId: string, eventId: string) {
    this.server
      ?.to(fixtureRoom(fixtureId))
      .emit('match-event-removed', { eventId });
  }

  broadcastState(fixtureId: string, state: unknown) {
    this.server?.to(fixtureRoom(fixtureId)).emit('match-state', state);
  }
}
