import { Injectable, OnDestroy } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth/auth.service';
import { Subject, Observable } from 'rxjs';
import { TicketEventPayload, TicketMessage, TicketStatus } from '../models/ticket.model';

@Injectable({
  providedIn: 'root'
})
export class TicketSocketService implements OnDestroy {
  private client: Client;
  private readonly events$ = new Subject<TicketEventPayload>();
  private readonly subscriptions = new Map<string, { pub?: any; user?: any }>();
  private readonly wsBaseUrl = (() => {
    try {
      const origin = new URL(environment.apiBaseUrl).origin;
      const wsOrigin = origin.replace(/^http/i, 'ws');
      return `${wsOrigin}/ws`;
    } catch {
      return 'ws://localhost:8080/ws';
    }
  })();

  constructor(private auth: AuthService) {
    this.client = new Client({
      brokerURL: this.wsBaseUrl,
      reconnectDelay: 5000,
      beforeConnect: (client) => {
        const token = this.auth.getToken();
        if (token) {
          client.connectHeaders = { ...(client.connectHeaders || {}), Authorization: `Bearer ${token}` };
          client.brokerURL = this.appendAuthToken(this.wsBaseUrl, token);
        }
      },
      onConnect: () => {
        // Re-subscribe to all active tickets after reconnect
        const active = Array.from(this.subscriptions.keys());
        this.subscriptions.clear();
        active.forEach(id => this.subscribeToTicket(id));
      }
    });
  }

  get ticketEvents$(): Observable<TicketEventPayload> {
    return this.events$.asObservable();
  }

  connect(): void {
    if (!this.client.active) {
      this.client.activate();
    }
  }

  disconnect(): void {
    this.client.deactivate();
    this.subscriptions.forEach(subs => {
      subs.pub?.unsubscribe?.();
      subs.user?.unsubscribe?.();
    });
    this.subscriptions.clear();
  }

  subscribeToTicket(ticketId: string): void {
    if (!ticketId) return;
    this.connect();
    if (this.subscriptions.has(ticketId)) return;
    const pubDest = `/topic/tickets/${ticketId}`;
    const userDest = `/user/queue/tickets/${ticketId}`;
    try {
      const pubSub = this.client.subscribe(pubDest, (msg: IMessage) => this.handleEvent(msg, ticketId));
      const userSub = this.client.subscribe(userDest, (msg: IMessage) => this.handleEvent(msg, ticketId));
      this.subscriptions.set(ticketId, { pub: pubSub, user: userSub });
    } catch {
      // ignore subscription errors
    }
  }

  leaveTicket(ticketId: string): void {
    const subs = this.subscriptions.get(ticketId);
    if (subs) {
      try { subs.pub?.unsubscribe?.(); } catch {}
      try { subs.user?.unsubscribe?.(); } catch {}
      this.subscriptions.delete(ticketId);
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private handleEvent(msg: IMessage, ticketId: string): void {
    try {
      const payload = JSON.parse(msg.body) as any;
      const type = (payload?.type || payload?.eventType || '').toString().toUpperCase();
      const event: TicketEventPayload = {
        ticketId,
        type: this.normalizeType(type),
        status: payload?.status as TicketStatus | undefined,
        assignedTo: payload?.assignedTo || payload?.adminInfo || undefined,
        message: payload?.message as TicketMessage || payload as TicketMessage
      };
      // Only emit if type recognized
      this.events$.next(event);
    } catch {
      // ignore malformed events
    }
  }

  private normalizeType(raw: string): TicketEventPayload['type'] {
    switch (raw) {
      case 'MESSAGE': return 'MESSAGE';
      case 'ASSIGNED': return 'ASSIGNED';
      case 'STATUS':
      case 'STATUS_CHANGED': return 'STATUS';
      case 'CLOSED': return 'CLOSED';
      case 'OPENED': return 'OPENED';
      default: return 'MESSAGE';
    }
  }

  private appendAuthToken(baseUrl: string, token: string): string {
    try {
      const url = new URL(baseUrl);
      url.searchParams.set('token', token);
      url.searchParams.set('access_token', token);
      return url.toString();
    } catch {
      const sep = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${sep}token=${encodeURIComponent(token)}`;
    }
  }
}
