import { Injectable, OnDestroy } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth/auth.service';

@Injectable({ providedIn: 'root' })
export class PresenceService implements OnDestroy {
  private client: Client;
  private heartbeatTimer?: any;
  private ackSub?: any;
  private readonly heartbeatIntervalMs = 25000; // 25s to stay under 60s TTL
  private readonly wsBaseUrl = (() => {
    try {
      const origin = new URL(environment.apiBaseUrl).origin;
      const wsOrigin = origin.replace(/^http/i, 'ws');
      return `${wsOrigin}/ws`;
    } catch {
      return 'ws://localhost:8081/ws';
    }
  })();
  private lastAck$ = new BehaviorSubject<Date | null>(null);

  constructor(private auth: AuthService) {
    this.client = new Client({
      brokerURL: this.wsBaseUrl,
      reconnectDelay: 5000,
      beforeConnect: (client) => {
        const token = this.auth.getToken();
        if (!token) return;
        client.connectHeaders = { ...(client.connectHeaders || {}), Authorization: `Bearer ${token}` };
        client.brokerURL = this.appendAuthToken(this.wsBaseUrl, token);
      },
      onConnect: () => {
        this.subscribeForAck();
        this.sendHeartbeat();
        this.startHeartbeatLoop();
      },
      onDisconnect: () => {
        this.clearAckSub();
        this.stopHeartbeatLoop();
      },
      onWebSocketClose: () => {
        this.clearAckSub();
        this.stopHeartbeatLoop();
      },
      onStompError: () => {
        this.clearAckSub();
        this.stopHeartbeatLoop();
      }
    });

    // Auto start/stop when auth state changes
    this.auth.isAuthenticated$.subscribe(isAuthed => {
      if (isAuthed) this.start();
      else this.stop();
    });

    // If already authenticated on load, start immediately
    if (this.auth.isAuthenticated()) {
      this.start();
    }
  }

  start(): void {
    if (this.client.active || !this.auth.isAuthenticated()) return;
    this.client.activate();
  }

  stop(): void {
    this.stopHeartbeatLoop();
    this.clearAckSub();
    try {
      this.client.deactivate();
    } catch {}
  }

  heartbeatAck$(): Observable<Date | null> {
    return this.lastAck$.asObservable();
  }

  private sendHeartbeat(): void {
    if (!this.isConnected()) return;
    try {
      this.client.publish({
        destination: '/app/presence/heartbeat',
        body: JSON.stringify({ ts: new Date().toISOString() }),
        headers: { 'content-type': 'application/json' }
      });
    } catch {
      // ignore publish errors
    }
  }

  private subscribeForAck(): void {
    if (this.ackSub) return;
    try {
      this.ackSub = this.client.subscribe('/user/queue/presence/heartbeat', (msg: IMessage) => {
        if (!msg) return;
        this.lastAck$.next(new Date());
      });
    } catch {
      // ignore subscribe errors
    }
  }

  private clearAckSub(): void {
    try { this.ackSub?.unsubscribe(); } catch {}
    this.ackSub = undefined;
  }

  private startHeartbeatLoop(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.heartbeatIntervalMs);
  }

  private stopHeartbeatLoop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private isConnected(): boolean {
    try {
      return (this.client as any).connected === true;
    } catch {
      return false;
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

  ngOnDestroy(): void {
    this.stop();
    try { this.lastAck$.complete(); } catch {}
  }
}
