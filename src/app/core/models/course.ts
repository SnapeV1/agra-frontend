export interface Course {
  id?: string; 
  title: string;
  imageUrl: string;
  description: string;
  domain: string;
  country: string;
  trainerId: string;
  sessionIds: string[];
  languagesAvailable: string[];
  createdAt: Date;
  updatedAt: Date;
  archived: boolean;
  activeCall: boolean;
  liveRoomName?: string;
  videoUrl?: string;
  videoPublicId?: string;
  files: CourseFile[];
  textContent: TextContent[];
  imagePublicId?: string; 
  thumbnailUrl?: string;
  detailImageUrl?: string;
  goals: string[];
  
}
export interface CourseFile {
  id?: string;
  name: string;
  type: string; 
  url: string;
  publicId?: string;
  size: number;
  uploadDate?: Date;
}

export interface TextContent {
  id?: string;
  title: string;
  content: string;
  order: number;
  type: 'lesson' | 'assignment' | 'reading' | 'quiz';
  questions?: QuizQuestion[];
  quizQuestions?: QuizQuestionApi[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer?: string;
  explanation?: string;
  // UI-only flag for editor collapse state
  uiCollapsed?: boolean;
}

export interface QuizAnswer {
  id?: string;
  text: string;
  correct?: boolean;
}

export interface QuizQuestionApi {
  id?: string;
  question: string;
  answers: QuizAnswer[];
}

export interface CourseProgress {
  courseId: string;
  enrolledAt: Date;
  startedAt: Date;
  lastAccessedAt: Date;
  completedAt?: Date;
  completed: boolean;
  completionPercentage: number;
  certificateUrl?: string;
  certificateCode?: string;
  certificateIssuedAt?: Date;

  // Session-level progress tracking
  completedSessionIds: string[];
  currentSessionId?: string;
  totalSessions: number;

  // Additional tracking
  totalTimeSpent: number; // in minutes
  accessCount: number;
}

