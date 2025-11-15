import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Post } from '../../../core/models/post.module';
import { PostComment } from '../../../core/models/post-comment.module';
import { AuthService } from 'src/app/core/services/auth/auth.service';
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

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // When auth user changes (login/logout), re-apply liked flags from local cache
    this.authService.currentUser.subscribe(() => {
      this.applyLikedCacheToPosts();
    });
  }

  /* =====================================================
     ===============  USER / LIKE CACHE ==================
     ===================================================== */

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
    if (!this.posts.length) return;
    const userId = this.getCurrentUserId();
    if (!userId) {
      this.posts = this.posts.map(p => ({ ...p, isLikedByCurrentUser: false }));
      this.updatePosts();
      return;
    }
    const likedSet = this.loadLikedSet(userId);
    this.posts = this.posts.map(p => ({
      ...p,
      isLikedByCurrentUser: likedSet.has(p.id)
    }));
    this.updatePosts();
  }

  /* =====================================================
     ===============  FETCH POSTS ========================
     ===================================================== */

  fetchPosts(loadComments = true, commentLimit = 3): void {
    const token = this.authService.getToken();
    const options = token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};

    this.http.get<Post[]>(`${this.apiUrl}?loadComments=${loadComments}&commentLimit=${commentLimit}`, options)
      .pipe(
        map(posts => {
          const userId = this.getCurrentUserId();
          const likedSet = userId ? this.loadLikedSet(userId) : new Set<string>();
          return posts.map(post => this.normalizePost(post, likedSet));
        })
      )
      .subscribe({
        next: data => {
          this.posts = data;
          this.sortPosts();
        },
        error: err => {
          console.error('Failed to fetch posts:', err);
        }
      });
  }

  /* =====================================================
     ===============  CRUD (LOCAL STATE) =================
     ===================================================== */

  createPost(newPost: Post): void {
    this.posts.unshift(newPost);
    this.sortPosts();
  }

  editPost(updatedPost: Post): void {
    const index = this.posts.findIndex(p => p.id === updatedPost.id);
    if (index !== -1) {
      this.posts[index] = { ...this.posts[index], ...updatedPost };
      this.updatePosts();
    }
  }

  deletePost(postId: string): void {
    this.posts = this.posts.filter(p => p.id !== postId);
    this.updatePosts();
  }

  /* =====================================================
     ===============  LIKE HANDLING =======================
     ===================================================== */

  toggleLike(post: Post): void {
    const index = this.posts.findIndex(p => p.id === post.id);
    if (index === -1) return;

    const target = this.posts[index];
    const prevLiked = !!target.isLikedByCurrentUser;
    const prevLikes = target.likesCount || 0;
    const optimisticLiked = !prevLiked;

    target.isLikedByCurrentUser = optimisticLiked;
    target.likesCount = Math.max(0, prevLikes + (optimisticLiked ? 1 : -1));
    this.updatePosts();

    const token = this.authService.getToken();
    if (!token) {
      target.isLikedByCurrentUser = prevLiked;
      target.likesCount = prevLikes;
      this.updatePosts();
      return;
    }

    this.http.post(`${this.baseApi}/posts/${target.id}/like`, {}, {
      headers: { 'Authorization': `Bearer ${token}` },
      responseType: 'text' as 'json'
    }).subscribe({
      next: (response: any) => {
        const text = typeof response === 'string' ? response.toLowerCase() : '';
        let serverLiked: boolean | null = null;

        if (text.includes('unliked')) serverLiked = false;
        else if (text.includes('liked')) serverLiked = true;

        if (serverLiked !== null) {
          target.isLikedByCurrentUser = serverLiked;
          const userId = this.getCurrentUserId();
          if (userId) {
            const set = this.loadLikedSet(userId);
            serverLiked ? set.add(target.id) : set.delete(target.id);
            this.saveLikedSet(userId, set);
          }
        }
        this.updatePosts();
      },
      error: () => {
        target.isLikedByCurrentUser = prevLiked;
        target.likesCount = prevLikes;
        this.updatePosts();
      }
    });
  }

  toggleCommentLike(comment: PostComment): void {
    const wasLiked = comment.isLikedByCurrentUser;
    comment.isLikedByCurrentUser = !wasLiked;
    comment.likesCount = (comment.likesCount || 0) + (comment.isLikedByCurrentUser ? 1 : -1);
    this.updatePosts();

    const token = this.authService.getToken();
    if (!token) return;

    this.http.post(`${this.baseApi}/comments/${comment.id}/like`, {}, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      error: () => {
        comment.isLikedByCurrentUser = wasLiked;
        comment.likesCount = (comment.likesCount || 0) + (wasLiked ? 1 : -1);
        this.updatePosts();
      }
    });
  }

  /* =====================================================
     ===============  COMMENTS ===========================
     ===================================================== */

  loadCommentsForPost(postId: string): void {
    const index = this.posts.findIndex(p => p.id === postId);
    if (index === -1) return;

    const token = this.authService.getToken();
    const url = `${this.baseApi}/posts/${postId}/comments`;
    const options = token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};

    this.http.get<PostComment[]>(url, options).subscribe({
      next: comments => {
        const normalized = this.normalizeComments(comments);
        this.posts[index].comments = normalized;
        this.posts[index].commentsCount = normalized.length;
        this.updatePosts();
      },
      error: err => console.error('Failed to load comments:', err)
    });
  }

  addComment(post: Post, comment: PostComment): void {
    const index = this.posts.findIndex(p => p.id === post.id);
    if (index === -1) return;

    const target = this.posts[index];
    target.comments = target.comments || [];
    const normalizedComment = this.normalizeComment(comment);
    target.comments.push(normalizedComment);
    target.commentsCount = (target.commentsCount || 0) + 1;
    this.updatePosts();

    const token = this.authService.getToken();
    if (!token) return;

    this.http.post(`${this.baseApi}/posts/${target.id}/comments`, { content: comment.content }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).subscribe({
      next: (response: any) => {
        if (response && response.id) {
          normalizedComment.id = response.id;
          this.updatePosts();
        }
      },
      error: () => {
        const t = this.posts[index];
        t.comments = (t.comments || []).filter(c => c !== normalizedComment);
        t.commentsCount = Math.max(0, (t.commentsCount || 1) - 1);
        this.updatePosts();
      }
    });
  }

  /* =====================================================
     ===============  HELPERS ============================
     ===================================================== */

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

  private updatePosts(): void {
    this.postsSubject.next([...this.posts]);
  }

  private sortPosts(): void {
    this.posts.sort((a, b) =>
      new Date(b.createdAt ?? '').getTime() - new Date(a.createdAt ?? '').getTime()
    );
    this.updatePosts();
  }

  private normalizePost(raw: any, likedSet: Set<string>): Post {
    const normalizedComments = this.normalizeComments(raw?.comments);
    const normalizedUser = this.ensureUserAvatar(
      raw?.userInfo || raw?.user_info,
      raw?.author || raw?.userInfo?.name,
      raw?.authorImage || raw?.authorPicture
    );

    return {
      ...raw,
      userInfo: normalizedUser,
      createdAt: this.normalizeIsoUtc(raw?.createdAt),
      updatedAt: this.normalizeIsoUtc(raw?.updatedAt),
      isLikedByCurrentUser: raw?.isLikedByCurrentUser === true || likedSet.has(raw?.id),
      likesCount: raw?.likesCount || 0,
      commentsCount: raw?.commentsCount || normalizedComments.length,
      comments: normalizedComments,
      showComments: false,
      newComment: '',
      showDropdown: false
    } as Post;
  }

  private normalizeComments(comments?: PostComment[]): PostComment[] {
    return (comments || [])
      .filter((comment): comment is PostComment => !!comment)
      .map(comment => this.normalizeComment(comment));
  }

  private normalizeComment(comment?: PostComment): PostComment {
    const base = comment || ({} as PostComment);
    const normalizedUser = this.ensureUserAvatar(
      (base as any)?.userInfo || (base as any)?.user_info,
      (base as any)?.userInfo?.name || (base as any)?.author,
      (base as any)?.userInfo?.picture
    );

    return {
      ...base,
      userInfo: normalizedUser,
      createdAt: this.normalizeIsoUtc(base?.createdAt),
      updatedAt: this.normalizeIsoUtc(base?.updatedAt),
      likesCount: base?.likesCount || 0,
      isLikedByCurrentUser: base?.isLikedByCurrentUser === true
    };
  }

  private ensureUserAvatar(userInfo?: any, fallbackName?: string, fallbackImage?: string): any {
    const normalized = { ...(userInfo || {}) };
    const name = (normalized.name || fallbackName || 'Community Member').toString().trim() || 'Community Member';
    const imageCandidate = this.cleanImageSource(
      normalized.picture ||
      normalized.photo ||
      normalized.photoUrl ||
      normalized.image ||
      normalized.avatar ||
      normalized.profilePicture ||
      fallbackImage
    );

    normalized.name = name;
    normalized.picture = imageCandidate || this.avatarFromName(name);

    return normalized;
  }

  private cleanImageSource(value?: string | null): string | undefined {
    if (value === null || value === undefined) return undefined;
    const parsed = String(value).trim();
    if (!parsed) return undefined;
    const lower = parsed.toLowerCase();
    if (lower === 'null' || lower === 'undefined') return undefined;
    return parsed;
  }

  private avatarFromName(name?: string): string {
    const safe = encodeURIComponent((name || 'Member').trim() || 'Member');
    return `https://ui-avatars.com/api/?name=${safe}&background=8FB03D&color=ffffff&bold=true`;
  }

  /* =====================================================
     ===============  POST CREATION ======================
     ===================================================== */

  createPostOnServer(formData: FormData): Observable<Post> {
    const token = this.authService.getToken();
    return this.http.post<Post>(`${this.baseApi}/posts/CreatePost`, formData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
}
