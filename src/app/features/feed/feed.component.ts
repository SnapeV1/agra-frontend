import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CourseService } from 'src/app/services/course/course.service';
import { AuthService } from 'src/app/services/auth/auth.service';
import { Course } from 'src/app/features/courses/models/course';
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
  isCoursePost?: boolean;
  courseId?: string;
}

@Component({
  selector: 'app-feed',
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.css']
})
export class FeedComponent implements OnInit, OnDestroy {
  posts: Post[] = [];
  courses: Course[] = [];
  loading: boolean = false;
  errorMessage: string = '';
  
  // Authentication state
  currentAuthUser: AuthUser | null = null;
  currentUser: User | null = null;
  isAuthenticated: boolean = false;
  private authSubscription: Subscription = new Subscription();

  // Fake instructor data for course posts
  private fakeInstructors: User[] = [
    {
      id: 101,
      name: 'Dr. Ahmed Hassan',
      username: '@ahmedh',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face'
    },
    {
      id: 102,
      name: 'Prof. Sara Bennani',
      username: '@sarab',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b332c5f2?w=40&h=40&fit=crop&crop=face'
    },
    {
      id: 103,
      name: 'Dr. Omar Slimani',
      username: '@omars',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face'
    },
    {
      id: 104,
      name: 'Prof. Fatima Zahra',
      username: '@fatimaz',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face'
    }
  ];

  constructor(
    private courseService: CourseService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeAuthentication();
    this.loadPosts();
    this.fetchCourses();
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

    this.authSubscription.add(
      this.authService.isAuthenticated$.subscribe(isAuth => {
        this.isAuthenticated = isAuth;
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

  fetchCourses(): void {
    this.loading = true;
    this.courseService.getAllCourses().subscribe({
      next: (data) => {
        this.courses = data;
        this.integrateCoursePosts();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching courses:', err);
        this.errorMessage = 'Failed to load courses. Please try again later.';
        this.loading = false;
      }
    });
  }

  integrateCoursePosts(): void {
    const coursePosts: Post[] = this.courses.map((course, index) => {
      const randomInstructor = this.fakeInstructors[index % this.fakeInstructors.length];
      const randomHoursAgo = Math.floor(Math.random() * 24) + 1;
      const randomLikes = Math.floor(Math.random() * 50) + 5;
      
      return {
        id: 1000 + index, 
        user: randomInstructor,
        content: `🎓 New course available: ${course.description}`,
        image: course.imageUrl || this.getRandomCourseImage(),
        timestamp: new Date(Date.now() - randomHoursAgo * 60 * 60 * 1000),
        likes: randomLikes,
        isLiked: Math.random() > 0.7, 
        comments: this.generateFakeComments(),
        showComments: false,
        newComment: '',
        isCoursePost: true,
        courseId: course.id
      };
    });

    this.posts = [...this.posts, ...coursePosts].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  generateFakeComments(): Comment[] {
    const commentCount = Math.floor(Math.random() * 4); 
    const comments: Comment[] = [];
    
    const fakeCommentTexts = [
      'This looks really interesting! 📚',
      'Great course, thanks for sharing!',
      'When does this start?',
      'Perfect timing, I was looking for something like this!',
      'Can\'t wait to enroll! 🚀',
      'Is this suitable for beginners?'
    ];

    for (let i = 0; i < commentCount; i++) {
      const randomUser = this.fakeInstructors[Math.floor(Math.random() * this.fakeInstructors.length)];
      const randomCommentText = fakeCommentTexts[Math.floor(Math.random() * fakeCommentTexts.length)];
      const randomMinutesAgo = Math.floor(Math.random() * 120) + 10;
      
      comments.push({
        id: Date.now() + i,
        user: randomUser,
        content: randomCommentText,
        timestamp: new Date(Date.now() - randomMinutesAgo * 60 * 1000),
        likes: Math.floor(Math.random() * 5),
        isLiked: Math.random() > 0.8
      });
    }

    return comments;
  }

  getRandomCourseImage(): string {
    const courseImages = [
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&h=300&fit=crop',
      'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=500&h=300&fit=crop',
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&h=300&fit=crop',
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=500&h=300&fit=crop',
      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&h=300&fit=crop'
    ];
    return courseImages[Math.floor(Math.random() * courseImages.length)];
  }

  loadPosts(): void {
    this.posts = [
      {
        id: 1,
        user: {
          id: 2,
          name: 'Sarah Johnson',
          username: '@sarahj',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b332c5f2?w=40&h=40&fit=crop&crop=face'
        },
        content: 'Just launched my new project! 🚀 Excited to share this journey with you all. The past few months have been incredible.',
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&h=300&fit=crop',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        likes: 24,
        isLiked: false,
        comments: [
          {
            id: 1,
            user: {
              id: 3,
              name: 'Mike Chen',
              username: '@mikec',
              avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face'
            },
            content: 'Congratulations! This looks amazing 🎉',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
            likes: 3,
            isLiked: false
          }
        ],
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
        content: 'Beautiful sunset from my office window today. Sometimes you need to pause and appreciate the simple moments. 🌅',
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
        likes: 42,
        isLiked: true,
        comments: [],
        showComments: false,
        newComment: ''
      },
      {
        id: 3,
        user: {
          id: 5,
          name: 'Emma Davis',
          username: '@emmad',
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face'
        },
        content: 'Coffee shop vibes ☕️ Working on some exciting new features. Can\'t wait to show you what we\'re building!',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
        likes: 18,
        isLiked: false,
        comments: [
          {
            id: 2,
            user: {
              id: 6,
              name: 'John Smith',
              username: '@johns',
              avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face'
            },
            content: 'Looking forward to seeing what you\'re working on!',
            timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000),
            likes: 1,
            isLiked: false
          },
          {
            id: 3,
            user: {
              id: 7,
              name: 'Lisa Wong',
              username: '@lisaw',
              avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=40&h=40&fit=crop&crop=face'
            },
            content: 'Coffee shop coding sessions are the best! ☕️💻',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
            likes: 2,
            isLiked: true
          }
        ],
        showComments: false,
        newComment: ''
      }
    ];
  }

  toggleLike(post: Post): void {
    if (!this.isAuthenticated) {
      alert('Please log in to like posts');
      return;
    }
    post.isLiked = !post.isLiked;
    post.likes += post.isLiked ? 1 : -1;
  }

  toggleCommentLike(comment: Comment): void {
    if (!this.isAuthenticated) {
      alert('Please log in to like comments');
      return;
    }
    comment.isLiked = !comment.isLiked;
    comment.likes += comment.isLiked ? 1 : -1;
  }

  toggleComments(post: Post): void {
    post.showComments = !post.showComments;
  }

  addComment(post: Post): void {
    if (!this.isAuthenticated || !this.currentUser) {
      alert('Please log in to comment');
      return;
    }

    if (post.newComment.trim()) {
      const newComment: Comment = {
        id: Date.now(),
        user: this.currentUser, 
        content: post.newComment.trim(),
        timestamp: new Date(),
        likes: 0,
        isLiked: false
      };
      post.comments.push(newComment);
      post.newComment = '';
      post.showComments = true;
    }
  }

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

  onCommentKeyPress(event: KeyboardEvent, post: Post): void {
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