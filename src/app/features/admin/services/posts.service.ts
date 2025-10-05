import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import {map } from 'rxjs/operators';
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
    const token = this.authService.getToken();
    const options = token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};
    this.http.get<Post[]>(this.apiUrl, options)
      .pipe(
        map(posts => {
          return posts.map(post => ({
            ...post,
            createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : undefined,
            updatedAt: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
            comments: post.comments || [],
            // Trust server-provided liked flag; default to false if absent
            isLikedByCurrentUser: post.isLikedByCurrentUser === true,
            likesCount: post.likesCount || 0,
            commentsCount: post.commentsCount || 0,
            // Local UI flags (not in model)
            showComments: false,
            newComment: '',
            showDropdown: false
          }));
        })
      )
      .subscribe({
        next: (data) => {
          this.posts = data;
          this.sortPosts();
        },
        error: () => {
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
    // Find the canonical post inside the service's state
    const index = this.posts.findIndex(p => p.id === post.id);
    if (index === -1) {
      // If not found, do nothing to avoid inconsistent state
      console.warn('[PostsService] toggleLike: post not found', { id: post?.id });
      return;
    }

    const target = this.posts[index];
    const prevLiked = !!target.isLikedByCurrentUser;
    const prevLikes = target.likesCount || 0;
    const optimisticLiked = !prevLiked;
    console.log('[PostsService] toggleLike start', { id: target.id, prevLiked, prevLikes, optimisticLiked });

    // Optimistic update on the canonical post with clamped count
    target.isLikedByCurrentUser = optimisticLiked;
    target.likesCount = Math.max(0, prevLikes + (optimisticLiked ? 1 : -1));
    this.updatePosts();
    console.log('[PostsService] toggleLike optimistic', { id: target.id, isLikedByCurrentUser: target.isLikedByCurrentUser, likesCount: target.likesCount });

    const token = this.authService.getToken();
    if (token) {
      const url = `http://localhost:8080/api/posts/${target.id}/like`;
      console.log('[PostsService] toggleLike request', { url, hasToken: !!token });
      this.http.post(url, {}, {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'text' as 'json'
      }).subscribe({
        next: (response: any) => {
          // Handle plain text responses like "Post liked!" / "Post unliked!"
          if (typeof response === 'string') {
            const text = response;
            const normalized = text.toLowerCase();
            let serverLiked: boolean | null = null;
            // Check 'unliked' BEFORE 'liked' to avoid substring collision
            if (normalized.includes('unliked')) {
              serverLiked = false;
            } else if (normalized.includes('liked')) {
              serverLiked = true;
            }
            if (serverLiked !== null) {
              // If server contradicts optimistic, reconcile likesCount accordingly
              if (serverLiked !== optimisticLiked) {
                const current = target.likesCount ?? 0;
                target.likesCount = Math.max(0, current + (serverLiked ? 1 : -1));
              }
              target.isLikedByCurrentUser = serverLiked;
            }
            this.updatePosts();
          } else if (response && typeof response === 'object') {
            // Sync with server response if provided as JSON
            if (typeof response.isLikedByCurrentUser === 'boolean') {
              const serverLiked = response.isLikedByCurrentUser;
              // If server contradicts optimistic and no explicit likesCount, reconcile
              if (typeof response.likesCount !== 'number' && serverLiked !== optimisticLiked) {
                const current = target.likesCount ?? 0;
                target.likesCount = Math.max(0, current + (serverLiked ? 1 : -1));
              }
              target.isLikedByCurrentUser = serverLiked;
            }
            if (typeof response.likesCount === 'number') {
              target.likesCount = response.likesCount;
            }
            this.updatePosts();
          }
        },
        error: (error) => {
          // Revert optimistic update on error
          target.isLikedByCurrentUser = prevLiked;
          target.likesCount = prevLikes;
          this.updatePosts();
        }
      });
    } else {
      // Revert if no token
      target.isLikedByCurrentUser = prevLiked;
      target.likesCount = prevLikes;
      this.updatePosts();
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
    const snapshot = [...this.posts];
    this.postsSubject.next(snapshot);
    console.log('[PostsService] updatePosts emit', { count: snapshot.length, ids: snapshot.map(p => p.id) });
  }

  /** Sort posts by createdAt */
  private sortPosts(): void {
    this.posts.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    this.updatePosts();
    console.log('[PostsService] sortPosts applied', { count: this.posts.length });
  }



createPostOnServer(formData: FormData): Observable<Post> {
  const token = this.authService.getToken();
  

  return this.http.post<Post>(`http://localhost:8080/api/posts/CreatePost`, formData, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

}


}
