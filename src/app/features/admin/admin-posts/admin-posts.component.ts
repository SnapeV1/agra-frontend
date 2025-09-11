import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { AuthUser } from 'src/app/core/models/auth-user.model';
import { User } from '../../../core/models/user.model';
import { PostsService } from '../services/posts.service';
import { Post } from '../../../core/models/post.module';
import { PostComment } from '../../../core/models/post-comment.module';

interface CreatePostForm {
  content: string;
  imageFile: File | null;
  imagePreview: string;
}

@Component({
  selector: 'app-admin-posts',
  templateUrl: './admin-posts.component.html',
  styleUrls: ['./admin-posts.component.css']
})
export class AdminPostsComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('editFileInput') editFileInput!: ElementRef<HTMLInputElement>;

  posts: Post[] = [];
  loading = false;
  errorMessage = '';
  isCreatingPost = false; 
  currentAuthUser: AuthUser | null = null;
  currentUser: User | null = null;
  isAuthenticated = false;
  private subscriptions = new Subscription();

  showCreateForm = false;
  showImageInput = false;
  editingPost: Post | null = null;
  editingImageFile: File | null = null;
  editingImagePreview: string = '';
  createForm: CreatePostForm = { content: '', imageFile: null, imagePreview: '' };

  showDeleteModal = false;
  postToDelete: Post | null = null;

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
    // Clean up object URLs to prevent memory leaks
    if (this.createForm.imagePreview) {
      URL.revokeObjectURL(this.createForm.imagePreview);
    }
    if (this.editingImagePreview) {
      URL.revokeObjectURL(this.editingImagePreview);
    }
  }

  private initializeAuthentication(): void {
    this.subscriptions.add(
      this.authService.currentUser.subscribe(authUser => {
        this.currentAuthUser = authUser;
        this.isAuthenticated = !!authUser;

        if (authUser) {
          this.currentUser = {
            id: this.generateUserIdFromEmail(authUser.user.email).toString(),
            name: authUser.user.name || this.extractNameFromEmail(authUser.user.email),
            email: authUser.user.email,
            role: authUser.user.role,
            registeredAt: authUser.user.registeredAt,
            archived: authUser.user.archived
          };
        } else {
          this.currentUser = null;
        }
      })
    );
  }

  private loadPosts(): void {
    this.loading = true;
    this.errorMessage = '';

    // Subscribe to posts
    this.subscriptions.add(
      this.postsService.posts$.subscribe({
        next: posts => {
          this.posts = posts;
          this.sortPostsByDate();
          this.loading = false;
        },
        error: error => {
          console.error('Error loading posts:', error);
          this.errorMessage = 'Failed to load posts. Please try again later.';
          this.loading = false;
        }
      })
    );

    // Trigger posts fetch
    this.postsService.fetchPosts();
  }

  private sortPostsByDate(): void {
    this.posts = this.posts.sort((a, b) => {
      const dateA = new Date(a.createdAt!).getTime();
      const dateB = new Date(b.createdAt!).getTime();
      return dateB - dateA; // Newest first (descending order)
    });
  }

  // Create Post Methods
  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) this.resetCreateForm();
  }

  resetCreateForm(): void {
    if (this.createForm.imagePreview) {
      URL.revokeObjectURL(this.createForm.imagePreview);
    }
    this.createForm = { content: '', imageFile: null, imagePreview: '' };
    this.showImageInput = false;
    this.isCreatingPost = false;
    
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  toggleImageInput(): void {
    this.showImageInput = !this.showImageInput;
    if (!this.showImageInput) {
      this.removeImage();
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        input.value = '';
        return;
      }
      
      // Validate file size (e.g., max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        alert('File size must be less than 5MB.');
        input.value = '';
        return;
      }

      // Clean up previous preview
      if (this.createForm.imagePreview) {
        URL.revokeObjectURL(this.createForm.imagePreview);
      }

      this.createForm.imageFile = file;
      this.createForm.imagePreview = URL.createObjectURL(file);
    }
  }

  onEditFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        input.value = '';
        return;
      }
      
      // Validate file size (e.g., max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        alert('File size must be less than 5MB.');
        input.value = '';
        return;
      }

      // Clean up previous preview
      if (this.editingImagePreview) {
        URL.revokeObjectURL(this.editingImagePreview);
      }

      this.editingImageFile = file;
      this.editingImagePreview = URL.createObjectURL(file);
    }
  }

  removeImage(): void {
    if (this.createForm.imagePreview) {
      URL.revokeObjectURL(this.createForm.imagePreview);
    }
    this.createForm.imageFile = null;
    this.createForm.imagePreview = '';
    
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  removeEditImage(): void {
    if (this.editingImagePreview) {
      URL.revokeObjectURL(this.editingImagePreview);
    }
    this.editingImageFile = null;
    this.editingImagePreview = '';
    
    if (this.editingPost) {
      this.editingPost.imageUrl = undefined;
    }
    
    if (this.editFileInput) {
      this.editFileInput.nativeElement.value = '';
    }
  }

  async createPost(): Promise<void> {
    if (!this.currentUser || !this.createForm.content.trim()) {
      return;
    }

    // Set loading state
    this.isCreatingPost = true;
    this.errorMessage = '';

    try {
      const formData = new FormData();
      
      const postPayload = {
        username: this.currentUser.name,
        content: this.createForm.content.trim()
      };
      
      formData.append('post', JSON.stringify(postPayload));
      
      if (this.createForm.imageFile) {
        formData.append('imageFile', this.createForm.imageFile);
      }

      this.postsService.createPostOnServer(formData).subscribe({
        next: (createdPost: Post) => {
          console.log('Post created successfully:', createdPost);
          this.refreshPosts();
          this.resetCreateForm();
          this.showCreateForm = false;
          this.isCreatingPost = false;
        },
        error: (error) => {
          console.error('Error creating post:', error);
          this.errorMessage = 'Failed to create post. Please try again.';
          this.isCreatingPost = false;
        }
      });
      
    } catch (error) {
      console.error('Error preparing post data:', error);
      this.errorMessage = 'Failed to prepare post data. Please try again.';
      this.isCreatingPost = false;
    }
  }

  // Dropdown Methods
  toggleDropdown(event: Event, post: Post): void {
    event.stopPropagation();
    this.posts.forEach(p => { if (p.id !== post.id) p.showDropdown = false; });
    post.showDropdown = !post.showDropdown;
  }

  // Edit Post Methods
  startEdit(post: Post): void {
    this.editingPost = { ...post };
    this.editingImageFile = null;
    this.editingImagePreview = '';
    post.showDropdown = false;
  }

  cancelEdit(): void { 
    // Clean up edit image preview
    if (this.editingImagePreview) {
      URL.revokeObjectURL(this.editingImagePreview);
    }
    this.editingPost = null;
    this.editingImageFile = null;
    this.editingImagePreview = '';
    
    if (this.editFileInput) {
      this.editFileInput.nativeElement.value = '';
    }
  }

  async saveEdit(): Promise<void> {
    if (!this.editingPost || !this.editingPost.content.trim()) return;

    let imageUrl = this.editingPost.imageUrl;

    // Upload new image if one is selected
    if (this.editingImageFile) {
      try {
        // Implement image upload logic here if needed
      } catch (error) {
        console.error('Error uploading image:', error);
        this.errorMessage = 'Failed to upload image. Please try again.';
        return;
      }
    }

    const updatedPost: Post = {
      ...this.editingPost,
      content: this.editingPost.content.trim(),
      imageUrl: imageUrl,
      updatedAt: new Date().toISOString()
    };

    this.postsService.editPost(updatedPost);
    this.sortPostsByDate();
    this.cancelEdit();
  }

  // Delete Post Methods
  confirmDelete(post: Post): void {
    this.postToDelete = post;
    this.showDeleteModal = true;
    post.showDropdown = false;
  }

  cancelDelete(): void {
    this.postToDelete = null;
    this.showDeleteModal = false;
  }

  deletePost(): void {
    if (!this.postToDelete) return;
    this.postsService.deletePost(this.postToDelete.id);
    this.cancelDelete();
  }

  // Like functionality
  toggleLike(post: Post): void {
    if (!this.isAuthenticated) { 
      alert('Please log in to like posts'); 
      return; 
    }
    this.postsService.toggleLike(post);
  }

  toggleCommentLike(comment: PostComment): void {
    if (!this.isAuthenticated) { 
      alert('Please log in to like comments'); 
      return; 
    }
    this.postsService.toggleCommentLike(comment);
  }

  // Comment functionality
  toggleComments(post: Post): void { 
    post.showComments = !post.showComments; 
  }

  addComment(post: Post): void {
    if (!this.isAuthenticated || !this.currentUser) { 
      alert('Please log in to comment'); 
      return; 
    }
    if (post.newComment && post.newComment.trim()) {
      const newComment: PostComment = {
        id: Date.now().toString(),
        postId: post.id,
        userId: this.currentUser.id,
        userInfo: this.currentUser,
        content: post.newComment.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        likesCount: 0,
        isLikedByCurrentUser: false,
        replies: []
      };
      this.postsService.addComment(post, newComment);
      post.newComment = '';
    }
  }

  onCommentKeyPress(event: KeyboardEvent, post: Post): void {
    if (event.key === 'Enter' && !event.shiftKey) { 
      event.preventDefault(); 
      this.addComment(post); 
    }
  }

  // File handling helper methods
  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  triggerEditFileInput(): void {
    this.editFileInput.nativeElement.click();
  }

  getFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  // Utility Methods
  private generateUserIdFromEmail(email: string): number {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash;
    }
    return Math.abs(hash);
  }

  private extractNameFromEmail(email: string): string {
    const localPart = email.split('@')[0];
    return localPart.charAt(0).toUpperCase() + localPart.slice(1).replace(/[._]/g, ' ');
  }

  onImageError(post: Post): void {
    if (!post.imageLoadFailed) {
      post.imageLoadFailed = true;
      post.imageUrl = 'https://via.placeholder.com/40x40/cccccc/666666?text=?';
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

  isEditing(post: Post): boolean { 
    return this.editingPost?.id === post.id; 
  }

  canInteract(): boolean { 
    return this.isAuthenticated && !!this.currentUser; 
  }

  refreshPosts(): void { 
    this.loading = true;
    this.errorMessage = '';
    this.loadPosts();
  }

  public sortPosts(): void {
    this.sortPostsByDate();
  }
}