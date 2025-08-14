export interface CourseProgress {
courseId: string;
  courseName: string;
  progress: number;
  completedAt?: string;
  status: 'in-progress' | 'completed' | 'not-started';
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  picture?: string;
  country?: string;
  language?: string;
  domain?: string;
  role: string;
  registeredAt: string; 
  progress?: CourseProgress[];
  archived: boolean;

}

