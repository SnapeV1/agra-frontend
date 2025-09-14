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
  videoUrl?: string;
  videoPublicId?: string;
  files: CourseFile[];
  textContent: TextContent[];
  imagePublicId?: string; 
  thumbnailUrl?: string;
  detailImageUrl?: string;
  
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
  type: 'lesson' | 'assignment' | 'reading';
}