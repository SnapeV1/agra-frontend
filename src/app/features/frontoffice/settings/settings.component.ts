import { Component, ElementRef, OnDestroy, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { ProfileService } from 'src/app/core/services/profile/profile.service';
import { Ticket, TicketMessage, TicketStatus, TicketThreadResponse } from 'src/app/core/models/ticket.model';
import { TicketService } from 'src/app/core/services/ticket.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from 'src/app/core/models/notification-preferences.model';
import { ToastrService } from 'ngx-toastr';
import { TicketSocketService } from 'src/app/core/services/ticket-socket.service';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit, OnDestroy, AfterViewInit {
  TicketStatus = TicketStatus;
  private currentUserId: string | null;
  // Password form
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  pwMessage = '';
  pwError = '';

  // Email form
  newEmail = '';
  emailPassword = '';
  emailMessage = '';
  emailError = '';

  // Preferences
  theme: 'light' | 'dark' = (() => {
    const stored = localStorage.getItem('pref_theme');
    if (stored === 'dark' || stored === 'light') return stored as 'light' | 'dark';
    // Coerce legacy 'auto' to system preference once and persist
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = prefersDark ? 'dark' : 'light';
    try { localStorage.setItem('pref_theme', resolved); } catch {}
    return resolved as 'light' | 'dark';
  })();
  language = localStorage.getItem('pref_lang') || 'en';

  // Notification preferences (remote)
  notificationPrefs: NotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  notificationPrefsLoading = false;
  notificationPrefsSaving = false;
  notificationPrefsMessage = '';
  notificationPrefsError = '';
  quietHoursStartInput = '22:00';
  quietHoursEndInput = '07:00';
  notificationPrefsCollapsed = true;

  // Tickets
  myTickets: Ticket[] = [];
  ticketsLoading = false;
  ticketsError = '';
  showTicketForm = false;
  newTicketSubject = '';
  newTicketMessage = '';
  creatingTicket = false;
  createTicketError = '';
  createTicketAttachment: File | null = null;
  selectedThread?: TicketThreadResponse;
  threadMessages: TicketMessage[] = [];
  threadLoading = false;
  threadError = '';
  selectedTicketId: string | null = null;
  replyMessage = '';
  sendingReply = false;
  replyAttachment: File | null = null;
  previewAttachmentUrl: string | null = null;
  private ticketEventsSub?: Subscription;

  // Modals
  showEmailModal = false;
  showPasswordModal = false;
  showDeleteModal = false;

  private conversationBody?: ElementRef<HTMLDivElement>;
  @ViewChild('userConversationBody') set conversationBodySetter(el: ElementRef<HTMLDivElement> | undefined) {
    this.conversationBody = el;
    this.scrollConversationToBottom();
  }
  @ViewChild('createTicketAttachmentInput') createTicketAttachmentInput?: ElementRef<HTMLInputElement>;
  @ViewChild('userReplyAttachmentInput') userReplyAttachmentInput?: ElementRef<HTMLInputElement>;
  @ViewChild('attachmentPreviewImage') attachmentPreviewImage?: ElementRef<HTMLImageElement>;

  constructor(
    private auth: AuthService,
    private profileService: ProfileService,
    private ticketService: TicketService,
    private notificationService: NotificationService,
    private toastr: ToastrService,
    private ticketSocket: TicketSocketService
  ) {
    this.currentUserId = this.auth.currentUserValue?.user?.id || null;
  }

  ngOnInit(): void {
    // Respect user preference if available from backend-auth state
    const userPref = (this.auth.currentUserValue?.user as any)?.themePreference;
    if (userPref) {
      try { localStorage.setItem('pref_theme', userPref); } catch {}
      // Coerce 'auto' to system at view time
      const effective = userPref === 'dark' ? 'dark' : (userPref === 'light' ? 'light' : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
      this.theme = effective as 'light' | 'dark';
    }
    this.applyTheme(this.theme, false);
    this.fetchTickets();
    this.loadNotificationPreferences();
    // No system-watch needed; 'auto' removed.
  }

  ngOnDestroy(): void {
    if (this.ticketEventsSub) this.ticketEventsSub.unsubscribe();
    if (this.selectedTicketId) {
      this.ticketSocket.leaveTicket(this.selectedTicketId);
    }
  }

  ngAfterViewInit(): void {
    this.scrollConversationToBottom();
  }

  saveTheme(): void {
    localStorage.setItem('pref_theme', this.theme);
    this.applyTheme(this.theme, true);
    // Persist to backend profile as themePreference
    this.profileService.updateUserProfile({ themePreference: this.theme }).subscribe({
      next: () => {
        const current = this.auth.currentUserValue?.user;
        if (current) {
          this.auth.updateCurrentUser({ ...current, themePreference: this.theme } as any);
        }
      },
      error: () => {
        // Keep UI applied locally even if backend fails
      }
    });
  }

  saveLanguage(): void {
    localStorage.setItem('pref_lang', this.language);
  }

  fetchTickets(): void {
    this.ticketsLoading = true;
    this.ticketsError = '';
    this.ticketService.getMyTickets().subscribe({
      next: tickets => {
        this.myTickets = tickets;
        this.ticketsLoading = false;
        if (!this.selectedTicketId && tickets.length) {
          this.openTicket(tickets[0].id);
          return;
        }
        if (this.selectedTicketId) {
          const stillExists = tickets.some(t => t.id === this.selectedTicketId);
          if (!stillExists) {
            this.selectedThread = undefined;
            this.threadMessages = [];
            this.selectedTicketId = null;
          }
        }
      },
      error: err => {
        this.ticketsError = err?.error?.message || err?.message || 'Unable to load your support tickets right now.';
        this.ticketsLoading = false;
      }
    });
  }

  ticketBadgeClass(status: TicketStatus): string {
    switch (status) {
      case TicketStatus.OPEN:
        return 'status-pill status-open';
      case TicketStatus.PENDING:
        return 'status-pill status-pending';
      case TicketStatus.RESOLVED:
        return 'status-pill status-resolved';
      case TicketStatus.CLOSED:
        return 'status-pill status-closed';
      default:
        return 'status-pill';
    }
  }

  startTicket(): void {
    this.showTicketForm = !this.showTicketForm;
    this.createTicketError = '';
  }

  submitTicket(): void {
    if (!this.newTicketSubject.trim() || !this.newTicketMessage.trim()) {
      this.createTicketError = 'Please provide both subject and message.';
      return;
    }
    this.creatingTicket = true;
    this.createTicketError = '';
    const payload = {
      subject: this.newTicketSubject.trim(),
      message: this.newTicketMessage.trim()
    };
    this.ticketService.createTicket(payload, this.createTicketAttachment || undefined).subscribe({
      next: thread => {
        this.myTickets = [thread.ticket, ...this.myTickets];
        this.newTicketSubject = '';
        this.newTicketMessage = '';
        this.creatingTicket = false;
        this.showTicketForm = false;
        this.clearCreateAttachment();
        this.openTicket(thread.ticket.id);
      },
      error: err => {
        this.createTicketError = err?.error?.message || err?.message || 'Unable to create ticket.';
        this.creatingTicket = false;
      }
    });
  }

  private applyTheme(theme: 'light' | 'dark', persistSelection = false): void {
    try {
      if (persistSelection) localStorage.setItem('pref_theme', theme);
      const root = document.documentElement;
      if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark');
      } else if (theme === 'light') {
        root.removeAttribute('data-theme');
      }
    } catch {}
  }

  changePassword(): void {
    this.pwMessage = '';
    this.pwError = '';
    if (!this.currentPassword || !this.newPassword) {
      this.pwError = 'Please fill all password fields.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.pwError = 'New passwords do not match.';
      return;
    }
    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.pwMessage = 'Password updated successfully';
        this.currentPassword = this.newPassword = this.confirmPassword = '';
      },
      error: (err) => {
        this.pwError = err?.message || 'Failed to change password';
      }
    });
  }

  changeEmail(): void {
    this.emailMessage = '';
    this.emailError = '';
    if (!this.newEmail || !this.emailPassword) {
      this.emailError = 'Please provide new email and current password.';
      return;
    }
    this.auth.changeEmail(this.newEmail, this.emailPassword).subscribe({
      next: () => {
        this.emailMessage = 'Email change requested successfully';
        this.newEmail = '';
        this.emailPassword = '';
        this.showEmailModal = false;
      },
      error: (err) => {
        this.emailError = err?.message || 'Failed to change email';
      }
    });
  }

  // UI helpers
  get currentEmail(): string {
    return this.auth.currentUserValue?.user?.email || this.auth.getUserEmail() || '—';
  }

  openModal(kind: 'email' | 'password' | 'delete'): void {
    this.showEmailModal = kind === 'email';
    this.showPasswordModal = kind === 'password';
    this.showDeleteModal = kind === 'delete';
  }

  closeModal(): void {
    this.showEmailModal = this.showPasswordModal = this.showDeleteModal = false;
  }

  overlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal')) {
      this.closeModal();
    }
  }

  loadNotificationPreferences(): void {
    this.notificationPrefsLoading = true;
    this.notificationPrefsError = '';
    this.notificationPrefsMessage = '';
    this.notificationService.fetchPreferences().subscribe({
      next: prefs => {
        this.applyNotificationPreferences(prefs);
        this.notificationPrefsLoading = false;
      },
      error: err => {
        this.notificationPrefsLoading = false;
        this.notificationPrefsError = err?.error?.message || err?.message || 'Unable to load notification preferences.';
      }
    });
  }

  saveNotificationPreferences(): void {
    this.notificationPrefsSaving = true;
    this.notificationPrefsMessage = '';
    this.notificationPrefsError = '';
    if (this.notificationPrefs.quietHoursEnabled && (!this.quietHoursStartInput || !this.quietHoursEndInput)) {
      this.notificationPrefsError = 'Please set both quiet hours start and end times.';
      this.notificationPrefsSaving = false;
      return;
    }
    const quietStart = this.notificationPrefs.quietHoursEnabled ? this.toHms(this.quietHoursStartInput) : null;
    const quietEnd = this.notificationPrefs.quietHoursEnabled ? this.toHms(this.quietHoursEndInput) : null;
    if (this.notificationPrefs.quietHoursEnabled && (!quietStart || !quietEnd)) {
      this.notificationPrefsError = 'Please set valid quiet hours start and end times.';
      this.notificationPrefsSaving = false;
      return;
    }
    const payload: NotificationPreferences = {
      ...this.notificationPrefs,
      quietHoursStart: quietStart,
      quietHoursEnd: quietEnd,
    };
    this.notificationService.updatePreferences(payload).subscribe({
      next: prefs => {
        this.applyNotificationPreferences(prefs);
        this.notificationPrefsSaving = false;
        this.notificationPrefsMessage = 'Notification preferences saved.';
        try { this.toastr.success('Notification preferences saved'); } catch {}
      },
      error: err => {
        this.notificationPrefsSaving = false;
        this.notificationPrefsError = err?.error?.message || err?.message || 'Unable to save notification preferences.';
        try { this.toastr.error(this.notificationPrefsError); } catch {}
      }
    });
  }

  resetNotificationPreferences(): void {
    this.notificationPrefsMessage = '';
    this.notificationPrefsError = '';
    this.applyNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES });
  }

  muteAllNotifications(): void {
    this.notificationPrefsMessage = '';
    this.notificationPrefsError = '';
    const muted: NotificationPreferences = {
      ...this.notificationPrefs,
      likeEnabled: false,
      commentEnabled: false,
      replyEnabled: false,
      ticketEnabled: false,
      systemEnabled: false,
      courseEnabled: false,
      postEnabled: false,
      inAppEnabled: false,
      emailEnabled: false,
      pushEnabled: false,
      quietHoursEnabled: true,
      quietHoursStart: '00:00:00',
      quietHoursEnd: '23:59:59',
    };
    this.applyNotificationPreferences(muted);
    this.quietHoursStartInput = '00:00';
    this.quietHoursEndInput = '23:59';
  }

  toggleQuietHours(): void {
    this.notificationPrefs.quietHoursEnabled = !this.notificationPrefs.quietHoursEnabled;
    if (this.notificationPrefs.quietHoursEnabled) {
      if (!this.quietHoursStartInput) this.quietHoursStartInput = '22:00';
      if (!this.quietHoursEndInput) this.quietHoursEndInput = '07:00';
    }
  }

  toggleNotificationPrefs(): void {
    this.notificationPrefsCollapsed = !this.notificationPrefsCollapsed;
  }

  private applyNotificationPreferences(prefs: NotificationPreferences): void {
    const merged: NotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(prefs || {}) };
    this.notificationPrefs = merged;
    this.quietHoursStartInput = this.toTimeInput(merged.quietHoursStart) || '22:00';
    this.quietHoursEndInput = this.toTimeInput(merged.quietHoursEnd) || '07:00';
  }

  private toTimeInput(value?: string | null): string {
    if (!value) return '';
    const parts = value.split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    return '';
  }

  private toHms(value?: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
    if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
    return null;
  }

  openTicket(ticketId: string): void {
    // Subscribe to WS events for this ticket
    this.ticketSocket.subscribeToTicket(ticketId);
    if (this.ticketEventsSub) this.ticketEventsSub.unsubscribe();
    this.ticketEventsSub = this.ticketSocket.ticketEvents$
      .pipe(filter(evt => evt.ticketId === ticketId))
      .subscribe(evt => this.applyTicketEvent(evt));

    this.selectedTicketId = ticketId;
    this.threadLoading = true;
    this.threadError = '';
    const requestForId = ticketId;
    this.ticketService.getTicketThread(ticketId).subscribe({
      next: thread => {
        if (this.selectedTicketId !== requestForId) return;
        this.selectedThread = thread;
        this.threadMessages = thread.messages || [];
        this.threadLoading = false;
        this.replyMessage = '';
        this.clearReplyAttachment();
        this.scrollConversationToBottom();
      },
      error: err => {
        if (this.selectedTicketId !== requestForId) return;
        this.threadError = err?.error?.message || err?.message || 'Unable to load this ticket conversation.';
        this.threadLoading = false;
      }
    });
  }

  sendReply(): void {
    if (!this.selectedThread || !this.replyMessage.trim() || this.sendingReply) return;
    if (this.selectedThread.ticket.status === TicketStatus.CLOSED) return;
    const ticketId = this.selectedThread.ticket.id;
    const content = this.replyMessage.trim();
    this.sendingReply = true;
    this.ticketService.sendMessage(ticketId, { content }, this.replyAttachment || undefined).subscribe({
      next: message => {
        this.threadMessages = [...this.threadMessages, message];
        this.replyMessage = '';
        this.sendingReply = false;
        this.clearReplyAttachment();
        this.scrollConversationToBottom();
      },
      error: err => {
        this.threadError = err?.error?.message || err?.message || 'Unable to send your reply right now.';
        this.sendingReply = false;
      }
    });
  }

  lastUpdateLabel(ticket: Ticket): string {
    if (ticket.updatedAt) {
      return `Updated ${new Date(ticket.updatedAt).toLocaleString()}`;
    }
    if (ticket.createdAt) {
      return `Created ${new Date(ticket.createdAt).toLocaleString()}`;
    }
    return 'Created';
  }

  senderDisplayName(msg: TicketMessage, ticket?: Ticket): string {
    if (this.isAdminMessage(msg, ticket)) {
      return msg.sender?.name || msg.sender?.email || ticket?.adminInfo?.name || ticket?.adminInfo?.email || 'Support team';
    }
    const current = this.auth.currentUserValue?.user;
    return current?.name || current?.email || 'You';
  }

  senderAvatar(msg: TicketMessage, ticket?: Ticket): string | undefined {
    if (this.isAdminMessage(msg, ticket)) {
      return msg.sender?.picture || ticket?.adminInfo?.picture || undefined;
    }
    const currentUser = this.auth.currentUserValue?.user as any;
    return msg.sender?.picture || ticket?.userInfo?.picture || currentUser?.picture || undefined;
  }

  senderInitial(msg: TicketMessage, ticket?: Ticket): string {
    if (this.isAdminMessage(msg, ticket)) {
      return this.avatarLetter(
        msg.sender?.name || msg.sender?.email || ticket?.adminInfo?.name || ticket?.adminInfo?.email || 'S'
      );
    }
    const current = this.auth.currentUserValue?.user;
    return this.avatarLetter(
      current?.name || current?.email || ticket?.userInfo?.name || ticket?.userInfo?.email || 'You'
    );
  }

  isAdminMessage(msg: TicketMessage, ticket?: Ticket): boolean {
    if (typeof msg.isAdminMessage === 'boolean') {
      return msg.isAdminMessage;
    }
    const senderId = msg.senderId ?? msg.sender?.id;
    const assignedAdminId = ticket?.adminId || ticket?.adminInfo?.id || null;
    if (assignedAdminId && senderId) {
      return senderId === assignedAdminId;
    }
    return false;
  }

  isUserMessage(msg: TicketMessage, ticket?: Ticket): boolean {
    return !this.isAdminMessage(msg, ticket);
  }

  private avatarLetter(value?: string): string {
    if (!value) return '?';
    return value.trim().charAt(0).toUpperCase();
  }

  private scrollConversationToBottom(): void {
    requestAnimationFrame(() => {
      const el = this.conversationBody?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }

  openAttachmentPreview(url?: string | null): void {
    this.previewAttachmentUrl = url || null;
  }

  closeAttachmentPreview(): void {
    this.previewAttachmentUrl = null;
  }

  onCreateAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0] || null;
    this.createTicketAttachment = file;
  }

  clearCreateAttachment(): void {
    this.createTicketAttachment = null;
    if (this.createTicketAttachmentInput?.nativeElement) {
      this.createTicketAttachmentInput.nativeElement.value = '';
    }
  }

  onReplyAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0] || null;
    this.replyAttachment = file;
  }

  clearReplyAttachment(): void {
    this.replyAttachment = null;
    if (this.userReplyAttachmentInput?.nativeElement) {
      this.userReplyAttachmentInput.nativeElement.value = '';
    }
  }

  private applyTicketEvent(evt: any): void {
    if (!this.selectedThread || evt.ticketId !== this.selectedThread.ticket.id) return;
    if (evt.type === 'MESSAGE' && evt.message) {
      const exists = this.threadMessages.some(m => m.id === evt.message.id);
      if (!exists) {
        this.threadMessages = [...this.threadMessages, evt.message];
        this.scrollConversationToBottom();
      }
    }
    if (evt.type === 'STATUS' && evt.status && this.selectedThread?.ticket) {
      this.selectedThread = { ...this.selectedThread, ticket: { ...this.selectedThread.ticket, status: evt.status } };
    }
  }
}
