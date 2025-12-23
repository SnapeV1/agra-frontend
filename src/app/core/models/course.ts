export interface Course {
  id?: string; 
  defaultLanguage?: string;
  translations?: Record<string, CourseTranslation>;
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

export interface CourseTranslation {
  title?: string;
  description?: string;
  goals?: string[];
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
  title: Record<string, string>;
  content: Record<string, string>;
  order: number;
  type: 'lesson' | 'assignment' | 'reading' | 'quiz';
  translations?: Record<string, TextContentTranslation>;
  questions?: QuizQuestion[];
  quizQuestions?: QuizQuestionApi[];
}

export interface TextContentTranslation {
  title?: string;
  content?: string;
}

export interface QuizQuestion {
  question: Record<string, string>;
  options: string[];
  correctAnswer?: string;
  explanation?: string;
  // UI-only flag for editor collapse state
  uiCollapsed?: boolean;
}

export interface QuizAnswer {
  id?: string;
  text: Record<string, string>;
  translations?: Record<string, QuizAnswerTranslation>;
  correct?: boolean;
}

export interface QuizAnswerTranslation {
  text?: string;
}

export interface QuizQuestionApi {
  id?: string;
  question?: Record<string, string>;
  translations?: Record<string, QuizQuestionTranslation>;
  answers: QuizAnswer[];
}

export interface QuizQuestionTranslation {
  question?: string;
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

