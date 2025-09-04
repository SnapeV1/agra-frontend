import { User } from '../../user/models/user.model';


export interface PostComment {
  id?: string;
  postId?: string;
  userId?: string;
  userInfo?: User;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
  parentCommentId?: string;
  replyToUserId?: string;
  likesCount?: number;
  isLikedByCurrentUser?: boolean;
  replies?: Comment[];
 }
