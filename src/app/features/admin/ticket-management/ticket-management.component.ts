import { Component, OnInit } from '@angular/core';
import { TicketService } from 'src/app/core/services/ticket.service';
import { Ticket, TicketMessage, TicketStatus, TicketThreadResponse } from 'src/app/core/models/ticket.model';

@Component({
  selector: 'app-ticket-management',
  templateUrl: './ticket-management.component.html',
  styleUrls: ['./ticket-management.component.css']
})
export class TicketManagementComponent implements OnInit {
  TicketStatus = TicketStatus;

  tickets: Ticket[] = [];
  loading = false;
  error = '';

  statusFilter: TicketStatus | 'ALL' = 'ALL';
  statusOptions: (TicketStatus | 'ALL')[] = ['ALL', TicketStatus.OPEN, TicketStatus.PENDING, TicketStatus.RESOLVED, TicketStatus.CLOSED];
  ticketStatuses: TicketStatus[] = [TicketStatus.OPEN, TicketStatus.PENDING, TicketStatus.RESOLVED, TicketStatus.CLOSED];
  search = '';
  sortOption: 'recent' | 'status' = 'recent';
  filterHighPriority = false;
  filterUnassigned = false;
  filterOverdue = false;

  selectedThread?: TicketThreadResponse;
  messages: TicketMessage[] = [];
  reply = '';
  sending = false;
  closing = false;

  constructor(private ticketService: TicketService) {}

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.loading = true;
    this.error = '';
    this.ticketService.getAllTickets().subscribe({
      next: tickets => {
        this.tickets = tickets;
        this.loading = false;
        if (!this.selectedThread && tickets.length) {
          this.openTicket(tickets[0].id);
        }
      },
      error: err => {
        this.error = err?.message || 'Unable to load tickets.';
        this.loading = false;
      }
    });
  }

  filteredTickets(): Ticket[] {
    const term = this.search.trim().toLowerCase();
    const filtered = this.tickets.filter(ticket => {
      const matchesStatus = this.statusFilter === 'ALL' || ticket.status === this.statusFilter;
      const matchesSearch =
        !term ||
        ticket.subject.toLowerCase().includes(term) ||
        ticket.id.toLowerCase().includes(term);
      const matchesPriority = !this.filterHighPriority || (ticket as any)?.priority === 'HIGH';
      const matchesAssignment = !this.filterUnassigned || !(ticket as any)?.adminId;
      const matchesOverdue = !this.filterOverdue || !!(ticket as any)?.overdue;
      return matchesStatus && matchesSearch && matchesPriority && matchesAssignment && matchesOverdue;
    });
    return filtered.sort((a, b) => {
      if (this.sortOption === 'status') {
        return a.status.localeCompare(b.status);
      }
      return new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime();
    });
  }

  openTicket(ticketId: string): void {
    this.ticketService.getTicketThread(ticketId).subscribe({
      next: thread => {
        this.selectedThread = thread;
        this.messages = thread.messages || [];
        this.reply = '';
      },
      error: err => {
        this.error = err?.message || 'Unable to load ticket thread.';
      }
    });
  }

  sendMessage(): void {
    if (!this.selectedThread || !this.reply.trim() || this.sending) return;
    if (this.selectedThread.ticket.status === TicketStatus.CLOSED) return;
    const ticketId = this.selectedThread.ticket.id;
    this.sending = true;
    this.ticketService.sendMessage(ticketId, { content: this.reply.trim() }).subscribe({
      next: message => {
        this.messages = [...this.messages, message];
        this.reply = '';
        this.sending = false;
      },
      error: err => {
        this.error = err?.message || 'Unable to send message.';
        this.sending = false;
      }
    });
  }

  closeTicket(): void {
    if (!this.selectedThread || this.selectedThread.ticket.status === TicketStatus.CLOSED || this.closing) return;
    const confirmed = confirm('Close this ticket? This action cannot be undone.');
    if (!confirmed) return;
    const ticketId = this.selectedThread.ticket.id;
    this.closing = true;
    this.ticketService.closeTicket(ticketId).subscribe({
      next: ticket => {
        this.selectedThread = { ...this.selectedThread!, ticket };
        this.closing = false;
        this.loadTickets();
      },
      error: err => {
        this.error = err?.message || 'Unable to close ticket.';
        this.closing = false;
      }
    });
  }

  statusClass(status?: TicketStatus): string {
    switch (status) {
      case TicketStatus.OPEN: return 'badge badge-open';
      case TicketStatus.PENDING: return 'badge badge-progress';
      case TicketStatus.RESOLVED: return 'badge badge-resolved';
      case TicketStatus.CLOSED: return 'badge badge-closed';
      default: return 'badge';
    }
  }

  get totalTickets(): number {
    return this.tickets.length;
  }

  countByStatus(target: TicketStatus): number {
    return this.tickets.filter(t => t.status === target).length;
  }

  toggleFilter(key: 'priority' | 'unassigned' | 'overdue'): void {
    if (key === 'priority') this.filterHighPriority = !this.filterHighPriority;
    if (key === 'unassigned') this.filterUnassigned = !this.filterUnassigned;
    if (key === 'overdue') this.filterOverdue = !this.filterOverdue;
  }

  avatarLetter(text?: string): string {
    if (!text) return '?';
    return text.trim().charAt(0).toUpperCase();
  }

  ticketUserDisplay(ticket: Ticket): string {
    return ticket.userInfo?.name || ticket.userInfo?.email || ticket.userId || 'User';
  }

  ticketUserInitial(ticket: Ticket): string {
    return this.avatarLetter(ticket.userInfo?.name || ticket.userInfo?.email || ticket.userId);
  }

  ticketUserPicture(ticket: Ticket): string | undefined {
    return ticket.userInfo?.picture || undefined;
  }

  isAdminMessage(msg: TicketMessage, ticket: Ticket): boolean {
    if (typeof msg.isAdminMessage === 'boolean') {
      return msg.isAdminMessage;
    }
    if (ticket.adminId) {
      return msg.senderId === ticket.adminId;
    }
    return false;
  }

  ticketPriorityLabel(ticket: Ticket): string {
    switch (ticket.status) {
      case TicketStatus.OPEN: return 'High Priority';
      case TicketStatus.PENDING: return 'In Progress';
      case TicketStatus.RESOLVED: return 'Medium Priority';
      case TicketStatus.CLOSED: return 'Low Priority';
      default: return 'General';
    }
  }
}
