export type ActivityType =
  | 'LIKE'
  | 'PROFILE_UPDATE'
  | 'COURSE_ENROLLMENT'
  | 'COURSE_COMPLETION'
  | 'TICKET_SUBMISSION'
  | 'CHATBOT_USAGE'
  | 'OTHER';

export interface ActivityLogUserInfo {
  id: string;
  name?: string;
  email?: string;
  picture?: string;
  birthdate?: string;
}

export interface ActivityLog {
  id: string;
  createdAt: string;
  activityType: ActivityType;
  action: string;
  userId: string;
  userInfo?: ActivityLogUserInfo;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}
