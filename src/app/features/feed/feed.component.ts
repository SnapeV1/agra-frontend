import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth/auth.service';
import { Post } from './post/post.module';
import { PostsService } from '../admin/services/posts.service';
import { AuthUser } from '../auth/models/auth-user.model';
import { PostComment } from './post-comment/post-comment.module';


interface User {
  id: number;
  name: string;
  username: string;
  avatar: string;
}

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
          this.currentUser = {
            id: this.generateUserIdFromEmail(authUser.user.email),
            name: authUser.user.name || this.extractNameFromEmail(authUser.user.email),
            username: '@' + authUser.user.email.split('@')[0],
            avatar: this.generateAvatarUrl(authUser.user.email)
          };
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

    // Subscribe to posts from the service
    this.subscriptions.add(
      this.postsService.posts$.subscribe({
        next: posts => {
          this.posts = posts.map(post => ({
            ...post,
            user: post.userInfo ? {
              id: parseInt(post.userInfo.id),
              name: post.userInfo.name,
              username: post.userInfo.name || '@' + post.userInfo.email?.split('@')[0] || '@user',
              avatar: post.userInfo.picture || this.generateAvatarUrl(post.userInfo.email || '')
            } : this.getDefaultUser(),
            content: post.content || '',
            image: post.imageUrl,
            timestamp: post.createdAt ? new Date(post.createdAt) : new Date(),
            likes: post.likesCount || 0,
            isLiked: post.isLikedByCurrentUser || false,
            comments: (post.comments || []).map(comment => ({
              id: (comment.id),
              user: comment.userInfo ? {
                id: parseInt(comment.userInfo.id),
                name: comment.userInfo.name,
                username: comment.userInfo.name || '@' + comment.userInfo.email?.split('@')[0] || '@user',
                avatar: comment.userInfo.picture || this.generateAvatarUrl(comment.userInfo.email || '')
              } : this.getDefaultUser(),
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

    // Fetch posts from server
    this.postsService.fetchPosts();
  }

  private getDefaultUser(): User {
    return {
      id: 0,
      name: 'Unknown User',
      username: '@unknown',
      avatar: 'https://via.placeholder.com/40x40/cccccc/666666?text=?'
    };
  }

  private generateUserIdFromEmail(email: string): number {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; 
    }
    return Math.abs(hash);
  }

  private extractNameFromEmail(email: string): string {
    const localPart = email.split('@')[0];
    return localPart.charAt(0).toUpperCase() + localPart.slice(1).replace(/[._]/g, ' ');
  }

  private generateAvatarUrl(email: string): string {
    const avatars = [
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1494790108755-2616b332c5f2?w=40&h=40&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face'
    ];
    const index = email ? this.generateUserIdFromEmail(email) % avatars.length : 0;
    return avatars[index];
  }

  toggleLike(post: any): void {
    if (!this.isAuthenticated) {
      alert('Please log in to like posts');
      return;
    }

    // Find the corresponding Post object and update it
    const postIndex = this.posts.findIndex(p => p.id === post.id);
    if (postIndex !== -1) {
      const originalPost = this.posts[postIndex];
      this.postsService.toggleLike(originalPost);
      
      // Update local display
      post.isLiked = !post.isLiked;
      post.likes += post.isLiked ? 1 : -1;
    }
  }

  toggleCommentLike(comment: any): void {
    if (!this.isAuthenticated) {
      alert('Please log in to like comments');
      return;
    }

    // Find the corresponding comment and update it
    for (const post of this.posts) {
      const commentIndex = post.comments?.findIndex(c => c.id === comment.id);
      if (commentIndex !== -1 && commentIndex !== undefined && post.comments) {
        const originalComment = post.comments[commentIndex];
        this.postsService.toggleCommentLike(originalComment);
        
        // Update local display
        comment.isLiked = !comment.isLiked;
        comment.likes += comment.isLiked ? 1 : -1;
        break;
      }
    }
  }

  toggleComments(post: any): void {
    post.showComments = !post.showComments;
    
    // Update the original post object
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
      // Find the original post
      const postIndex = this.posts.findIndex(p => p.id === post.id);
      if (postIndex !== -1) {
        const originalPost = this.posts[postIndex];
        
        // Create new comment in service format
        const newComment: PostComment = {
          id: Date.now().toString(),
          postId: originalPost.id,
          userId: this.currentUser.id.toString(),
          userInfo: {
            id: this.currentUser.id.toString(),
            name: this.currentUser.name,
            email: this.currentAuthUser?.user.email || '',
            picture: this.currentUser.avatar,
            role: this.currentAuthUser?.user.role || 'user',
            registeredAt: new Date().toISOString(),
            archived: false
          },
          content: post.newComment.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          likesCount: 0,
          isLikedByCurrentUser: false,
          replies: []
        };

        this.postsService.addComment(originalPost, newComment);
        
        // Update local display
        const displayComment = {
          id: (newComment.id),
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


// Add this to debug timezone issues
debugTimezone() {
  const now = new Date();
  console.log('=== TIMEZONE DEBUG ===');
  console.log('Local time:', now.toString());
  console.log('UTC time:', now.toISOString());
  console.log('Timezone offset (minutes):', now.getTimezoneOffset());
  console.log('Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.log('Timestamp when posting:', now.getTime());
  console.log('=====================');
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

  // ✅ Subtract 1 hour (3600000 ms) to fix Tunisia offset issue
  let diffInMilliseconds = nowUtc - date.getTime() - 3600000;

  // Prevent negative diffs in edge cases
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

  // Method to check if user can interact with posts
  canInteract(): boolean {
    return this.isAuthenticated && this.currentUser !== null;
  }
}