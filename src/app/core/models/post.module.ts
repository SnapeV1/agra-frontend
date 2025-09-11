import { User } from "./user.model";
import { PostComment } from "./post-comment.module";

export interface Post {
  id: string;
  userId: string;
  userInfo: User;
  content: string;
  imageUrl?: string;
  createdAt?: string; 
  updatedAt?: string;
  isCoursePost?: boolean;
  courseId?: string;
  commentIds?: string[];
  commentsCount?: number;
  likesCount?: number;
  comments?: PostComment[];
  isLikedByCurrentUser?: boolean;
  // UI-only properties
  showComments?: boolean;
  newComment?: string;
  showDropdown?: boolean;
  imageLoadFailed?: boolean; 

}