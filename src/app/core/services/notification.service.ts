import { Injectable, OnDestroy } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, Subscription, tap } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import { NotificationItem } from '../models/notification.model';
import { NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from '../models/notification-preferences.model';
import { AuthService } from './auth/auth.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private stompClient!: Client;
  private readonly notifications$ = new BehaviorSubject<NotificationItem[]>([]);
  private readonly incoming$ = new Subject<NotificationItem>();
  private readonly preferences$ = new BehaviorSubject<NotificationPreferences | null>(null);
  private readonly apiUrl = `${environment.apiBaseUrl}/notifications`;
  private readonly preferencesUrl = `${this.apiUrl}/preferences`;
  private readonly wsBaseUrl = (() => {
    try {
      const origin = new URL(environment.apiBaseUrl).origin; // http(s)://host:port
      const wsOrigin = origin.replace(/^http/i, 'ws');
      return `${wsOrigin}/ws`;
    } catch {
      // Fallback: assume same host
      return 'ws://localhost:8081/ws';
    }
  })();
  private userId?: string;
  private authSub?: Subscription;
  private globalTopicSub?: any; // STOMP subscription reference
  private userQueueSub?: any;   // STOMP subscription to /user/queue/notifications
  private ticketQueueSub?: any; // STOMP subscription to /user/queue/ticket-notifications
  private legacyUserTopicSub?: any; // STOMP subscription to /topic/notifications.{userId}
  // Local persistence (per-user) to mitigate backend mismatches
  private readonly LS_SEEN_KEY_PREFIX = 'notif_seen_ids_';
  private readonly LS_DELETED_KEY_PREFIX = 'notif_deleted_ids_';
  private syncTimer?: any; // periodic REST sync fallback
  private preferencesLoaded = false;
  private preferenceSnapshot: NotificationPreferences | null = null;

  all$ = this.notifications$.asObservable();
  newNotifications$ = this.incoming$.asObservable();

  constructor(
    private toastr: ToastrService,
    private http: HttpClient,
    private authService: AuthService,
  ) {
    // Initialize STOMP client once
    this.stompClient = new Client({
      // WebSocket endpoint (adjust if using SockJS)
      brokerURL: this.wsBaseUrl,
      reconnectDelay: 5000, // Auto-reconnect every 5s
      // Ensure WS session is authenticated for Spring user destinations
      beforeConnect: (client) => {
        try {
          const token = this.authService.getToken();
          if (token) {
            client.connectHeaders = { ...(client.connectHeaders || {}), Authorization: `Bearer ${token}` };
            // Also append token as query param for servers that inspect handshake params
            client.brokerURL = this.appendAuthToken(this.wsBaseUrl, token);
          }
        } catch {}
      },
      onConnect: () => {
        
        // Global announcements
        this.globalTopicSub = this.stompClient.subscribe('/topic/notifications', (message: IMessage) => {
          this.handleIncoming(message, 'global');
        });
        // User-specific notifications
        this.subscribeForCurrentUser(true);
        // Start periodic sync as a fallback to ensure no missed notifications
        this.startSyncFallback();
      },
      onStompError: (frame) => {
        
      },
    });

    // Track current user to (re)subscribe to user-specific topic
    this.authSub = this.authService.currentUser.subscribe(user => {
      const newUserId = user?.user?.id || undefined;
      if (newUserId !== this.userId) {
        this.userId = newUserId;
        this.preferencesLoaded = false;
        if (newUserId) {
          this.ensurePreferencesLoaded();
        } else {
          this.setPreferences(null);
        }
        if (this.isConnected()) {
          this.subscribeForCurrentUser(true);
        }
      }
    });

    // Ensure we have a concrete user id on startup (e.g., after page refresh)
    const initialId = this.authService.currentUserValue?.user?.id;
    if (initialId) {
      this.userId = initialId;
      this.ensurePreferencesLoaded();
    } else if (this.authService.isAuthenticated()) {
      // Only attempt fetch if authenticated; otherwise remain on global channel
      this.authService.getCurrentUserFromBackend().subscribe({
        next: (user) => {
          this.userId = user?.id || undefined;
          this.ensurePreferencesLoaded();
          if (this.isConnected()) {
            this.subscribeForCurrentUser(true);
          }
        },
        error: () => {
          // No-op: remain subscribed only to global notifications
        }
      });
    }
  }

  connect(): void {
    this.ensurePreferencesLoaded();
    if (this.preferenceSnapshot && this.preferenceSnapshot.inAppEnabled === false) {
      return;
    }
    this.stompClient.activate();
  }

  disconnect(): void {
    this.stompClient.deactivate();
    this.unsubscribeAll();
    
  }

  getAll(): Observable<NotificationItem[]> {
    return this.all$;
  }

  // Load notifications for the current user using /me and seed store
  fetchAll(): void {
    this.http.get<NotificationItem[]>(`${this.apiUrl}/me`).subscribe({
      next: (list) => {
        const normalized = (list || []).map(n => ({ ...n, seen: !!n.seen })) as NotificationItem[];
        const userKey = this.userId || this.authService.currentUserValue?.user?.id || '';
        const seenSet = userKey ? this.loadIdSet(this.LS_SEEN_KEY_PREFIX + userKey) : new Set<string>();
        const deletedSet = userKey ? this.loadIdSet(this.LS_DELETED_KEY_PREFIX + userKey) : new Set<string>();
        const existingSeen = new Set<string>(this.notifications$.value.filter(n => n.seen).map(n => n.id));
        // Filter out locally-deleted notifications and apply local seen overrides (including prior in-memory seen)
        const filtered = normalized
          .filter(n => !deletedSet.has(n.id))
          .map(n => ({ ...n, seen: n.seen || seenSet.has(n.id) || existingSeen.has(n.id) } as NotificationItem));
        const sorted = filtered.sort((a, b) => {
          const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
          const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
          return tb - ta;
        });
        this.notifications$.next(sorted);
      },
      error: () => {}
    });
  }

  getPreferencesSnapshot(): NotificationPreferences | null {
    return this.preferenceSnapshot;
  }

  getPreferences(): Observable<NotificationPreferences | null> {
    return this.preferences$.asObservable();
  }

  fetchPreferences(): Observable<NotificationPreferences> {
    return this.http.get<NotificationPreferences>(`${this.preferencesUrl}/me`).pipe(
      tap(pref => this.setPreferences(this.normalizePreferences(pref)))
    );
  }

  updatePreferences(payload: Partial<NotificationPreferences>): Observable<NotificationPreferences> {
    return this.http.put<NotificationPreferences>(`${this.preferencesUrl}/me`, payload).pipe(
      tap(pref => this.setPreferences(this.normalizePreferences(pref)))
    );
  }

  ensurePreferencesLoaded(): void {
    if (this.preferencesLoaded || !this.authService.isAuthenticated()) return;
    this.fetchPreferences().subscribe({
      error: () => {
        this.preferencesLoaded = false;
      }
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
    this.addToSeenCache(id);
    // Backend expects POST /api/notifications/{id}/seen with no body
    this.http.post(`${this.apiUrl}/${encodeURIComponent(id)}/seen`, {})
      .subscribe({
        error: (err) => {
          
          // Keep local state as seen to avoid UX regressions if backend rejects global/ephemeral notifications
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
    // Persist to local cache
    this.addManyToSeenCache(prev.map(n => n.id));

    // Persist to backend via bulk endpoint
    this.http.post(`${this.apiUrl}/mark-all-seen`, {})
      .subscribe({
        error: (err) => {
          
          // Keep local state as seen even if server fails; avoids sticky unread counters
        }
      });
  }

  // Delete all notifications for current user
  deleteAll(): void {
    const prev = this.notifications$.value;
    // Optimistic clear
    this.notifications$.next([]);
    // Add to local deleted cache so they don't reappear on next fetch
    this.addManyToDeletedCache(prev.map(n => n.id));
    this.http.delete(`${this.apiUrl}`).subscribe({
      error: (err) => {
        
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

  private handleIncoming(message: IMessage, source: 'global' | 'user' = 'user'): void {
    try {
      const parsed = JSON.parse(message.body) as NotificationItem;
      const data: NotificationItem = { ...parsed, seen: !!parsed.seen };
      if (!data.content || !data.content.trim()) {
        return;
      }
      if (!this.isAllowedByPreferences(data)) {
        return;
      }
      const text = (data.content || '').toLowerCase();
      // Guard: prevent user-specific interactions (e.g., likes) from leaking via global topic
      if (source === 'global') {
        const isLikeNotification =
          text.includes('liked your post') ||
          text.includes('liked your comment') ||
          text.startsWith('liked ');
        // If backend mistakenly broadcasted a like globally, ignore it here
        if (isLikeNotification) {
          return;
        }
      }
      // Apply local deleted/seen cache before storing/displaying
      const userKey = this.userId || this.authService.currentUserValue?.user?.id || '';
      if (userKey) {
        const deletedSet = this.loadIdSet(this.LS_DELETED_KEY_PREFIX + userKey);
        if (deletedSet.has(data.id)) {
          return; // ignore deleted notifications resurfacing from server
        }
        const seenSet = this.loadIdSet(this.LS_SEEN_KEY_PREFIX + userKey);
        if (seenSet.has(data.id)) {
          data.seen = true;
        }
      }
      const existing = this.notifications$.value.filter(n => n.id !== data.id);
      this.notifications$.next([data, ...existing]);
      this.incoming$.next(data);
      this.showToast(data);
    } catch (e) {
      
    }
  }

  private subscribeForCurrentUser(forceResubscribe: boolean = false): void {
    // Subscribe to Spring user queue and (optionally) legacy user topic
    const token = this.authService.getToken();
    try {
      if (forceResubscribe) {
        if (this.userQueueSub) { this.userQueueSub.unsubscribe(); this.userQueueSub = undefined; }
        if (this.ticketQueueSub) { this.ticketQueueSub.unsubscribe(); this.ticketQueueSub = undefined; }
        if (this.legacyUserTopicSub) { this.legacyUserTopicSub.unsubscribe(); this.legacyUserTopicSub = undefined; }
      }
      // Subscribe to user queue if authenticated (Spring resolves Principal)
      if (!this.userQueueSub && token) {
        this.userQueueSub = this.stompClient.subscribe('/user/queue/notifications',
          (msg: IMessage) => this.handleIncoming(msg, 'user'));
      }
      if (!this.ticketQueueSub && token) {
        this.ticketQueueSub = this.stompClient.subscribe('/user/queue/ticket-notifications',
          (msg: IMessage) => this.handleIncoming(msg, 'user'));
      }
      // Legacy fallback: topic per user id
      if (!this.legacyUserTopicSub && this.userId) {
        const dest = `/topic/notifications.${this.userId}`;
        this.legacyUserTopicSub = this.stompClient.subscribe(dest,
          (msg: IMessage) => this.handleIncoming(msg, 'user'));
      }
    } catch (e) {
      
    }
  }

  private unsubscribeAll(): void {
    try {
      if (this.globalTopicSub) {
        this.globalTopicSub.unsubscribe();
        this.globalTopicSub = undefined;
      }
      if (this.userQueueSub) { this.userQueueSub.unsubscribe(); this.userQueueSub = undefined; }
      if (this.ticketQueueSub) { this.ticketQueueSub.unsubscribe(); this.ticketQueueSub = undefined; }
      if (this.legacyUserTopicSub) { this.legacyUserTopicSub.unsubscribe(); this.legacyUserTopicSub = undefined; }
      this.stopSyncFallback();
    } catch {}
  }

  private setPreferences(pref: NotificationPreferences | null): void {
    if (!pref) {
      this.preferenceSnapshot = null;
      this.preferencesLoaded = false;
      this.preferences$.next(null);
      return;
    }
    const wasDisabled = this.preferenceSnapshot?.inAppEnabled === false;
    this.preferenceSnapshot = pref;
    this.preferencesLoaded = true;
    this.preferences$.next(pref);
    if (pref.inAppEnabled === false) {
      if (this.isConnected()) {
        this.disconnect();
      }
      return;
    }
    if (wasDisabled && !this.isConnected() && this.authService.isAuthenticated()) {
      this.connect();
      this.fetchAll();
    }
  }

  private normalizePreferences(pref: NotificationPreferences | null | undefined): NotificationPreferences {
    const merged: NotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(pref || {}) };
    merged.quietHoursStart = this.normalizeTimeString(merged.quietHoursStart);
    merged.quietHoursEnd = this.normalizeTimeString(merged.quietHoursEnd);
    return merged;
  }

  private normalizeTimeString(value?: string | null): string | null {
    if (!value) return null;
    if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value;
    if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
    return null;
  }

  private isAllowedByPreferences(notification: NotificationItem): boolean {
    const pref = this.preferenceSnapshot;
    if (!pref) return true;
    if (pref.inAppEnabled === false) return false;
    const type = (notification.type || '').toString().toUpperCase();
    switch (type) {
      case 'LIKE':
        return pref.likeEnabled !== false;
      case 'COMMENT':
        return pref.commentEnabled !== false;
      case 'REPLY':
        return pref.replyEnabled !== false;
      case 'TICKET':
        return pref.ticketEnabled !== false;
      case 'SYSTEM':
        return pref.systemEnabled !== false;
      case 'COURSE':
        return pref.courseEnabled !== false;
      case 'POST':
        return pref.postEnabled !== false;
      default:
        return true;
    }
  }

  private appendAuthToken(baseUrl: string, token: string): string {
    try {
      const url = new URL(baseUrl);
      // Support common param names used in WS auth flows
      url.searchParams.set('token', token);
      url.searchParams.set('access_token', token);
      return url.toString();
    } catch {
      // Fallback simple concatenation
      const sep = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${sep}token=${encodeURIComponent(token)}`;
    }
  }

  private isConnected(): boolean {
    try {
      return (this.stompClient as any).connected === true;
    } catch {
      return false;
    }
  }

  ngOnDestroy(): void {
    this.unsubscribeAll();
    if (this.authSub) this.authSub.unsubscribe();
    if (this.stompClient) this.stompClient.deactivate();
  }

  // Periodic REST sync fallback to catch missed WS events
  private startSyncFallback(intervalMs: number = 15000): void {
    if (this.syncTimer) return;
    this.syncTimer = setInterval(() => this.fetchAll(), intervalMs);
  }

  private stopSyncFallback(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  // Local cache helpers
  private loadIdSet(key: string): Set<string> {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return new Set<string>();
      const arr = JSON.parse(raw);
      return new Set<string>(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set<string>();
    }
  }

  private saveIdSet(key: string, set: Set<string>): void {
    try {
      localStorage.setItem(key, JSON.stringify(Array.from(set)));
    } catch {}
  }

  private addToSeenCache(id: string): void {
    const userKey = this.userId || this.authService.currentUserValue?.user?.id || '';
    if (!userKey) return;
    const key = this.LS_SEEN_KEY_PREFIX + userKey;
    const set = this.loadIdSet(key);
    set.add(id);
    this.saveIdSet(key, set);
  }

  private addManyToSeenCache(ids: string[]): void {
    const userKey = this.userId || this.authService.currentUserValue?.user?.id || '';
    if (!userKey || !ids?.length) return;
    const key = this.LS_SEEN_KEY_PREFIX + userKey;
    const set = this.loadIdSet(key);
    ids.forEach(id => set.add(id));
    this.saveIdSet(key, set);
  }

  private addManyToDeletedCache(ids: string[]): void {
    const userKey = this.userId || this.authService.currentUserValue?.user?.id || '';
    if (!userKey || !ids?.length) return;
    const key = this.LS_DELETED_KEY_PREFIX + userKey;
    const set = this.loadIdSet(key);
    ids.forEach(id => set.add(id));
    this.saveIdSet(key, set);
  }
}
