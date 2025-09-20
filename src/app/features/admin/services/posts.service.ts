import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { Post } from '../../../core/models/post.module';
import { PostComment } from '../../../core/models/post-comment.module';
import { AuthService } from 'src/app/core/services/auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PostsService {
  private posts: Post[] = [];
  private postsSubject = new BehaviorSubject<Post[]>([]);
  posts$ = this.postsSubject.asObservable();

  private readonly apiUrl = 'http://localhost:8080/api/posts/sorted';
  constructor(private http: HttpClient,private authService: AuthService,
  ) {}
  /** Fetch all posts from backend */
  fetchPosts(): void {
    this.http.get<Post[]>(this.apiUrl)
      .pipe(
        map(posts =>
          posts.map(post => ({
            ...post,
            createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : undefined,
            updatedAt: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
            comments: post.comments || [],
            isLikedByCurrentUser: post.isLikedByCurrentUser || false,
            likesCount: post.likesCount || 0,
            commentsCount: post.commentsCount || 0,
            // Local UI flags (not in model)
            showComments: false,
            newComment: '',
            showDropdown: false
          }))
        )
      )
      .subscribe({
        next: (data) => {
          this.posts = data;
          this.sortPosts();
        },
        error: (error) => {
          console.error('Error fetching posts:', error);
        }
      });
  }

  /** Create a new post locally */
  createPost(newPost: Post): void {
    this.posts.unshift(newPost);
    this.sortPosts();
  }

  /** Edit a post locally */
  editPost(updatedPost: Post): void {
    const index = this.posts.findIndex(p => p.id === updatedPost.id);
    if (index !== -1) {
      this.posts[index] = { ...this.posts[index], ...updatedPost };
      this.updatePosts();
    }
  }

  /** Delete a post locally */
  deletePost(postId: string): void {
    this.posts = this.posts.filter(p => p.id !== postId);
    this.updatePosts();
  }

  /** Toggle like on a post */
  toggleLike(post: Post): void {
    console.log('🔧 PostsService - toggleLike called for post:', post.id);
    console.log('📊 Initial state - isLiked:', post.isLikedByCurrentUser, 'likesCount:', post.likesCount);
    
    // Ensure likesCount has a default value
    if (post.likesCount === undefined || post.likesCount === null) {
      post.likesCount = 0;
    }
    
    // Update local state immediately for optimistic UI
    post.isLikedByCurrentUser = !post.isLikedByCurrentUser;
    post.likesCount += post.isLikedByCurrentUser ? 1 : -1;
    console.log('🔄 Local state updated - isLiked:', post.isLikedByCurrentUser, 'likesCount:', post.likesCount);

    // Notify subscribers of the optimistic update
    this.updatePosts();
    console.log('📢 Notified subscribers of optimistic update');

    const token = this.authService.getToken();
    console.log('🔑 Token retrieved:', token ? 'Present' : 'Missing');
    
    if (token) {
      const url = `http://localhost:8080/api/posts/${post.id}/like`;
      console.log('🌐 Making API call to:', url);
      
      this.http.post(url, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).subscribe({
        next: (response) => {
          console.log('✅ API response received:', response);
          // Update the post with the response from server
          if (response && typeof response === 'object') {
            Object.assign(post, response);
            console.log('🔄 Post updated with server response');
            this.updatePosts();
            console.log('📢 Notified subscribers of server update');
          }
        },
        error: (error) => {
          console.error('❌ API error:', error);
          // Revert optimistic update on error
          post.isLikedByCurrentUser = !post.isLikedByCurrentUser;
          post.likesCount = (post.likesCount || 0) + (post.isLikedByCurrentUser ? 1 : -1);
          console.log('↩️ Reverted local state due to error');
          this.updatePosts();
          console.log('📢 Notified subscribers of error revert');
        }
      });
    } else {
      console.log('❌ No token available, reverting local state');
      // Revert if no token
      post.isLikedByCurrentUser = !post.isLikedByCurrentUser;
      post.likesCount = (post.likesCount || 0) + (post.isLikedByCurrentUser ? 1 : -1);
      this.updatePosts();
      console.log('📢 Notified subscribers of no-token revert');
    }
  }

  /** Toggle like on a comment */
  toggleCommentLike(comment: PostComment): void {
    // Update local state immediately for better UX
    const wasLiked = comment.isLikedByCurrentUser;
    comment.isLikedByCurrentUser = !comment.isLikedByCurrentUser;
    comment.likesCount = (comment.likesCount || 0) + (comment.isLikedByCurrentUser ? 1 : -1);
    this.updatePosts();

    // Make API call to persist the change
    const token = this.authService.getToken();
    if (token) {
      this.http.post(`http://localhost:8080/api/comments/${comment.id}/like`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).subscribe({
        next: (response: any) => {
          // Update the like state based on server response
          if (response && typeof response.isLiked === 'boolean') {
            comment.isLikedByCurrentUser = response.isLiked;
            this.updatePosts();
          }
        },
        error: (error) => {
          console.error('Error toggling comment like:', error);
          // Revert local state on error
          comment.isLikedByCurrentUser = wasLiked;
          comment.likesCount = (comment.likesCount || 0) + (wasLiked ? 1 : -1);
          this.updatePosts();
        }
      });
    }
  }

  /** Add a comment to a post */
  addComment(post: Post, comment: PostComment): void {
    // Update local state immediately for better UX
    post.comments = post.comments || [];
    post.comments.push(comment);
    post.commentsCount = (post.commentsCount || 0) + 1;
    this.updatePosts();

    // Make API call to persist the comment
    const token = this.authService.getToken();
    if (token) {
      this.http.post(`http://localhost:8080/api/posts/${post.id}/comments`, {
        content: comment.content
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).subscribe({
        next: (response: any) => {
          // Update the comment with the server response if needed
          if (response && response.id) {
            comment.id = response.id;
            this.updatePosts();
          }
        },
        error: (error) => {
          console.error('Error adding comment:', error);
          // Remove the comment from local state on error
          post.comments = post.comments?.filter(c => c.id !== comment.id) || [];
          post.commentsCount = Math.max(0, (post.commentsCount || 1) - 1);
          this.updatePosts();
        }
      });
    }
  }

  /** Update BehaviorSubject */
  private updatePosts(): void {
    this.postsSubject.next([...this.posts]);
  }

  /** Sort posts by createdAt */
  private sortPosts(): void {
    this.posts.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    this.updatePosts();
  }



createPostOnServer(formData: FormData): Observable<Post> {
  const token = this.authService.getToken();
  console.log("token", token);

  return this.http.post<Post>(`http://localhost:8080/api/posts/CreatePost`, formData, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

}


}
