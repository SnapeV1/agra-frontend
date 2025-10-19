import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';

import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';
import { Course } from 'src/app/core/models/course';
import { CourseService } from 'src/app/core/services/course/course.service';
import { Subscription } from 'rxjs';
import { PostsService } from 'src/app/features/admin/services/posts.service';
import { NotificationService } from 'src/app/core/services/notification.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  animations: [
    trigger('slideInUp', [
      state('in', style({ opacity: 1, transform: 'translateY(0)' })),
      transition('void => *', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate(600)
      ])
    ]),
    trigger('staggerAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(30px)' }),
          stagger(100, [
            animate('0.6s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild('navbar', { static: true }) navbar!: ElementRef;

  isLoggedIn: boolean = false;

  // Component state
  isScrolled = false;
  activeSection = 'overview';
  currentYear = new Date().getFullYear();

  // Courses state
  featuredCourses: Course[] = [];
  coursesLoading = true;
  coursesError = '';
featuredPosts: any[] = [];
  postsLoading: boolean = false;
  postsError: string = '';
  private postsSubscription?: Subscription;
  constructor(
    private router: Router,
    private courseService: CourseService, 
    private postsService: PostsService,
    private notificationService: NotificationService

  ) {}

  ngOnInit(): void {
    this.checkAuthStatus();
    this.loadFeaturedCourses();
    this.loadFeaturedPosts();
    this.setupScrollObserver();
  }

  ngOnDestroy(): void {
     if (this.postsSubscription) {
      this.postsSubscription.unsubscribe();
    }
  }


  checkAuthStatus(): void {
    const token = localStorage.getItem('jwt') || 
                  localStorage.getItem('token') || 
                  localStorage.getItem('auth_token') ||
                  localStorage.getItem('access_token');
    this.isLoggedIn =!!token;
  
    
  }

  /**
   * Handle user login - navigate to login page
   */
  login(): void {
    this.router.navigate(['/login']);
  }

  signOut(): void {
    localStorage.removeItem('jwt');
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    this.isLoggedIn = false;
    
  }


  loadFeaturedCourses(): void {
    this.coursesLoading = true;
    this.coursesError = '';

    this.courseService.getAllCourses().subscribe({
      next: (courses) => {
        this.featuredCourses = (courses ?? []).slice(0, 4);
        this.coursesLoading = false;
      },
      error: (err) => {
        this.coursesError = 'Failed to load courses';
        this.coursesLoading = false;
      }
    });
  }

  viewAllCourses(): void {
    this.router.navigate(['/courses']);
  }

 
  onCourseSelect(course: Course): void {
    this.router.navigate(['/course-details', course.id]);
  }

  
  enrollInCourse(course: Course, event: Event): void {
    event.stopPropagation();
    
  }

  
  getCourseRating(course: any): number | null {
    const r = course?.rating;
    return typeof r === 'number' ? r : null;
  }

  
  generateStarArray(rating: number): boolean[] {
    const full = Math.floor(rating);
    return Array.from({ length: 5 }, (_, i) => i < full);
  }

  
  formatNumber(num: number): string {
    if (typeof num !== 'number') return '';
    return num.toLocaleString();
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll(): void {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.isScrolled = scrollPosition > 50;
    this.updateActiveSection();
  }

  private setupScrollObserver(): void {
    const options = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in-up');
        }
      });
    }, options);

    setTimeout(() => {
      const sections = document.querySelectorAll('.section');
      sections.forEach(section => observer.observe(section));
    }, 100);
  }


  private updateActiveSection(): void {
    const sections = ['overview', 'features', 'courses', 'technical', 'pricing', 'timeline'];
    const scrollPosition = window.pageYOffset + 100;

    for (const section of sections) {
      const element = document.getElementById(section);
      if (element) {
        const offsetTop = element.offsetTop;
        const offsetHeight = element.offsetHeight;

        if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
          this.activeSection = section;
          break;
        }
      }
    }
  }


  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -70; 
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({
        top: y,
        behavior: 'smooth'
      });
    }
  }

 
  onContactClick(): void {
    window.location.href = 'mailto:contact@agra-platform.com?subject=Projet AGRA - Demande d\'information';
  }


  onFeatureHover(index: number, isEntering: boolean): void {
    const card = document.querySelector(`.feature-card:nth-child(${index + 1})`);
    if (card) {
      if (isEntering) {
        card.classList.add('hovered');
      } else {
        card.classList.remove('hovered');
      }
    }
  }


  onPricingCardClick(cardIndex: number): void {
    
  }

  /**
   * Handle timeline item click
   */
  onTimelineItemClick(item: any): void {
    
  }

  /**
   * Check if section is active
   */
  isSectionActive(sectionId: string): boolean {
    return this.activeSection === sectionId;
  }

  /**
   * Handle scroll to top
   */
  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }


loadFeaturedPosts(): void {
    this.postsLoading = true;
    this.postsError = '';

    this.postsSubscription = this.postsService.posts$.subscribe({
      next: posts => {
        // Update existing posts or create new ones, preserving UI state
        const updatedPosts = posts.map(servicePost => {
          // Find existing post to preserve any UI state
          const existingPost = this.featuredPosts.find(p => p.id === servicePost.id);
          
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
              user: comment.userInfo,
              content: comment.content,
              timestamp: comment.createdAt ? new Date(comment.createdAt) : new Date(),
              likes: comment.likesCount || 0,
              isLiked: comment.isLikedByCurrentUser || false
            }))
          };
        });
        
        this.featuredPosts = updatedPosts;
        this.postsLoading = false;
      },
      error: () => {
        this.postsError = 'Erreur lors du chargement des actualités. Veuillez réessayer plus tard.';
        this.postsLoading = false;
      }
    });

    this.postsService.fetchPosts();
  }
  onPostClick(post: any): void {
    this.router.navigate(['/feed'], { queryParams: { postId: post.id } });
  }

  togglePostLike(post: any, event: Event): void {
    event.stopPropagation();
    
    if (!this.isLoggedIn) {
      this.login();
      return;
    }
    
    const originalPost = this.featuredPosts.find(p => p.id === post.id);
    
    if (originalPost) {
      
      this.postsService.toggleLike(originalPost);
      
      // Remove local state updates - let the service handle it via subscription
    } else {
    }
  }
  onCommentClick(post: any, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/feed'], { queryParams: { postId: post.id, showComments: true } });
  }

  onPostMenuClick(post: any, event: Event): void {
    event.stopPropagation();
  
    
  }

  onViewAllComments(post: any, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/feed'], { queryParams: { postId: post.id, showComments: true } });
  }

  viewAllPosts(): void {
    this.router.navigate(['/feed']);
  }
  getTimeAgo(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return 'Il y a un moment';

    let date: Date;
    if (typeof dateInput === 'string') {
      date = new Date(dateInput);
      if (isNaN(date.getTime())) return 'Date invalide';
    } else if (dateInput instanceof Date) {
      date = dateInput;
      if (isNaN(date.getTime())) return 'Date invalide';
    } else {
      return 'Il y a un moment';
    }

    const now = new Date();
    const diffInMilliseconds = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) return diffInSeconds <= 1 ? 'À l\'instant' : `Il y a ${diffInSeconds}s`;
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes}m`;
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;

    return date.toLocaleDateString('fr-FR');
  }





}
