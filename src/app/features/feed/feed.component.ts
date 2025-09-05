import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth/auth.service';
import { Post } from './post/post.module';
import { PostsService } from '../admin/services/posts.service';
import { AuthUser } from '../auth/models/auth-user.model';
import { PostComment } from './post-comment/post-comment.module';
import { User } from '../user/models/user.model';

@Component({
  selector: 'app-feed',
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.css']
})
export class FeedComponent implements OnInit, OnDestroy {
  posts: Post[] = [];
  loading: boolean = false;
  errorMessage: string = '';
  
  // Authentication state
  currentAuthUser: AuthUser | null = null;
  currentUser: User | null = null;
  isAuthenticated: boolean = false;
  private subscriptions = new Subscription();

  constructor(
    private authService: AuthService,
    private postsService: PostsService
  ) {}

  ngOnInit(): void {
    this.initializeAuthentication();
    this.loadPosts();
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
          this.posts = posts.map(post => ({
            ...post,
            user: post.userInfo,
            content: post.content || '',
            image: post.imageUrl,
            timestamp: post.createdAt ? new Date(post.createdAt) : new Date(),
            likes: post.likesCount || 0,
            isLiked: post.isLikedByCurrentUser || false,
            comments: (post.comments || []).map(comment => ({
              id: comment.id,
              user: comment.userInfo ? comment.userInfo : this.getDefaultUser(),
              content: comment.content,
              timestamp: comment.createdAt ? new Date(comment.createdAt) : new Date(),
              likes: comment.likesCount || 0,
              isLiked: comment.isLikedByCurrentUser || false
            })),
            showComments: post.showComments || false,
            newComment: post.newComment || ''
          }));
          this.loading = false;
        },
        error: error => {
          console.error('Error loading posts:', error);
          this.errorMessage = 'Failed to load posts. Please try again later.';
          this.loading = false;
        }
      })
    );

    this.postsService.fetchPosts();
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
      alert('Please log in to like posts');
      return;
    }

    const postIndex = this.posts.findIndex(p => p.id === post.id);
    if (postIndex !== -1) {
      const originalPost = this.posts[postIndex];
      this.postsService.toggleLike(originalPost);
      
      post.isLiked = !post.isLiked;
      post.likes += post.isLiked ? 1 : -1;
    }
  }

  toggleCommentLike(comment: any): void {
    if (!this.isAuthenticated) {
      alert('Please log in to like comments');
      return;
    }

    for (const post of this.posts) {
      const commentIndex = post.comments?.findIndex(c => c.id === comment.id);
      if (commentIndex !== -1 && post.comments) {
        const originalComment = post.comments[2];
        this.postsService.toggleCommentLike(originalComment);
        
        comment.isLiked = !comment.isLiked;
        comment.likes += comment.isLiked ? 1 : -1;
        break;
      }
    }
  }

  toggleComments(post: any): void {
    post.showComments = !post.showComments;
    
    const postIndex = this.posts.findIndex(p => p.id === post.id);
    if (postIndex !== -1) {
      this.posts[postIndex].showComments = post.showComments;
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
        
        const displayComment = {
          id: newComment.id,
          user: this.currentUser,
          content: newComment.content,
          timestamp: new Date(),
          likes: 0,
          isLiked: false
        };
        
        post.comments.push(displayComment);
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

    const nowUtc = Date.now();
    let diffInMilliseconds = nowUtc - date.getTime() - 3600000;

    if (diffInMilliseconds < 0) diffInMilliseconds = 0;

    const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) return diffInSeconds <= 1 ? 'Just now' : `${diffInSeconds}s ago`;
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  }

  onCommentKeyPress(event: KeyboardEvent, post: any): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.addComment(post);
    }
  }

  canInteract(): boolean {
    return this.isAuthenticated && this.currentUser !== null;
  }
}
