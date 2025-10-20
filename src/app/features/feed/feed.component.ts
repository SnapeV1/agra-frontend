import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { NewsService, NewsArticle } from 'src/app/core/services/news.service';
import { Post } from '../../core/models/post.module';
import { PostsService } from '../admin/services/posts.service';
import { AuthUser } from '../../core/models/auth-user.model';
import { PostComment } from '../../core/models/post-comment.module';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-feed',
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.css']
})
export class FeedComponent implements OnInit, OnDestroy {
  posts: Post[] = [];
  loading: boolean = false;
  errorMessage: string = '';
  // News sidebars
  leftNews: NewsArticle[] = [];
  rightNews: NewsArticle[] = [];
  leftNewsLimit: number = 5;
  rightNewsLimit: number = 5;
  newsLoading: boolean = false;
  newsError: string = '';
  
  // Authentication state
  currentAuthUser: AuthUser | null = null;
  currentUser: User | null = null;
  isAuthenticated: boolean = false;
  private subscriptions = new Subscription();

  constructor(
    private authService: AuthService,
    private postsService: PostsService,
    private newsService: NewsService
  ) {}

  ngOnInit(): void {
    this.initializeAuthentication();
    this.loadPosts();
    this.loadNews();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeAuthentication(): void {
    this.subscriptions.add(
      this.authService.currentUser.subscribe(authUser => {
        this.currentAuthUser = authUser;
        this.isAuthenticated = !!authUser;
        
        if (authUser) {
          this.currentUser = authUser.user || null;
        } else {
          this.currentUser = null;
        }
      })
    );

    this.subscriptions.add(
      this.authService.isAuthenticated$.subscribe(isAuth => {
        this.isAuthenticated = isAuth;
      })
    );
  }

  private loadPosts(): void {
    this.loading = true;
    this.errorMessage = '';

    this.subscriptions.add(
      this.postsService.posts$.subscribe({
        next: posts => {
          // Update existing posts or create new ones, preserving UI state
          const updatedPosts = posts.map(servicePost => {
            // Find existing post to preserve UI-only state like showComments/newComment
            const existingPost = this.posts.find(p => p.id === servicePost.id);
            return {
              ...servicePost,
              // Keep comments as provided by service to match template bindings
              comments: servicePost.comments || [],
              // Preserve UI state from existing post
              showComments: existingPost?.showComments || servicePost.showComments || false,
              // Always reset the composer after updates to avoid stale text lingering
              newComment: ''
            };
          });
          // Debug: log commenter userInfo to inspect picture field presence
          try {
            updatedPosts.forEach(p => (p.comments || []).forEach((c: any) => {
              // Only log when picture missing or load issues suspected
              if (!c?.userInfo?.picture) {
                console.log('[Feed] comment.userInfo (no picture)', c?.userInfo, 'commentId=', c?.id, 'postId=', p.id);
              }
            }));
          } catch {}
          
          this.posts = updatedPosts;
          this.loading = false;
        },
        error: error => {
          this.errorMessage = 'Failed to load posts. Please try again later.';
          this.loading = false;
        }
      })
    );

    this.postsService.fetchPosts();
  }

  private loadNews(): void {
    this.newsLoading = true;
    this.newsError = '';

    const sub = this.newsService.getAllNews().subscribe({
      next: (articles) => {
        // Simple split: first half left, second half right
        const cleaned = (articles || []).filter(a => !!a && !!a.title);
        const half = Math.ceil(cleaned.length / 2);
        this.leftNews = cleaned.slice(0, half);
        this.rightNews = cleaned.slice(half);
        this.newsLoading = false;
      },
      error: () => {
        this.newsError = 'Failed to load news.';
        this.newsLoading = false;
      }
    });
    this.subscriptions.add(sub);
  }

  showMoreLeft(): void {
    this.leftNewsLimit = this.leftNews.length;
  }

  showMoreRight(): void {
    this.rightNewsLimit = this.rightNews.length;
  }

  private getDefaultUser(): User {
    return {
      id: 'default-id',
      name: 'Unknown User',
      picture: 'default-avatar.png',
      email: 'unknown@domain.com',
      role: 'user',
      registeredAt: new Date().toISOString(),
      archived: false
    };
  }

  toggleLike(post: any): void {
    if (!this.isAuthenticated) {
      return;
    }

    const postIndex = this.posts.findIndex(p => p.id === post.id);

    if (postIndex !== -1) {
      const target = this.posts[postIndex];
      // Delegate optimistic update to service to avoid double increments/decrements
      this.postsService.toggleLike(target);
    } else {
      // If not found, no-op
    }
  }

  toggleCommentLike(comment: any): void {
    if (!this.isAuthenticated) {
      alert('Please log in to like comments');
      return;
    }

    for (const post of this.posts) {
      const commentIndex = post.comments?.findIndex(c => c.id === comment.id);
      if (commentIndex !== undefined && commentIndex !== -1 && post.comments) {
        const originalComment = post.comments[commentIndex];
        // Delegate to service only; avoid local double updates
        this.postsService.toggleCommentLike(originalComment);
        break;
      }
    }
  }

  toggleComments(post: any): void {
    post.showComments = !post.showComments;
    
    const postIndex = this.posts.findIndex(p => p.id === post.id);
    if (postIndex !== -1) {
      this.posts[postIndex].showComments = post.showComments;
      if (post.showComments) {
        const p = this.posts[postIndex];
        const needsFetch = !p.comments || ((p.commentsCount || 0) > (p.comments?.length || 0));
        if (needsFetch) {
          this.postsService.loadCommentsForPost(p.id);
        }
      }
    }
  }

  addComment(post: any): void {
    if (!this.isAuthenticated || !this.currentUser) {
      alert('Please log in to comment');
      return;
    }

    if (post.newComment && post.newComment.trim()) {
      const postIndex = this.posts.findIndex(p => p.id === post.id);
      if (postIndex !== -1) {
        const originalPost = this.posts[postIndex];
        
        const newComment: PostComment = {
          id: Date.now().toString(),
          postId: originalPost.id,
          userId: this.currentUser.id.toString(),
          userInfo: this.currentUser,
          content: post.newComment.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          likesCount: 0,
          isLikedByCurrentUser: false,
          replies: []
        };

        this.postsService.addComment(originalPost, newComment);
        post.newComment = '';
        post.showComments = true;
      }
    }
  }



  getTimeAgo(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return 'Unknown time';

    let date: Date;
    if (typeof dateInput === 'string') {
      date = new Date(dateInput);
      if (isNaN(date.getTime())) return 'Invalid date';
    } else if (dateInput instanceof Date) {
      date = dateInput;
      if (isNaN(date.getTime())) return 'Invalid date';
    } else {
      return 'Unknown time';
    }

    // Compute difference without hardcoded timezone offsets
    let diffInMilliseconds = Date.now() - date.getTime();

    if (diffInMilliseconds < 0) diffInMilliseconds = 0;

    const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    if (diffInDays < 2) return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;

    return date.toLocaleDateString();
  }

  onCommentKeyPress(event: KeyboardEvent, post: any): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.addComment(post);
    }
  }

  // Image error handler to log userInfo when avatar fails to load
  onCommentAvatarError(comment: any): void {
    try {
      console.warn('[Feed] comment avatar failed to load', { userInfo: comment?.userInfo, commentId: comment?.id });
    } catch {}
  }

  canInteract(): boolean {
    return this.isAuthenticated && this.currentUser !== null;
  }

  trackByPostId(index: number, post: any): string {
    return post.id;
  }

  onLikeHover(post: any): void {
    // No-op: hover state handled purely by CSS
  }

  onLikeLeave(post: any): void {
    // No-op: hover state handled purely by CSS
  }
}
