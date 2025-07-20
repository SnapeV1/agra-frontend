export interface CourseProgress {
  courseId: string;
  completed: boolean;
  progressPercent: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  country?: string;
  language?: string;
  domain?: string;
  role: string;
  registeredAt: string; 
  progress?: CourseProgress[];
}
