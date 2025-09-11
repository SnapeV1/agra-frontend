import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';

import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';
import { Course } from 'src/app/core/models/course';
import { CourseService } from 'src/app/core/services/course/course.service';
import { Subscription } from 'rxjs';
import { PostsService } from 'src/app/features/admin/services/posts.service';

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

  // Authentication state
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
    private postsService: PostsService

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
                  localStorage.getItem('authToken') ||
                  localStorage.getItem('access_token');
    this.isLoggedIn = !!token;
  }

  /**
   * Handle user login - navigate to login page
   */
  login(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Handle user sign out
   */
  signOut(): void {
    // Remove all possible JWT token keys
    localStorage.removeItem('jwt');
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    this.isLoggedIn = false;
    console.log('User signed out successfully');
  }

  /**
   * Load featured courses (first 4)
   */
  loadFeaturedCourses(): void {
    this.coursesLoading = true;
    this.coursesError = '';

    this.courseService.getAllCourses().subscribe({
      next: (courses) => {
        this.featuredCourses = (courses ?? []).slice(0, 4);
        this.coursesLoading = false;
      },
      error: (err) => {
        console.error('Error loading featured courses:', err);
        this.coursesError = 'Failed to load courses';
        this.coursesLoading = false;
      }
    });
  }

  /**
   * Navigate to courses page
   */
  viewAllCourses(): void {
    this.router.navigate(['/courses']);
  }

  /**
   * Navigate to course details
   */
  onCourseSelect(course: Course): void {
    this.router.navigate(['/course-details', course.id]);
  }

  /**
   * Handle course enrollment
   */
  enrollInCourse(course: Course, event: Event): void {
    event.stopPropagation();
    console.log('Enrolling in course:', course);
    // Add your enrollment logic here
  }

  /**
   * Get course rating as number
   */
  getCourseRating(course: any): number | null {
    const r = course?.rating;
    return typeof r === 'number' ? r : null;
  }

  /**
   * Generate star array for rating display
   */
  generateStarArray(rating: number): boolean[] {
    const full = Math.floor(rating);
    return Array.from({ length: 5 }, (_, i) => i < full);
  }

  /**
   * Format number with locale
   */
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

  /**
   * Setup intersection observer for scroll animations
   */
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

    // Observe all sections
    setTimeout(() => {
      const sections = document.querySelectorAll('.section');
      sections.forEach(section => observer.observe(section));
    }, 100);
  }

  /**
   * Update active navigation section based on scroll position
   */
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

  /**
   * Smooth scroll to section
   */
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -70; // Account for fixed navbar
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({
        top: y,
        behavior: 'smooth'
      });
    }
  }

  /**
   * Handle CTA button click
   */
  onContactClick(): void {
    console.log('Contact button clicked');
    window.location.href = 'mailto:contact@agra-platform.com?subject=Projet AGRA - Demande d\'information';
  }

  /**
   * Handle feature card hover effects
   */
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

  /**
   * Handle pricing card selection
   */
  onPricingCardClick(cardIndex: number): void {
    console.log(`Pricing card ${cardIndex} selected`);
  }

  /**
   * Handle timeline item click
   */
  onTimelineItemClick(item: any): void {
    console.log('Timeline item clicked:', item);
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
        // Transform posts for display (similar to feed component)
        this.featuredPosts = posts.map(post => ({
          ...post,
          user: post.userInfo ,
          content: post.content || '',
          image: post.imageUrl,
          timestamp: post.createdAt ? new Date(post.createdAt) : new Date(),
          likes: post.likesCount || 0,
          isLiked: post.isLikedByCurrentUser || false,
          comments: (post.comments || []).map(comment => ({
            id: comment.id,
            user: comment.userInfo,
            content: comment.content,
            timestamp: comment.createdAt ? new Date(comment.createdAt) : new Date(),
            likes: comment.likesCount || 0,
            isLiked: comment.isLikedByCurrentUser || false
          }))
        }));
        this.postsLoading = false;
      },
      error: error => {
        console.error('Error loading posts:', error);
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
      
      post.isLiked = !post.isLiked;
      post.likes += post.isLiked ? 1 : -1;
    }
  }
  onCommentClick(post: any, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/feed'], { queryParams: { postId: post.id, showComments: true } });
  }

  onPostMenuClick(post: any, event: Event): void {
    event.stopPropagation();
  
    console.log('Show menu for post:', post.id);
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
