import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Course } from 'src/app/core/models/course';
import { CourseService } from 'src/app/core/services/course/course.service';
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
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private authService: AuthService
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
      },
      error: (err) => {
        console.error('Error loading course:', err);
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
        console.log('Enrollment successful:', response);
        this.isEnrolled = true;
        this.isEnrolling = false;
        
        // Show success message
        alert(`Successfully enrolled in "${this.course?.title || 'this course'}"!`);
      },
      error: (error) => {
        console.error('Enrollment failed:', error);
        this.isEnrolling = false;
        
        // Handle different error scenarios
        if (error.status === 409 || error.status === 400) {
          this.enrollmentError = 'You are already enrolled in this course.';
          this.isEnrolled = true;
        } else if (error.status === 401) {
          this.enrollmentError = 'Authentication required. Please log in again.';
          this.authService.logout('/login');
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
    const r = 4.5;
    return typeof r === 'number' ? r : null;
  }

  generateStarArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, index) => index < rating);
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
        console.error('Error playing video:', error);
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
      console.log('Skipping enrollment status check - Course ID:', this.course?.id, 'Authenticated:', this.isAuthenticated);
      return;
    }

    console.log('Checking enrollment status for course:', this.course.id, 'User authenticated:', this.isAuthenticated);
    this.courseService.checkEnrollmentStatus(this.course.id).subscribe({
      next: (response) => {
        // Assuming the API returns { enrolled: boolean }
        this.isEnrolled = response.enrolled || false;
        this.enrollmentError = '';
      },
      error: (error) => {
        console.error('Error checking enrollment status:', error);
        
        // Handle different error types
        if (error.status === 403) {
          console.warn('Access forbidden for enrollment status check - user may not have permission');
        } else if (error.status === 401) {
          console.warn('Unauthorized - token may be invalid or expired');
          // Optionally redirect to login or refresh token
        }
        
        // If there's an error checking status, assume not enrolled
        this.isEnrolled = false;
        // Don't show error to user for status check failures as it's not critical
      }
    });
  }
}