export enum NotificationType {
  SYSTEM = 'SYSTEM',
  SESSION = 'SESSION',
  COURSE = 'COURSE',
  POST = 'POST',
  TICKET = 'TICKET',
}

export interface NotificationItem {
  id: string;
  content: string;
  type: NotificationType;
  seen: boolean;
  timestamp: string;
  // Optional metadata used for filtering/self-notifications
  actorId?: string;       // user who triggered the notification (e.g., post author)
  recipientId?: string;   // intended recipient (if present)
  userId?: string;        // alternate field name for recipient
  metadata?: any;         // backend-provided metadata payload
}
