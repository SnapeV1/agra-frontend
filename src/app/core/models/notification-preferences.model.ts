export interface NotificationPreferences {
  likeEnabled: boolean;
  commentEnabled: boolean;
  replyEnabled: boolean;
  ticketEnabled: boolean;
  systemEnabled: boolean;
  courseEnabled: boolean;
  postEnabled: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  likeEnabled: true,
  commentEnabled: true,
  replyEnabled: true,
  ticketEnabled: true,
  systemEnabled: true,
  courseEnabled: true,
  postEnabled: true,
  inAppEnabled: true,
  emailEnabled: true,
  pushEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00:00',
  quietHoursEnd: '07:00:00',
};
