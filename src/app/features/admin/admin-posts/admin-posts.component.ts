import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subscription, forkJoin } from 'rxjs';
import { CourseService } from 'src/app/services/course/course.service';
import { AuthService } from 'src/app/services/auth/auth.service';
import { Course } from 'src/app/features/courses/models/course';
import { AuthUser } from 'src/app/features/auth/models/auth-user.model';
import { User } from '../../user/models/user.model';
import { PostsService } from '../services/posts.service';
import { Post } from '../../feed/post/post.module';
import { PostComment } from '../../feed/post-comment/post-comment.module';

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
  courses: Course[] = [];
  loading = false;
  errorMessage = '';

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

  // Add flags to track loading states
  private postsLoaded = false;
  private coursesLoaded = false;

  constructor(
    private authService: AuthService,
    private courseService: CourseService,
    private postsService: PostsService
  ) {}

  ngOnInit(): void {
    this.initializeAuthentication();
    this.loadInitialData();
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

  // Load posts and courses simultaneously with proper synchronization
  private loadInitialData(): void {
    this.loading = true;
    this.errorMessage = '';
    this.postsLoaded = false;
    this.coursesLoaded = false;

    // Load posts and courses in parallel
    const posts$ = this.postsService.posts$;
    const courses$ = this.courseService.getAllCourses();

    this.subscriptions.add(
      forkJoin({
        courses: courses$
      }).subscribe({
        next: ({ courses }) => {
          this.courses = courses;
          this.coursesLoaded = true;
          this.checkAndIntegratePosts();
        },
        error: error => {
          console.error('Error loading courses:', error);
          this.errorMessage = 'Failed to load courses. Please try again later.';
          this.loading = false;
        }
      })
    );

    // Subscribe to posts separately to handle real-time updates
    this.subscriptions.add(
      posts$.subscribe({
        next: posts => {
          this.posts = posts;
          this.postsLoaded = true;
          this.checkAndIntegratePosts();
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

  // Only integrate when both posts and courses are loaded
  private checkAndIntegratePosts(): void {
    if (this.postsLoaded && this.coursesLoaded) {
      this.integrateCoursePosts();
      this.sortPostsByDate(); // Always sort after integration
      this.loading = false;
    }
  }

  // Improved course integration with better duplicate handling
  private integrateCoursePosts(): void {
    if (!this.courses.length) return;

    const coursePosts: Post[] = this.courses.map((course, index) => {
      const randomHoursAgo = Math.floor(Math.random() * 24) + 1;
      const randomLikes = Math.floor(Math.random() * 50) + 5;

      return {
        id: (1000 + index).toString(),
        userId: '0',
        userInfo: {
          id: '0',
          name: 'Course System',
          username: '@system',
          avatar: '',
          email: 'system@course.com',   
          role: 'system',               
          registeredAt: new Date().toISOString(), 
          archived: false
        },
        content: `🎓 New course available: ${course.description}`,
        imageUrl: course.imageUrl,
        createdAt: new Date(Date.now() - randomHoursAgo * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        likesCount: randomLikes,
        isLikedByCurrentUser: Math.random() > 0.7,
        comments: [],
        commentsCount: 0,
        isCoursePost: true,
        courseId: course.id,
        showComments: false,
        newComment: '',
        showDropdown: false
      };
    });

    // Remove existing course posts and add new ones
    const nonCoursePosts = this.posts.filter(p => !p.isCoursePost);
    this.posts = [...nonCoursePosts, ...coursePosts];
  }

  // NEW: Centralized sorting method for consistent date sorting
  private sortPostsByDate(): void {
    this.posts = this.posts.sort((a, b) => {
      const dateA = new Date(a.createdAt!).getTime();
      const dateB = new Date(b.createdAt!).getTime();
      return dateB - dateA; // Newest first (descending order)
    });
  }

  // Separate method to fetch courses with retry logic
  private fetchCourses(): void {
    this.subscriptions.add(
      this.courseService.getAllCourses().subscribe({
        next: data => {
          this.courses = data;
          this.coursesLoaded = true;
          this.checkAndIntegratePosts();
        },
        error: err => {
          console.error('Error fetching courses:', err);
          this.errorMessage = 'Failed to load courses. Please try again later.';
          this.loading = false;
          
          // Optional: Retry logic
          setTimeout(() => {
            if (!this.coursesLoaded) {
              console.log('Retrying course fetch...');
              this.fetchCourses();
            }
          }, 2000);
        }
      })
    );
  }

  // Create Post Methods
  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) this.resetCreateForm();
  }

  resetCreateForm(): void {
    // Clean up previous image preview URL
    if (this.createForm.imagePreview) {
      URL.revokeObjectURL(this.createForm.imagePreview);
    }
    this.createForm = { content: '', imageFile: null, imagePreview: '' };
    this.showImageInput = false;
    
    // Reset file input
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

  // Clear any previous error messages
  this.errorMessage = '';

  try {
    const formData = new FormData();
    
    // Create post payload matching backend expectations
    const postPayload = {
      username: this.currentUser.name,
      content: this.createForm.content.trim(),
      isCoursePost: false, // Set to true if this is a course-related post
      courseId: null // Set courseId if this is a course post
    };
    
    // Add the post data as JSON string
    formData.append('post', JSON.stringify(postPayload));
    
    // Add image file if one is selected
    if (this.createForm.imageFile) {
      formData.append('imageFile', this.createForm.imageFile);
    }

    // Send to backend
    this.postsService.createPostOnServer(formData).subscribe({
      next: (createdPost: Post) => {
        console.log('Post created successfully:', createdPost);
        this.refreshPosts();
        this.resetCreateForm();
        this.showCreateForm = false;
      },
      error: (error) => {
        console.error('Error creating post:', error);
        this.errorMessage = 'Failed to create post. Please try again.';
      }
    });
    
  } catch (error) {
    console.error('Error preparing post data:', error);
    this.errorMessage = 'Failed to prepare post data. Please try again.';
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
    if (post.isCoursePost) {
      alert('Course posts cannot be edited here.');
      post.showDropdown = false;
      return;
    }
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
       // imageUrl = await this.postsService.sa(this.editingImageFile).toPromise();
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
    // Sort after editing to maintain proper order
    this.sortPostsByDate();
    this.cancelEdit();
  }

  // Delete Post Methods
  confirmDelete(post: Post): void {
    if (post.isCoursePost) {
      alert('Course posts cannot be deleted from here.');
      post.showDropdown = false;
      return;
    }
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
    // No need to sort after delete since we're removing an item
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

  getTimeAgo(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
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

  isEditing(post: Post): boolean { 
    return this.editingPost?.id === post.id; 
  }

  canInteract(): boolean { 
    return this.isAuthenticated && !!this.currentUser; 
  }

  canModifyPost(post: Post): boolean { 
    return !post.isCoursePost; 
  }

  refreshPosts(): void { 
    this.loading = true;
    this.postsLoaded = false;
    this.coursesLoaded = false;
    this.errorMessage = '';
    
    this.loadInitialData();
  }

  public sortPosts(): void {
    this.sortPostsByDate();
  }
}