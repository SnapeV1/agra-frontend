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
}
