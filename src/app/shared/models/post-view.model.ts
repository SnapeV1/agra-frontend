import { Post } from 'src/app/core/models/post.module';
import { PostComment } from 'src/app/core/models/post-comment.module';

// UI-specific state for feed/admin post views
export interface PostViewModel extends Post {
  comments: PostComment[];
  showComments?: boolean;
  newComment?: string;
  showDropdown?: boolean;
  imageLoadFailed?: boolean;
}
