import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { AuthUser } from 'src/app/core/models/auth-user.model';
import { User } from 'src/app/core/models/user.model';
import { PostsService } from '../services/posts.service';
import { PostViewModel } from 'src/app/shared/models/post-view.model';
import { PostComment } from 'src/app/core/models/post-comment.module';
import { NewsArticle, NewsService } from 'src/app/core/services/news.service';

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

  posts: PostViewModel[] = [];
  visiblePosts: PostViewModel[] = [];
  private displayLimit = 8;
  leftNews: NewsArticle[] = [];
  rightNews: NewsArticle[] = [];
  leftNewsLimit = 8;
  rightNewsLimit = 8;
  news: NewsArticle[] = [];
  newsLoading = false;
  newsError = '';
  loading = false;
  errorMessage = '';
  isCreatingPost = false; 
  currentAuthUser: AuthUser | null = null;
  currentUser: User | null = null;
  isAuthenticated = false;
  private subscriptions = new Subscription();

  showCreateForm = false;
  showImageInput = false;
  editingPost: PostViewModel | null = null;
  editingImageFile: File | null = null;
  editingImagePreview: string = '';
  createForm: CreatePostForm = { content: '', imageFile: null, imagePreview: '' };

  showDeleteModal = false;
  postToDelete: PostViewModel | null = null;

  constructor(
    private authService: AuthService,
    private postsService: PostsService,
  private newsService: NewsService
  ) {}

  ngOnInit(): void {
    this.initializeAuthentication();
    this.loadPosts();
    this.loadNews();
    this.updateVisiblePosts();
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
            picture: authUser.user.picture,
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
          this.updateVisiblePosts();
          this.loading = false;
        },
        error: error => {
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
        next: (createdPost: PostViewModel) => {
          this.refreshPosts();
          this.resetCreateForm();
          this.showCreateForm = false;
          this.isCreatingPost = false;
        },
        error: (error) => {
          this.errorMessage = 'Failed to create post. Please try again.';
          this.isCreatingPost = false;
        }
      });
      
    } catch (error) {
      this.errorMessage = 'Failed to prepare post data. Please try again.';
      this.isCreatingPost = false;
    }
  }

  // Dropdown Methods
  toggleDropdown(event: Event, post: PostViewModel): void {
    event.stopPropagation();
    this.posts.forEach(p => { if (p.id !== post.id) p.showDropdown = false; });
    post.showDropdown = !post.showDropdown;
  }

  // Edit Post Methods
  startEdit(post: PostViewModel): void {
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

  getPostImageSrc(url?: string | null): string {
    const { src } = this.buildResponsiveImage(url);
    return src || '';
  }

  getPostImageSrcSet(url?: string | null): string | null {
    const { srcset } = this.buildResponsiveImage(url);
    return srcset || null;
  }

  private buildResponsiveImage(url?: string | null, baseWidth = 720): { src: string; srcset?: string } {
    if (!url) return { src: '' };

    const uploadToken = '/upload/';
    if (url.includes('res.cloudinary.com') && url.includes(uploadToken)) {
      const [prefix, rest] = url.split(uploadToken);
      const safeRest = rest || '';
      const oneX = `${prefix}${uploadToken}w_${baseWidth},f_auto,q_auto,dpr_1.0/${safeRest}`;
      const twoX = `${prefix}${uploadToken}w_${baseWidth * 2},f_auto,q_auto,dpr_2.0/${safeRest}`;
      return { src: oneX, srcset: `${oneX} 1x, ${twoX} 2x` };
    }

    return { src: url };
  }

  async saveEdit(): Promise<void> {
    if (!this.editingPost || !this.editingPost.content.trim() || !this.currentUser) return;
    if (!this.isAuthenticated) {
      this.errorMessage = 'You must be signed in to edit posts.';
      return;
    }

    const content = this.editingPost.content.trim();
    const removeImage = !this.editingImageFile && !this.editingPost.imageUrl;

    this.errorMessage = '';

    this.postsService.updatePostOnServer(this.editingPost.id, {
      content,
      imageFile: this.editingImageFile || undefined,
      removeImage,
      username: this.currentUser.name
    }).subscribe({
      next: () => {
        this.refreshPosts();
        this.cancelEdit();
      },
      error: () => {
        this.errorMessage = 'Failed to update post. Please try again.';
      }
    });
  }

  // Delete Post Methods
  confirmDelete(post: PostViewModel): void {
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
    if (!this.isAuthenticated) {
      this.errorMessage = 'You must be signed in to delete posts.';
      return;
    }
    const toDelete = this.postToDelete;
    this.cancelDelete();
    this.errorMessage = '';
    this.postsService.deletePostOnServer(toDelete.id).subscribe({
      next: () => {
        this.refreshPosts();
      },
      error: () => {
        this.errorMessage = 'Failed to delete post. Please try again.';
      }
    });
  }

  // Like functionality
  toggleLike(post: PostViewModel): void {
    if (!this.isAuthenticated) { 
      return; 
    }
    this.postsService.toggleLike(post);
  }

  toggleCommentLike(comment: PostComment): void {
    if (!this.isAuthenticated) { 
      return; 
    }
    this.postsService.toggleCommentLike(comment);
  }

  // Comment functionality
  toggleComments(post: PostViewModel): void { 
    post.showComments = !post.showComments; 
    if (post.showComments) {
      const needsFetch = (post.commentsCount || 0) > (post.comments.length || 0);
      if (needsFetch) {
        this.postsService.loadCommentsForPost(post.id);
      }
    }
  }

  addComment(post: PostViewModel): void {
    if (!this.isAuthenticated || !this.currentUser) { 
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

  onCommentKeyPress(event: KeyboardEvent, post: PostViewModel): void {
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

  onImageError(post: PostViewModel): void {
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

  isEditing(post: PostViewModel): boolean { 
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

  private updateVisiblePosts(): void {
    this.visiblePosts = this.posts.slice(0, this.displayLimit);
  }

  private loadNews(): void {
    this.newsLoading = true;
    this.newsError = '';
    this.newsService.getAllNews().subscribe({
      next: articles => {
        const cleaned = (articles || []).filter(a => !!a && !!a.title);
        this.news = cleaned;
        const half = Math.ceil(cleaned.length / 2);
        this.leftNews = cleaned.slice(0, half);
        this.rightNews = cleaned.slice(half);
        this.leftNewsLimit = Math.min(8, this.leftNews.length || 0);
        this.rightNewsLimit = Math.min(8, this.rightNews.length || 0);
        this.newsLoading = false;
      },
      error: () => {
        this.newsError = 'Failed to load news.';
        this.newsLoading = false;
      }
    });
  }

  deleteNews(item: NewsArticle): void {
    if (!item?.id) return;
    this.newsService.deleteNews(item.id).subscribe({
      next: () => {
        const remove = (arr: NewsArticle[]) => arr.filter(n => n.id !== item.id);
        this.leftNews = remove(this.leftNews);
        this.rightNews = remove(this.rightNews);
        this.news = remove(this.news);
        this.leftNewsLimit = Math.min(this.leftNewsLimit, this.leftNews.length || 0);
        this.rightNewsLimit = Math.min(this.rightNewsLimit, this.rightNews.length || 0);
      },
      error: () => {
        // swallow; lightweight operation
      }
    });
  }

  loadMoreLeftNews(): void {
    this.leftNewsLimit = Math.min(this.leftNewsLimit + 8, this.leftNews.length);
  }

  loadMoreRightNews(): void {
    this.rightNewsLimit = Math.min(this.rightNewsLimit + 8, this.rightNews.length);
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const threshold = 400;
    const scrolled = window.innerHeight + window.scrollY;
    if (scrolled + threshold >= document.body.scrollHeight) {
      this.displayLimit += 4;
      this.updateVisiblePosts();
    }
  }
}
