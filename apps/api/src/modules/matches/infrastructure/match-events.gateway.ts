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

  @SubscribeMessage('leave-fixture')
  handleLeaveFixture(
    @MessageBody() fixtureId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(fixtureRoom(fixtureId));
  }

  broadcastEvent(fixtureId: string, event: unknown) {
    this.server?.to(fixtureRoom(fixtureId)).emit('match-event', event);
  }

  // No broadcastEventRemoved: match_events is append-only now, so there's no
  // longer a delete flow to broadcast. Both web and mobile clients still
  // have a harmless, never-firing `match-event-removed` listener in
  // use-live-match.ts — left in place rather than touched in this pass,
  // since it costs nothing to leave and corrections will likely want their
  // own broadcast event (e.g. `match-event-corrected`) once client UI exists
  // to show them, at which point that listener code gets reused, not
  // resurrected from scratch.

  broadcastState(fixtureId: string, state: unknown) {
    this.server?.to(fixtureRoom(fixtureId)).emit('match-state', state);
  }
}
