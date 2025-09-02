import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth/auth.service';
import { AuthUser } from 'src/app/features/auth/models/auth-user.model';

interface User {
  id: number;
  name: string;
  username: string;
  avatar: string;
}

interface Comment {
  id: number;
  user: User;
  content: string;
  timestamp: Date;
  likes: number;
  isLiked: boolean;
}

interface Post {
  id: number;
  user: User;
  content: string;
  image?: string;
  timestamp: Date;
  likes: number;
  isLiked: boolean;
  comments: Comment[];
  showComments: boolean;
  newComment: string;
}

interface CreatePostForm {
  content: string;
  image: string;
}

@Component({
  selector: 'app-admin-posts',
  templateUrl: './admin-posts.component.html',
  styleUrls: ['./admin-posts.component.css']
})
export class AdminPostsComponent implements OnInit, OnDestroy {
  posts: Post[] = [];
  loading: boolean = false;
  errorMessage: string = '';
  
  currentAuthUser: AuthUser | null = null;
  currentUser: User | null = null;
  isAuthenticated: boolean = false;
  private authSubscription: Subscription = new Subscription();

  showCreateForm: boolean = false;
  editingPost: Post | null = null;
  createForm: CreatePostForm = {
    content: '',
    image: ''
  };

  showDeleteModal: boolean = false;
  postToDelete: Post | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.initializeAuthentication();
    this.loadPosts();
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe();
  }

  private initializeAuthentication(): void {
    this.authSubscription.add(
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
    const index = this.generateUserIdFromEmail(email) % avatars.length;
    return avatars[index];
  }

  loadPosts(): void {
    this.loading = true;
    // Simulate loading delay
    setTimeout(() => {
      this.posts = [
        {
          id: 1,
          user: {
            id: 2,
            name: 'Sarah Johnson',
            username: '@sarahj',
            avatar: 'https://images.unsplash.com/photo-1494790108755-2616b332c5f2?w=40&h=40&fit=crop&crop=face'
          },
          content: 'Just launched my new project! 🚀 Excited to share this journey with you all.',
          image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&h=300&fit=crop',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          likes: 24,
          isLiked: false,
          comments: [],
          showComments: false,
          newComment: ''
        },
        {
          id: 2,
          user: {
            id: 4,
            name: 'Alex Rivera',
            username: '@alexr',
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face'
          },
          content: 'Beautiful sunset from my office window today. 🌅',
          image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
          likes: 42,
          isLiked: true,
          comments: [],
          showComments: false,
          newComment: ''
        }
      ];
      this.loading = false;
    }, 500);
  }

  // Create Post Methods
  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      this.resetCreateForm();
    }
  }

  resetCreateForm(): void {
    this.createForm = {
      content: '',
      image: ''
    };
  }

  createPost(): void {
    if (!this.currentUser || !this.createForm.content.trim()) {
      return;
    }

    const newPost: Post = {
      id: Date.now(),
      user: this.currentUser,
      content: this.createForm.content.trim(),
      image: this.createForm.image.trim() || undefined,
      timestamp: new Date(),
      likes: 0,
      isLiked: false,
      comments: [],
      showComments: false,
      newComment: ''
    };

    this.posts.unshift(newPost);
    this.resetCreateForm();
    this.showCreateForm = false;
  }

  // Edit Post Methods
  startEdit(post: Post): void {
    this.editingPost = { ...post };
  }

  cancelEdit(): void {
    this.editingPost = null;
  }

  saveEdit(): void {
    if (!this.editingPost || !this.editingPost.content.trim()) {
      return;
    }

    const index = this.posts.findIndex(p => p.id === this.editingPost!.id);
    if (index !== -1) {
      this.posts[index] = {
        ...this.posts[index],
        content: this.editingPost.content.trim(),
        image: this.editingPost.image?.trim() || undefined
      };
    }

    this.editingPost = null;
  }

  // Delete Post Methods
  confirmDelete(post: Post): void {
    this.postToDelete = post;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.postToDelete = null;
    this.showDeleteModal = false;
  }

  deletePost(): void {
    if (!this.postToDelete) return;

    const index = this.posts.findIndex(p => p.id === this.postToDelete!.id);
    if (index !== -1) {
      this.posts.splice(index, 1);
    }

    this.cancelDelete();
  }

  // Utility Methods
  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInDays < 7) return `${diffInDays}d`;

    return date.toLocaleDateString();
  }

  toggleComments(post: Post): void {
    post.showComments = !post.showComments;
  }

  isEditing(post: Post): boolean {
    return this.editingPost?.id === post.id;
  }
}