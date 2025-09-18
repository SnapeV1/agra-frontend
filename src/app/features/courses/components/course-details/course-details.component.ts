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
      },
      error: (err) => {
        console.error('Error loading course:', err);
        this.error = 'Failed to load course details. Please try again.';
        this.loading = false;
      }
    });
  }

  enrollInCourse(): void {
    if (!this.course) return;
    
    // Check authentication before enrollment
    if (!this.isAuthenticated) {
      this.handleEnrollment();
      return;
    }
    
    // Implement enrollment logic here
    console.log('Enrolling in course:', this.course);
    
    // You might want to call an enrollment service
    // this.enrollmentService.enrollInCourse(this.course.id).subscribe(...)
    
    // For now, just show an alert
    alert(`Successfully enrolled in "${this.course.title}"!`);
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
}