export enum NotificationType {
  SYSTEM = 'SYSTEM',
  SESSION = 'SESSION',
  COURSE = 'COURSE',
  POST = 'POST',
}

export interface NotificationItem {
  id: string;
  content: string;
  type: NotificationType;
  seen: boolean;
  timestamp: string;
}
