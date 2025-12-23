import { CourseProgress } from "./course";

export interface User {
  id: string;
  name: string;
  email: string;
  birthdate?: string;
  phone?: string;
  phoneCountryCode?: string;
  password?: string;
  picture?: string;
  country?: string;
  language?: string;
  profession?: string;
  role: string;
  // User-selected theme preference persisted server-side
  themePreference?: 'light' | 'dark' | 'auto' | string;
  // Email verification status
  verified?: boolean;
  registeredAt: string; 
  progress?: CourseProgress[];
  archived: boolean;

}
