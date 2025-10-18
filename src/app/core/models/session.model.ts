// Session model and related DTOs
export interface Session {
  id?: string;
  courseId?: string;
  title?: string;
  description?: string;
  roomName?: string;
  startTime?: string; // ISO
  endTime?: string;   // ISO
  lobbyEnabled?: boolean;
  recordingEnabled?: boolean;
  recordingUrl?: string;
}

// Backward-compatible alias for existing imports
export type SessionModule = Session;

export interface CreateSessionDto {
  title: string;
  description?: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  lobbyEnabled?: boolean;
  recordingEnabled?: boolean;
}

export interface JoinResponse {
  roomName: string;
  domain?: string;
  jwt: string;
  displayName: string;
  avatarUrl?: string;
}

