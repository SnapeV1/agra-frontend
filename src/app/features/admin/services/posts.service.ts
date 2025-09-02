import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { Post } from '../../feed/post/post.module';
import { PostComment } from '../../feed/post-comment/post-comment.module';
import { AuthService } from 'src/app/services/auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PostsService {
  private posts: Post[] = [];
  private postsSubject = new BehaviorSubject<Post[]>([]);
  posts$ = this.postsSubject.asObservable();

  private readonly apiUrl = 'http://localhost:8080/api/posts/sorted';
  constructor(private http: HttpClient,private authService: AuthService,
  ) {}
private token=this.authService.getToken();
  /** Fetch all posts from backend */
  fetchPosts(): void {
    this.http.get<Post[]>(this.apiUrl)
      .pipe(
        map(posts =>
          posts.map(post => ({
            ...post,
            createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : undefined,
            updatedAt: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
            comments: post.comments || [],
            isLikedByCurrentUser: post.isLikedByCurrentUser || false,
            likesCount: post.likesCount || 0,
            commentsCount: post.commentsCount || 0,
            // Local UI flags (not in model)
            showComments: false,
            newComment: '',
            showDropdown: false
          }))
        )
      )
      .subscribe({
        next: (data) => {
          this.posts = data;
          this.sortPosts();
        },
        error: (error) => {
          console.error('Error fetching posts:', error);
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

  /** Toggle like on a post locally */
  toggleLike(post: Post): void {
    post.isLikedByCurrentUser = !post.isLikedByCurrentUser;
    post.likesCount = (post.likesCount || 0) + (post.isLikedByCurrentUser ? 1 : -1);
    this.updatePosts();
  }

  /** Toggle like on a comment locally */
  toggleCommentLike(comment: PostComment): void {
    comment.isLikedByCurrentUser = !comment.isLikedByCurrentUser;
    comment.likesCount = (comment.likesCount || 0) + (comment.isLikedByCurrentUser ? 1 : -1);
    this.updatePosts();
  }

  /** Add a comment to a post locally */
  addComment(post: Post, comment: PostComment): void {
    post.comments = post.comments || [];
    post.comments.push(comment);
    post.commentsCount = (post.commentsCount || 0) + 1;
    //post.showComments = true;
    this.updatePosts();
  }

  /** Update BehaviorSubject */
  private updatePosts(): void {
    this.postsSubject.next([...this.posts]);
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
        console.log("this.token",this.token)

  return this.http.post<Post>(`http://localhost:8080/api/posts/CreatePost`, formData, {
    headers: {
      'Authorization': `Bearer ${this.token}`
    }
  });

}


}
