export enum TicketStatus {
  OPEN = 'OPEN',
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export interface TicketParticipantInfo {
  id: string;
  name?: string;
  email?: string;
  picture?: string;
}

export interface Ticket {
  id: string;
  userId: string;
  userInfo?: TicketParticipantInfo;
  adminId?: string | null;
  adminInfo?: TicketParticipantInfo | null;
  subject: string;
  status: TicketStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId?: string;
  recipientId?: string;
  sender?: TicketParticipantInfo;
  recipient?: TicketParticipantInfo;
  content: string;
  timestamp: string;
  isAdminMessage: boolean;
  attachmentUrl?: string | null;
}

export interface TicketThreadResponse {
  ticket: Ticket;
  messages: TicketMessage[];
}

export type TicketEventType = 'MESSAGE' | 'ASSIGNED' | 'STATUS' | 'CLOSED' | 'OPENED';

export interface TicketEventPayload {
  ticketId: string;
  type: TicketEventType;
  message?: TicketMessage;
  status?: TicketStatus;
  assignedTo?: TicketParticipantInfo | null;
}
