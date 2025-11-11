import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Course } from 'src/app/core/models/course';
import { CourseService } from 'src/app/core/services/course/course.service';
import { ProgressService, CourseEnrollment } from 'src/app/core/services/progress.service';
import { AuthService } from 'src/app/core/services/auth/auth.service';

@Component({
  selector: 'app-course-details',
  templateUrl: './course-details.component.html',
  styleUrls: ['./course-details.component.css']
})
export class CourseDetailsComponent implements OnInit, OnDestroy {
  course: Course | null = null;
  loading = true;
  error = '';
  courseId: string = '';
  isAuthenticated = false;
  isEnrolling = false;
  isEnrolled = false;
  enrollmentError = '';
  activeTab = 'overview';
  progressPercent = 0;
  relatedCourses: Course[] = [];
  relatedStart = 0;
  get canPrev(): boolean { return this.relatedStart > 0; }
  get canNext(): boolean { return this.relatedStart + 2 < this.relatedCourses.length; }
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private authService: AuthService,
    private progressService: ProgressService
  ) {}

  ngOnInit(): void {
    // Subscribe to authentication state
    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuthenticated => {
        this.isAuthenticated = isAuthenticated;
      });

    // Initialize authentication state
    this.isAuthenticated = this.authService.isAuthenticated();

    this.route.params.subscribe(params => {
      this.courseId = params['id'];
      this.loadCourse();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCourse(): void {
    this.loading = true;
    this.error = '';

    this.courseService.getCourseById(this.courseId).subscribe({
      next: (course) => {
        this.course = course;
        this.loading = false;
        
        // Check enrollment status if user is authenticated
        if (this.isAuthenticated && this.course?.id) {
          this.checkEnrollmentStatus();
        }

        // Load related courses by domain
        this.loadRelatedCourses();
      },
      error: (err) => {
    
        this.error = 'Failed to load course details. Please try again.';
        this.loading = false;
      }
    });
  }

  enrollInCourse(): void {
    if (!this.course || !this.course.id) {
      this.enrollmentError = 'Course information is not available.';
      return;
    }
    
    // Check authentication before enrollment
    if (!this.isAuthenticated) {
      this.handleEnrollment();
      return;
    }

    // Prevent duplicate enrollment attempts
    if (this.isEnrolling || this.isEnrolled) {
      return;
    }
    
    this.isEnrolling = true;
    this.enrollmentError = '';
    
    const courseId = this.course.id; // Store in variable for type safety
    this.courseService.enrollInCourse(courseId).subscribe({
      next: (response) => {
    
        this.isEnrolled = true;
        this.isEnrolling = false;
        this.loadProgress();
        
        // Show success message
        alert(`Successfully enrolled in "${this.course?.title || 'this course'}"!`);
      },
      error: (error) => {
    
        this.isEnrolling = false;
        
        // Handle different error scenarios
        if (error.status === 409 || error.status === 400) {
          this.enrollmentError = 'You are already enrolled in this course.';
          this.isEnrolled = true;
        } else if (error.status === 401) {
          this.enrollmentError = 'Authentication required. Please log in again.';
          this.authService.logout();
        } else if (error.status === 404) {
          this.enrollmentError = 'Course not found.';
        } else {
          this.enrollmentError = error.message || 'Failed to enroll in course. Please try again.';
        }
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/courses']);
  }

  getCourseRating(): number | null {
    // No rating in model yet; hide reviews until available
    return null;
  }

  generateStarArray(rating: number): boolean[] {
    const full = Math.floor(rating);
    return Array.from({ length: 5 }, (_, i) => i < full);
  }

  getLessonCount(): number {
    return this.course?.textContent?.length || 0;
  }

  getLanguageList(): string {
    return (this.course?.languagesAvailable || []).join(', ');
  }

  getCourseLevel(): string {
    const title = (this.course?.title || '').toLowerCase();
    const description = (this.course?.description || '').toLowerCase();
    const content = `${title} ${description}`;
    if (content.includes('beginner') || content.includes('intro') || content.includes('basic') || content.includes('fundamentals')) {
      return 'Beginner';
    } else if (content.includes('advanced') || content.includes('expert') || content.includes('master') || content.includes('professional')) {
      return 'Advanced';
    } else {
      return 'Intermediate';
    }
  }

  getLearningPoints(): string[] {
    const goals = this.course?.goals || [];
    if (goals.length > 0) return goals;
    const lessons = this.course?.textContent || [];
    return lessons.slice(0, 6).map(l => l.title);
  }

  playVideo(event: Event): void {
    // Only authenticated users can play video (this method is only called for authenticated users)
    const button = event.target as HTMLElement;
    const videoOverlay = button.closest('.video-overlay') as HTMLElement;
    const videoWrapper = videoOverlay?.parentElement;
    const video = videoWrapper?.querySelector('video') as HTMLVideoElement;
    
    if (video && videoOverlay) {
      video.play().then(() => {
        videoOverlay.style.display = 'none';
      }).catch((error) => {
    
      });
    }
  }

  handleEnrollment(): void {
    if (!this.isAuthenticated) {
      // Store the current course URL for redirect after login
      this.authService.redirectUrl = `/courses/course-details/${this.courseId}`;
      this.router.navigate(['/login']);
    } else {
      // User is authenticated, proceed with enrollment
      this.enrollInCourse();
    }
  }

  checkEnrollmentStatus(): void {
    if (!this.course?.id || !this.isAuthenticated) {
    
      return;
    }

    
    this.courseService.checkEnrollmentStatus(this.course.id).subscribe({
      next: (response) => {
        // Assuming the API returns { enrolled: boolean }
        this.isEnrolled = response.enrolled || false;
        this.enrollmentError = '';
        if (this.isEnrolled) {
          this.loadProgress();
        }
      },
      error: (error) => {
    
        
        // Handle different error types
        if (error.status === 403) {
    
        } else if (error.status === 401) {
    
          // Optionally redirect to login or refresh token
        }
        
        // If there's an error checking status, assume not enrolled
        this.isEnrolled = false;
        // Don't show error to user for status check failures as it's not critical
      }
    });
  }

  private loadProgress(): void {
    if (!this.course?.id || !this.isAuthenticated) {
      this.progressPercent = 0;
      return;
    }

    this.progressService.getCourseProgress(this.course.id).subscribe({
      next: (enrollment: CourseEnrollment) => {
        const fromProgress = enrollment?.progress?.completionPercentage;
        if (typeof fromProgress === 'number') {
          this.progressPercent = Math.max(0, Math.min(100, Math.round(fromProgress)));
        } else if (Array.isArray(enrollment?.lessons)) {
          this.progressPercent = this.progressService.calculateCompletionPercentage(enrollment.lessons);
        } else {
          this.progressPercent = 0;
        }
        this.progressService.setCurrentProgress(enrollment);
      },
      error: () => {
        this.progressPercent = 0;
      }
    });
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
  }

  formatFileSize(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = (bytes / Math.pow(k, i));
    return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${sizes[i]}`;
  }

  private loadRelatedCourses(): void {
    if (!this.course) {
      return;
    }
    if (!this.isAuthenticated || !this.course.id) {
      this.relatedCourses = [];
      this.relatedStart = 0;
      return;
    }
    this.courseService.getUnenrolledOtherCourses(this.course.id).subscribe({
      next: (courses) => {
        // Backend already excludes current and enrolled
        this.relatedCourses = courses || [];
        // Reset window if out of bounds
        this.relatedStart = 0;
      },
      error: () => {
        this.relatedCourses = [];
      }
    });
  }

  nextRelated(): void {
    const total = this.relatedCourses.length;
    if (total <= 2) return;
    if (this.relatedStart + 2 < total) {
      this.relatedStart += 1;
    }
  }

  prevRelated(): void {
    const total = this.relatedCourses.length;
    if (total <= 2) return;
    if (this.relatedStart > 0) {
      this.relatedStart -= 1;
    }
  }
}
