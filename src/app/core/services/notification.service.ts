import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import { NotificationItem } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private stompClient: Client;
  private readonly notifications$ = new BehaviorSubject<NotificationItem[]>([]);
  private readonly incoming$ = new Subject<NotificationItem>();
  private readonly apiUrl = 'http://localhost:8080/api/notifications';

  all$ = this.notifications$.asObservable();
  newNotifications$ = this.incoming$.asObservable();

  constructor(private toastr: ToastrService, private http: HttpClient) {
    // Initialize STOMP client once
    this.stompClient = new Client({
      // Native WebSocket endpoint (adjust if different)
      brokerURL: 'ws://localhost:8080/ws',
      reconnectDelay: 5000, // Auto-reconnect every 5s
      onConnect: () => {
        console.log('✅ Connected to WebSocket');
        this.stompClient.subscribe('/topic/notifications', (message: IMessage) => {
          const parsed = JSON.parse(message.body) as NotificationItem;
          const data: NotificationItem = { ...parsed, seen: !!parsed.seen };
          this.notifications$.next([data, ...this.notifications$.value]);
          this.incoming$.next(data);
          this.showToast(data);
        });
      },
      onStompError: (frame) => {
        console.error('❌ STOMP error:', frame.headers['message'], frame.body);
      },
    });
  }

  connect(): void {
    this.stompClient.activate();
  }

  disconnect(): void {
    this.stompClient.deactivate();
    console.log('🔌 Disconnected from WebSocket');
  }

  getAll(): Observable<NotificationItem[]> {
    return this.all$;
  }

  // Load notifications for the current user using /me and seed store
  fetchAll(): void {
    this.http.get<NotificationItem[]>(`${this.apiUrl}/me`).subscribe({
      next: (list) => {
        const normalized = (list || []).map(n => ({ ...n, seen: !!n.seen })) as NotificationItem[];
        const sorted = normalized.sort((a, b) => {
          const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
          const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
          return tb - ta;
        });
        this.notifications$.next(sorted);
      },
      error: (err) => console.error('Failed to load notifications', err)
    });
  }

  unreadCount(): Observable<number> {
    return new Observable<number>(subscriber => {
      const sub = this.notifications$.subscribe(list => {
        subscriber.next(list.filter(n => !n.seen).length);
      });
      return () => sub.unsubscribe();
    });
  }

  markAsRead(id: string): void {
    const prev = this.notifications$.value;
    const updated = prev.map(n => n.id === id ? { ...n, seen: true } : n);
    this.notifications$.next(updated);
    // Backend expects POST /api/notifications/{id}/seen with no body
    this.http.post(`${this.apiUrl}/${encodeURIComponent(id)}/seen`, {})
      .subscribe({
        error: (err) => {
          console.error('Failed to mark as read', err);
          this.notifications$.next(prev);
        }
      });
  }

  markAllAsRead(): void {
    const prev = this.notifications$.value;
    const anyUnseen = prev.some(n => !n.seen);
    if (!anyUnseen) return;

    // Optimistic update: set all to seen locally
    const updated = prev.map(n => ({ ...n, seen: true }));
    this.notifications$.next(updated);

    // Persist to backend via bulk endpoint
    this.http.post(`${this.apiUrl}/mark-all-seen`, {})
      .subscribe({
        error: (err) => {
          console.error('Failed to mark all as read', err);
          this.notifications$.next(prev);
        }
      });
  }

  // Delete all notifications for current user
  deleteAll(): void {
    const prev = this.notifications$.value;
    // Optimistic clear
    this.notifications$.next([]);
    this.http.delete(`${this.apiUrl}`).subscribe({
      error: (err) => {
        console.error('Failed to delete all notifications', err);
        // Revert on failure
        this.notifications$.next(prev);
      }
    });
  }

  private showToast(notification: NotificationItem): void {
    const title = notification.type ? `${notification.type}` : 'Notification';
    const message = notification.content;
    this.toastr.info(message, title);
  }
}


