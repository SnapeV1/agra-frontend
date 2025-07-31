export interface Course {
  id: string;
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
}