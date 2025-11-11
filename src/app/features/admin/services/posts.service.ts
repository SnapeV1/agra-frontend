import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import {map, switchMap, tap } from 'rxjs/operators';
import { Post } from '../../../core/models/post.module';
import { PostComment } from '../../../core/models/post-comment.module';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { UsersService } from '../services/users.service';
import { User } from '../../../core/models/user.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PostsService {
  private posts: Post[] = [];
  private postsSubject = new BehaviorSubject<Post[]>([]);
  posts$ = this.postsSubject.asObservable();

  private readonly baseApi = environment.apiBaseUrl;
  private readonly apiUrl = `${this.baseApi}/posts/sorted`;
  private usersIndex: Map<string, User> | null = null;
  constructor(private http: HttpClient,private authService: AuthService,
              private usersService: UsersService,
  ) {
    // When auth user changes (login/logout), re-apply liked flags from local cache
    this.authService.currentUser.subscribe(() => {
      this.applyLikedCacheToPosts();
    });
  }

  private getCurrentUserId(): string | null {
    try {
      return this.authService.currentUserValue?.user?.id || null;
    } catch {
      return null;
    }
  }

  private likedStorageKey(userId: string): string {
    return `liked_posts_${userId}`;
  }

  private loadLikedSet(userId: string): Set<string> {
    try {
      const raw = localStorage.getItem(this.likedStorageKey(userId));
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  }

  private saveLikedSet(userId: string, ids: Set<string>): void {
    try {
      localStorage.setItem(this.likedStorageKey(userId), JSON.stringify(Array.from(ids)));
    } catch {}
  }

  private applyLikedCacheToPosts(): void {
    if (!this.posts || this.posts.length === 0) return;
    const userId = this.getCurrentUserId();
    if (!userId) {
      // Logged out: clear liked UI flags
      this.posts = this.posts.map(p => ({ ...p, isLikedByCurrentUser: false }));
      this.updatePosts();
      return;
    }
    const likedSet = this.loadLikedSet(userId);
    const updated = this.posts.map(p => ({
      ...p,
      isLikedByCurrentUser: p.isLikedByCurrentUser === true ? true : likedSet.has(p.id)
    }));
    this.posts = updated;
    this.updatePosts();
  }
  /** Fetch all posts from backend */
  fetchPosts(): void {
    const token = this.authService.getToken();
    const options = token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};
    this.http.get<Post[]>(this.apiUrl, options)
      .pipe(
        map(posts => {
          const userId = this.getCurrentUserId();
          const likedSet = userId ? this.loadLikedSet(userId) : new Set<string>();
          return posts.map(post => {
            const normalized: Post = {
              ...post,
              createdAt: this.normalizeIsoUtc(post.createdAt),
              updatedAt: this.normalizeIsoUtc(post.updatedAt),
              comments: (post.comments || []).map(c => ({
                ...c,
                createdAt: this.normalizeIsoUtc(c.createdAt),
                updatedAt: this.normalizeIsoUtc(c.updatedAt),
                likesCount: c.likesCount || 0,
                isLikedByCurrentUser: c.isLikedByCurrentUser === true,
              } as PostComment)),
              // Use server flag if present; otherwise fall back to local cache
              isLikedByCurrentUser: (post as any).isLikedByCurrentUser === true
                ? true
                : (likedSet.has(post.id)),
              likesCount: post.likesCount || 0,
              commentsCount: post.commentsCount || 0,
              // Local UI flags (not in model)
              showComments: false,
              newComment: '',
              showDropdown: false
            } as Post;
            return normalized;
          });
        })
      )
      .subscribe({
        next: (data) => {
          this.posts = data;
          this.sortPosts();
          // Preload comments for posts that have them but arrived without embedded comments
          try {
            const toFetch = this.posts.filter(p => (p.commentsCount || 0) > 0 && (!p.comments || p.comments.length < (p.commentsCount || 0)));
            toFetch.forEach(p => this.loadCommentsForPost(p.id));
          } catch {}
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
      
      return;
    }

    const target = this.posts[index];
    const prevLiked = !!target.isLikedByCurrentUser;
    const prevLikes = target.likesCount || 0;
    const optimisticLiked = !prevLiked;
    

    // Optimistic update on the canonical post with clamped count
    target.isLikedByCurrentUser = optimisticLiked;
    target.likesCount = Math.max(0, prevLikes + (optimisticLiked ? 1 : -1));
    this.updatePosts();
    

    const token = this.authService.getToken();
    if (token) {
      const url = `${this.baseApi}/posts/${target.id}/like`;
      
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
              // Persist per-user liked state locally for refresh persistence
              const userId = this.getCurrentUserId();
              if (userId) {
                const set = this.loadLikedSet(userId);
                if (serverLiked) set.add(target.id); else set.delete(target.id);
                this.saveLikedSet(userId, set);
              }
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
              const userId = this.getCurrentUserId();
              if (userId) {
                const set = this.loadLikedSet(userId);
                if (serverLiked) set.add(target.id); else set.delete(target.id);
                this.saveLikedSet(userId, set);
              }
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
      this.http.post(`${this.baseApi}/comments/${comment.id}/like`, {}, {
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

  /** Fetch all comments for a post from backend and merge into local state */
  loadCommentsForPost(postId: string): void {
    const index = this.posts.findIndex(p => p.id === postId);
    if (index === -1) return;
    const token = this.authService.getToken();
    const url = `http://localhost:8080/api/posts/${postId}/comments`;
    const options = token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};
    this.http.get<PostComment[]>(url, options).pipe(
      switchMap((comments) => {
        const normalized = (comments || []).map(c => ({
          ...c,
          createdAt: this.normalizeIsoUtc(c.createdAt),
          updatedAt: this.normalizeIsoUtc(c.updatedAt),
          likesCount: c.likesCount || 0,
          isLikedByCurrentUser: c.isLikedByCurrentUser === true,
        } as PostComment));
        const needsEnrich = normalized.some(c => (!c.userInfo || !c.userInfo.picture) && !!c.userId);
        if (!needsEnrich) return of(normalized);
        return this.ensureUsersIndex().pipe(
          map(() => {
            const idx = this.usersIndex || new Map<string, User>();
            normalized.forEach(c => {
              if ((!c.userInfo || !c.userInfo.picture) && c.userId) {
                const u = idx.get(c.userId);
                if (u) c.userInfo = { ...u };
              }
            });
            return normalized;
          })
        );
      })
    ).subscribe({
      next: (normalized) => {
        this.posts[index].comments = normalized;
        this.posts[index].commentsCount = normalized.length;
        this.updatePosts();
      },
      error: () => {
        // Silently ignore; keep current local comments if any
      }
    });
  }

  private normalizeIsoUtc(input?: string): string | undefined {
    if (!input) return undefined;
    try {
      const hasTz = /Z|[+-]\d{2}:\d{2}$/.test(input);
      const iso = hasTz ? new Date(input) : new Date(input + 'Z');
      return isNaN(iso.getTime()) ? undefined : iso.toISOString();
    } catch {
      return undefined;
    }
  }

  private ensureUsersIndex(): Observable<void> {
    if (this.usersIndex) return of(void 0);
    return this.usersService.getAllUsers().pipe(
      tap((users: User[]) => {
        const mapIdx = new Map<string, User>();
        (users || []).forEach(u => { if (u?.id) mapIdx.set(u.id, u); });
        this.usersIndex = mapIdx;
      }),
      map(() => void 0)
    );
  }

  /** Add a comment to a post */
  addComment(post: Post, comment: PostComment): void {
    // Find the canonical post by id to avoid mutating caller's copy
    const index = this.posts.findIndex(p => p.id === post.id);
    if (index === -1) {
      
      return;
    }
    const target = this.posts[index];
    // Update local state immediately for better UX
    target.comments = target.comments || [];
    target.comments.push(comment);
    target.commentsCount = (target.commentsCount || 0) + 1;
    this.updatePosts();

    // Make API call to persist the comment
    const token = this.authService.getToken();
    if (token) {
      this.http.post(`${this.baseApi}/posts/${target.id}/comments`, {
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
          const idx = this.posts.findIndex(p => p.id === target.id);
          if (idx !== -1) {
            const t = this.posts[idx];
            t.comments = (t.comments || []).filter(c => c !== comment && c.id !== comment.id);
            t.commentsCount = Math.max(0, (t.commentsCount || 1) - 1);
          }
          this.updatePosts();
        }
      });
    }
  }

  /** Update BehaviorSubject */
  private updatePosts(): void {
    const snapshot = [...this.posts];
    this.postsSubject.next(snapshot);
    
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
  

  return this.http.post<Post>(`${this.baseApi}/posts/CreatePost`, formData, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

}


}
