import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth/auth.service';

import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';
import { Course } from 'src/app/core/models/course';
import { CourseService } from 'src/app/core/services/course/course.service';
import { forkJoin, Subscription } from 'rxjs';
import { PostsService } from 'src/app/features/backoffice/admin/services/posts.service';
import { NotificationService } from 'src/app/core/services/notification.service';
// Google sign-in is handled in dedicated Auth components (Login/Register).
declare const require: any;

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
  private enrollmentStatusSub?: Subscription;
  enrolledCourseIds: Set<string> = new Set();
  fallbackAvatar = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><rect width='80' height='80' fill='%23f3f4f6'/><circle cx='40' cy='32' r='18' fill='%23cbd5e1'/><path d='M12 72c4-14 16-22 28-22s24 8 28 22' fill='%23cbd5e1'/></svg>";
  sponsorLogos: string[] = [];
  constructor(
    private router: Router,
    private courseService: CourseService, 
    private postsService: PostsService,
    private notificationService: NotificationService,
    private authService: AuthService

  ) {}

  ngOnInit(): void {
    this.checkAuthStatus();
    this.loadFeaturedCourses();
    this.loadFeaturedPosts();
    this.setupScrollObserver();
    this.loadSponsorLogos();
  }

private loadSponsorLogos(): void {
  import('../../../../assets/images/sponsors/sponsors.json')
    .then((data: any) => {
      const list = Array.isArray(data?.default) ? data.default : (Array.isArray(data) ? data : []);
      this.sponsorLogos = list.map((file: string) => `assets/images/sponsors/${file}`);
    })
    .catch(() => {
      this.sponsorLogos = [];
    });
}



  ngOnDestroy(): void {
     if (this.postsSubscription) {
      this.postsSubscription.unsubscribe();
    }
    if (this.enrollmentStatusSub) {
      this.enrollmentStatusSub.unsubscribe();
    }
  }


  checkAuthStatus(): void {
    const ls = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
    const ss = (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } };
    const token = ls('jwt') || ss('jwt') ||
                  ls('token') || ss('token') ||
                  ls('auth_token') || ss('auth_token') ||
                  ls('access_token') || ss('access_token');
    this.isLoggedIn = !!token;
  
    
  }

  /**
   * Handle user login - navigate to login page
   */
  login(): void {
    this.router.navigate(['/login']);
  }

  signOut(): void {
    this.authService.logout();
  }


  loadFeaturedCourses(): void {
    this.coursesLoading = true;
    this.coursesError = '';

    this.courseService.getActiveCourses().subscribe({
      next: (courses) => {
        const normalized = (courses ?? []).map(c => ({
          ...c,
          createdAt: c?.createdAt ? new Date(c.createdAt) : new Date(0)
        } as Course));
        const activeCourses = normalized.filter(c => !c?.archived);
        const sorted = activeCourses.sort((a, b) => (b.createdAt as any) - (a.createdAt as any));
        this.featuredCourses = sorted.slice(0, 4);
        if (this.isLoggedIn) {
          this.refreshEnrollmentStatuses();
        } else {
          this.enrolledCourseIds.clear();
        }
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

 
  onCourseSelect(course: Course, event?: Event): void {
    event?.stopPropagation();
    const courseId = course?.id;
    if (!courseId) {
      return;
    }
    const isEnrolled = this.isCourseEnrolled(courseId);
    const target = isEnrolled
      ? ['/courses/course-enrolled', courseId]
      : ['/courses/course-details', courseId];
    this.router.navigate(target);
  }

  
  enrollInCourse(course: Course, event: Event): void {
    event.stopPropagation();
    this.onCourseSelect(course);
  }


  isCourseEnrolled(course: Course | string): boolean {
    const id = typeof course === 'string' ? course : course?.id;
    if (!id) {
      return false;
    }
    return this.enrolledCourseIds.has(id);
  }

  private refreshEnrollmentStatuses(): void {
    if (!this.isLoggedIn || !this.featuredCourses.length) {
      this.enrolledCourseIds.clear();
      return;
    }

    const coursesToCheck = this.featuredCourses.filter(course => !!course.id);
    if (!coursesToCheck.length) {
      this.enrolledCourseIds.clear();
      return;
    }

    this.enrollmentStatusSub?.unsubscribe();
    const checks = coursesToCheck.map(course =>
      this.courseService.checkEnrollmentStatus(course.id!)
    );

    this.enrollmentStatusSub = forkJoin(checks).subscribe({
      next: (statuses) => {
        const enrolled = new Set<string>();
        statuses.forEach((status, idx) => {
          if (status?.enrolled && coursesToCheck[idx]?.id) {
            enrolled.add(coursesToCheck[idx].id as string);
          }
        });
        this.enrolledCourseIds = enrolled;
      },
      error: () => {
        this.enrolledCourseIds.clear();
      }
    });
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

  @HostListener('window:scroll', [])
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

  setFallbackAvatar(evt: Event): void {
    const img = evt?.target as HTMLImageElement;
    if (!img) return;
    if (img.src !== this.fallbackAvatar) {
      img.src = this.fallbackAvatar;
    }
    img.onerror = null;
  }

  setFallbackPostImage(evt: Event): void {
    const img = evt?.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
      const parent = img.parentElement;
      if (parent) {
        parent.classList.add('placeholder');
      }
    }
  }


  private updateActiveSection(): void {
    const sections = ['overview', 'features', 'courses', 'about', 'sponsors', 'organizations'];
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

  // Google Sign-In logic intentionally omitted here to keep auth
  // concerns encapsulated in Login/Register components.


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
