import { CourseProgress } from "./course";

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

