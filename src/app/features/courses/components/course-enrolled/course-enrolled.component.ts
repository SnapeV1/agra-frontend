import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, Subscription, interval } from 'rxjs';
import { Course, CourseProgress, TextContent } from '../../../../core/models/course';
import { ProgressService, LessonProgress, CourseEnrollment } from '../../../../core/services/progress.service';
import { CertificateService, CertificateData } from '../../../../core/services/certificate.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { CourseService } from '../../../../core/services/course/course.service';
import { SessionService } from 'src/app/core/services/session.service';
import { SessionModule } from 'src/app/core/models/session.module';

@Component({
  selector: 'app-course-enrolled',
  templateUrl: './course-enrolled.component.html',
  styleUrls: ['./course-enrolled.component.css']
})
export class CourseEnrolledComponent implements OnInit, OnDestroy {
  course: Course | null = null;
  courseEnrollment: CourseEnrollment | null = null;
  currentLesson: TextContent | null = null;
  currentLessonIndex = 0;
  
  loading = true;
  error: string | null = null;
  courseId = '';
  
  // Progress tracking
  lessonStartTime: Date | null = null;
  timeTrackingSubscription: Subscription | null = null;
  
  // UI state
  showSidebar = true;
  isFullscreen = false;
  showCompletionModal = false;
  showResources = false;
  showLiveSessions = false;
  certificateUrl: string | null = null;
  isGeneratingCertificate = false;
  certificateData: CertificateData | null = null;
  certificateError: string | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private progressService: ProgressService,
    private courseService: CourseService,
    private certificateService: CertificateService,
    private authService: AuthService,
    private sessionService: SessionService
  ) {}

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('id') || '';
    if (this.courseId) {
      this.loadCourseData();
      this.loadSessions();
    } else {
      this.error = 'Course ID not found';
      this.loading = false;
    }
  }

  toggleLiveSessions(): void {
    this.showLiveSessions = !this.showLiveSessions;
  }

  // Live sessions state
  sessions: SessionModule[] = [];
  sessionsLoading = false;
  sessionsError: string | null = null;
  sessionCarouselIndex = 0;

  private loadSessions(): void {
    if (!this.courseId) return;
    this.sessionsLoading = true;
    this.sessionsError = null;
    this.sessionService.upcoming(this.courseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          this.sessions = items || [];
          this.sessionCarouselIndex = 0;
          this.sessionsLoading = false;
        },
        error: () => {
          this.sessionsError = 'Failed to load live sessions';
          this.sessionsLoading = false;
        }
      });
  }

  isLive(session: SessionModule): boolean {
    const now = Date.now();
    const start = session.startTime ? Date.parse(session.startTime) : NaN;
    const end = session.endTime ? Date.parse(session.endTime) : NaN;
    if (!isNaN(start) && isNaN(end)) {
      // Consider live from start for 2 hours if no end provided
      return now >= start && now <= start + 2 * 60 * 60 * 1000;
    }
    if (!isNaN(start) && !isNaN(end)) {
      return now >= start && now <= end;
    }
    return false;
  }

  joinSession(sessionId?: string): void {
    if (!sessionId) return;
    this.router.navigate(['/courses', this.courseId, 'sessions', sessionId]);
  }

  // Carousel controls for sessions preview
  get currentSession(): SessionModule | null {
    if (!this.sessions || this.sessions.length === 0) return null;
    const idx = Math.min(Math.max(this.sessionCarouselIndex, 0), this.sessions.length - 1);
    return this.sessions[idx];
  }

  prevSession(): void {
    if (!this.sessions || this.sessions.length <= 1) return;
    this.sessionCarouselIndex = (this.sessionCarouselIndex - 1 + this.sessions.length) % this.sessions.length;
  }

  nextSession(): void {
    if (!this.sessions || this.sessions.length <= 1) return;
    this.sessionCarouselIndex = (this.sessionCarouselIndex + 1) % this.sessions.length;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopTimeTracking();
  }

  private loadCourseData(): void {
    if (!this.courseId) return;

    this.loading = true;
    this.error = null;

    // Load course data using real course service only
    this.courseService.getCourseById(this.courseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (course) => {
          this.course = course;
          this.checkDataLoadComplete();
        },
        error: (error) => {
          
          // Handle different error types
          if (error.status === 403) {
            this.error = 'Access denied. You may not have permission to view this course.';
          } else if (error.status === 401) {
            this.error = 'Authentication required. Please log in to view this course.';
          } else if (error.status === 404) {
            this.error = 'Course not found. It may have been removed or the link is invalid.';
          } else {
            this.error = 'Failed to load course data. Please try again later.';
          }
          
          this.loading = false;
        }
      });

    // Load enrollment progress using progress service only
    this.progressService.getCourseProgress(this.courseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (enrollment) => {
           this.courseEnrollment = enrollment;
           this.checkDataLoadComplete();
         },
        error: (error) => {
          
          
          // Create a default enrollment object to allow course viewing without progress
          this.courseEnrollment = {
            courseId: this.courseId,
            currentLessonId: undefined,
            lessons: [],
            progress: {
              courseId: this.courseId,
              enrolledAt: new Date(),
              startedAt: new Date(),
              lastAccessedAt: new Date(),
              completed: false,
              completionPercentage: 0,
              totalSessions: 0,
              completedSessionIds: [],
              totalTimeSpent: 0,
              accessCount: 0
            }
          };
          
          // Handle different error types with warnings instead of blocking errors
          if (error.status === 403) {
            
          } else if (error.status === 401) {
            
          } else if (error.status === 500) {
            
          } else if (error.message === 'Authentication required') {
            
          } else {
            
          }
          
          // Check if we can proceed with course data only
          this.checkDataLoadComplete();
        }
      });
  }

  private checkDataLoadComplete(): void {
    if (this.course && this.courseEnrollment) {
      this.initializeLessons();
      this.setCurrentLesson();
      this.loading = false;
    }
  }

  initializeLessons(): void {
    if (!this.course || !this.courseEnrollment) return;
    
    // Initialize lessons array if it doesn't exist
    if (!this.courseEnrollment.lessons) {
      this.courseEnrollment.lessons = [];
    }
    
    // Sort lessons by order
    this.course.textContent = this.course.textContent.sort((a, b) => a.order - b.order);
    
    // Get valid lesson IDs from course content
    const validLessonIds = this.course.textContent.map(lesson => lesson.id);
    
    // Store original counts for debugging
    const originalLessonsCount = this.courseEnrollment.lessons.length;
    const originalCompletedCount = this.courseEnrollment.lessons.filter(l => l.completed).length;
    
    // Filter out any lesson progress entries that don't correspond to actual course lessons
    this.courseEnrollment.lessons = this.courseEnrollment.lessons.filter(progress => {
      return validLessonIds.includes(progress.lessonId);
    });
    
    // Initialize lesson progress for course lessons that don't have progress yet
    this.course.textContent.forEach(lesson => {
      const existingProgress = this.courseEnrollment!.lessons.find(p => p.lessonId === lesson.id);
      if (!existingProgress) {
        this.courseEnrollment!.lessons.push({
          lessonId: lesson.id || '',
          completed: false,
          timeSpent: 0,
          lastAccessedAt: new Date()
        });
      }
    });
    

  }

  setCurrentLesson(): void {
    if (!this.course || !this.courseEnrollment) return;
    
    // Find current lesson from enrollment or start with first lesson
    let targetLessonId = this.courseEnrollment.currentLessonId;
    
    if (!targetLessonId) {
      // Find first incomplete lesson
      const firstIncompleteLesson = this.courseEnrollment.lessons.find(l => !l.completed);
      targetLessonId = firstIncompleteLesson?.lessonId || this.course.textContent[0]?.id;
    }
    
    const lessonIndex = this.course.textContent.findIndex(lesson => lesson.id === targetLessonId);
    this.currentLessonIndex = lessonIndex >= 0 ? lessonIndex : 0;
    this.currentLesson = this.course.textContent[this.currentLessonIndex] || null;
    
    if (this.currentLesson) {
      this.startTimeTracking();
    }
  }

  selectLesson(lesson: TextContent, index: number): void {
    if (this.currentLesson?.id === lesson.id) {
      return;
    }
    
    // IMPORTANT: Stop time tracking BEFORE changing currentLesson
    // This ensures updateTimeSpent() uses the correct previous lesson
    this.stopTimeTracking();
    
    // Now update to the new lesson
    this.currentLesson = lesson;
    this.currentLessonIndex = index;
    
    // Update current lesson in backend
    if (lesson.id) {
      this.progressService.setCurrentLesson(this.courseId, lesson.id).subscribe();
    }
    
    // Start time tracking for new lesson
    this.startTimeTracking();
  }

  nextLesson(): void {
    if (!this.course || this.currentLessonIndex >= this.course.textContent.length - 1) return;
    
    this.selectLesson(this.course.textContent[this.currentLessonIndex + 1], this.currentLessonIndex + 1);
  }

  previousLesson(): void {
    if (!this.course || this.currentLessonIndex <= 0) return;
    
    this.selectLesson(this.course.textContent[this.currentLessonIndex - 1], this.currentLessonIndex - 1);
  }

  markLessonComplete(): void {
    if (!this.currentLesson?.id || !this.courseEnrollment) {
      return;
    }
    
    const lessonProgress = this.courseEnrollment.lessons.find(l => l.lessonId === this.currentLesson!.id);
    if (!lessonProgress) {
      
      return;
    }
    
    if (lessonProgress.completed) {
      return;
    }

    // Store original state in case we need to rollback
    const originalCompleted = lessonProgress.completed;
    const originalCompletedAt = lessonProgress.completedAt;
    
    // Optimistically update UI
    lessonProgress.completed = true;
    lessonProgress.completedAt = new Date();
    
    // Update backend
    this.progressService.markLessonComplete(this.courseId, this.currentLesson.id).subscribe({
      next: (response) => {
        // Update the progress service's shared state to notify other components
        this.progressService.setCurrentProgress(this.courseEnrollment!);
        
        // Check if course is complete
        this.checkCourseCompletion();
        
        // Auto-advance to next lesson
        setTimeout(() => {
          this.nextLesson();
        }, 1000);
      },
      error: (error) => {
        
        
        // Rollback optimistic update
        lessonProgress.completed = originalCompleted;
        lessonProgress.completedAt = originalCompletedAt;
        
        // Show user-friendly error message
        alert('Failed to mark lesson as complete. Please try again.');
      }
    });
  }

  checkCourseCompletion(): void {
    if (!this.courseEnrollment) return;
    
    const allLessonsCompleted = this.courseEnrollment.lessons.every(l => l.completed);
    if (allLessonsCompleted && !this.courseEnrollment.progress.completed) {
      this.progressService.completeCourse(this.courseId).subscribe({
        next: () => {
          this.courseEnrollment!.progress.completed = true;
          this.courseEnrollment!.progress.completedAt = new Date();
          this.courseEnrollment!.progress.completionPercentage = 100;
          
          // Show completion modal and generate certificate with enhanced data
          this.showCompletionModal = true;
          this.generateEnhancedCertificate();
        },
        error: (error) => {}
      });
    }
  }

  startTimeTracking(): void {
    this.lessonStartTime = new Date();
    
    // Stop any existing subscription
    if (this.timeTrackingSubscription) {
      this.timeTrackingSubscription.unsubscribe();
    }
    
    // Update time every minute
    this.timeTrackingSubscription = interval(60000).subscribe(() => {
      this.updateTimeSpent();
    });
  }

  stopTimeTracking(): void {
    if (this.timeTrackingSubscription) {
      this.timeTrackingSubscription.unsubscribe();
      this.timeTrackingSubscription = null;
    }
    
    // Update time spent for current lesson before stopping
    this.updateTimeSpent();
    
    // Clear the lesson start time
    this.lessonStartTime = null;
  }

  updateTimeSpent(): void {
    if (!this.lessonStartTime || !this.currentLesson?.id || !this.courseEnrollment) {
      return;
    }

    // Additional validation for lesson ID
    if (!this.currentLesson.id) {
      return;
    }

    // Additional validation for courseId
    if (!this.courseId) {
      return;
    }
    
    const timeSpent = Math.floor((new Date().getTime() - this.lessonStartTime.getTime()) / 60000); // minutes
    
    const lessonProgress = this.courseEnrollment.lessons.find(l => l.lessonId === this.currentLesson!.id);
    
    if (!lessonProgress) {
      return;
    }

    // Always update lastAccessedAt, even if timeSpent is 0
    lessonProgress.lastAccessedAt = new Date();
    
    // Only add time if there's actual time spent
    if (timeSpent > 0) {
      lessonProgress.timeSpent += timeSpent;
    }
    
    // Update backend - always send request to update lastAccessedAt
    this.progressService.updateLessonProgress(this.courseId, this.currentLesson.id, lessonProgress.timeSpent).subscribe({
      next: (response) => {
        // Progress updated successfully
      },
      error: (error) => {
        
      }
    });
    
    // Reset start time
    this.lessonStartTime = new Date();
  }

  toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
  }

  toggleResources(): void {
    this.showResources = !this.showResources;
  }


  getLessonProgress(lessonId: string): LessonProgress | null {
    const progress = this.courseEnrollment?.lessons.find(l => l.lessonId === lessonId) || null;
    

    
    return progress;
  }

  getOverallProgress(): number {
    if (!this.courseEnrollment) return 0;
    const progress = this.progressService.calculateCompletionPercentage(this.courseEnrollment.lessons);
    
    return progress;
  }

  getTotalTimeSpent(): number {
    if (!this.courseEnrollment) return 0;
    return this.progressService.getTotalTimeSpent(this.courseEnrollment.lessons);
  }

  

  formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  goBack(): void {
    this.router.navigate(['/courses']);
  }

  generateCertificate(): void {
    this.isGeneratingCertificate = true;
    this.progressService.generateCertificate(this.courseId).subscribe({
      next: (response) => {
        this.certificateUrl = response.certificateUrl;
        this.isGeneratingCertificate = false;
        
        // Update the course enrollment with certificate URL
        if (this.courseEnrollment) {
          this.courseEnrollment.progress.certificateUrl = response.certificateUrl;
        }
      },
      error: () => {
        this.isGeneratingCertificate = false;
      }
    });
  }

  generateEnhancedCertificate(): void {
    if (!this.course || !this.courseEnrollment) {
      this.certificateError = 'Course data not available';
      return;
    }

    const authUser = this.authService.currentUserValue;
    const user = authUser?.user;
    if (!authUser || !user) {
      this.certificateError = 'User not authenticated';
      return;
    }

    this.isGeneratingCertificate = true;
    this.certificateError = null;

    const completionDate = this.courseEnrollment.progress.completedAt || new Date();
    const totalTimeSpent = this.courseEnrollment.progress.totalTimeSpent;
    const totalLessons = this.courseEnrollment.lessons.filter(l => l.completed).length;
    const completionPercentage = this.courseEnrollment.progress.completionPercentage;

    const request = {
      courseId: this.course.id || 'unknown-course',
      studentId: user.id || 'unknown-student',
      completionData: {
        completionDate,
        totalTimeSpent,
        totalLessons,
        completionPercentage
      }
    };

    this.certificateService.generateCertificate(request).subscribe({
      next: (certificateData) => {
        this.certificateData = certificateData;
        this.certificateUrl = certificateData.verificationUrl;
        this.isGeneratingCertificate = false;
        
        // Update the course enrollment with certificate URL
        if (this.courseEnrollment) {
          this.courseEnrollment.progress.certificateUrl = certificateData.verificationUrl;
        }
      },
      error: () => {
        this.certificateError = 'Failed to generate certificate. Please try again.';
        this.isGeneratingCertificate = false;
        
        // Fallback to basic certificate generation
        this.generateCertificate();
      }
    });
  }

  downloadCertificate(): void {
    if (!this.certificateUrl) return;
    
    this.progressService.downloadCertificate(this.courseId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.course?.title || 'Course'}_Certificate.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {}
    });
  }

  viewCertificate(): void {
    if (this.certificateData) {
      // Navigate to the enhanced certificate component
      this.router.navigate(['/courses/certificate', this.courseId]);
    } else if (this.certificateUrl) {
      // Fallback to basic certificate URL
      window.open(this.certificateUrl, '_blank');
    }
  }

  closeCompletionModal(): void {
    this.showCompletionModal = false;
  }

  shareAchievement(): void {
    if (navigator.share && this.course) {
      navigator.share({
        title: `I completed ${this.course.title}!`,
        text: `I just completed the course "${this.course.title}" and earned my certificate!`,
        url: window.location.href
      }).catch(() => {});
    } else {
      // Fallback for browsers that don't support Web Share API
      const text = `I just completed the course "${this.course?.title}" and earned my certificate!`;
      navigator.clipboard.writeText(text).then(() => {
        alert('Achievement text copied to clipboard!');
      }).catch(() => {
        alert('Unable to share. Please copy the URL manually.');
      });
    }
  }
}
