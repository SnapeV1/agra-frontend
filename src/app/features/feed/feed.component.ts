import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth/auth.service';
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
          // Update existing posts or create new ones, preserving UI state
          const updatedPosts = posts.map(servicePost => {
            // Find existing post to preserve UI state like showComments, newComment
            const existingPost = this.posts.find(p => p.id === servicePost.id);
            
            return {
              ...servicePost,
              user: servicePost.userInfo,
              content: servicePost.content || '',
              image: servicePost.imageUrl,
              timestamp: servicePost.createdAt ? new Date(servicePost.createdAt) : new Date(),
              likes: servicePost.likesCount || 0,
              isLiked: servicePost.isLikedByCurrentUser || false,
              comments: (servicePost.comments || []).map(comment => ({
                id: comment.id,
                user: comment.userInfo ? comment.userInfo : this.getDefaultUser(),
                content: comment.content,
                timestamp: comment.createdAt ? new Date(comment.createdAt) : new Date(),
                likes: comment.likesCount || 0,
                isLiked: comment.isLikedByCurrentUser || false
              })),
              // Preserve UI state from existing post
              showComments: existingPost?.showComments || servicePost.showComments || false,
              newComment: existingPost?.newComment || servicePost.newComment || ''
            };
          });
          
          this.posts = updatedPosts;
          this.loading = false;
          console.log('🔄 Feed component updated posts from service');
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
    console.log('🎯 Feed Component - toggleLike called for post:', post.id);
    console.log('🔐 Authentication status:', this.isAuthenticated);
    
    if (!this.isAuthenticated) {
      console.log('❌ User not authenticated, showing alert');
      alert('Please log in to like posts');
      return;
    }

    console.log('📋 Looking for post in posts array...');
    const postIndex = this.posts.findIndex(p => p.id === post.id);
    console.log('📍 Post index found:', postIndex);
    
    if (postIndex !== -1) {
      const originalPost = this.posts[postIndex];
      console.log('📄 Original post found:', originalPost.id, 'isLiked:', originalPost.isLikedByCurrentUser);
      console.log('🎯 Calling postsService.toggleLike...');
      
      this.postsService.toggleLike(originalPost);
      
      console.log('✅ Service will handle state updates via subscription');
      // Remove local state updates - let the service handle it via subscription
    } else {
      console.log('❌ Post not found in posts array');
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
