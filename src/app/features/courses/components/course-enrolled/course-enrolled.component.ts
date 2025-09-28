import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, Subscription, interval } from 'rxjs';
import { Course, CourseProgress, TextContent } from '../../../../core/models/course';
import { ProgressService, LessonProgress, CourseEnrollment } from '../../../../core/services/progress.service';

import { CourseService } from '../../../../core/services/course/course.service';

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
  certificateUrl: string | null = null;
  isGeneratingCertificate = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private progressService: ProgressService,
    private courseService: CourseService
  ) {}

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('id') || '';
    if (this.courseId) {
      this.loadCourseData();
    } else {
      this.error = 'Course ID not found';
      this.loading = false;
    }
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
          console.error('Error loading course:', error);
          
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
          console.error('Error loading progress:', error);
          
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
            console.warn('Access forbidden for progress data - user may not have permission. Continuing with default progress.');
          } else if (error.status === 401) {
            console.warn('Unauthorized - token may be invalid or expired. Continuing with default progress.');
          } else if (error.status === 500) {
            console.warn('Server error loading progress data. Continuing with default progress.');
          } else if (error.message === 'Authentication required') {
            console.warn('No authentication token found. Continuing with default progress.');
          } else {
            console.warn('Failed to load progress data. Continuing with default progress.');
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
      console.error('Cannot find lesson progress for lesson:', this.currentLesson.id);
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
        console.error('Error marking lesson complete:', error);
        
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
          
          // Show completion modal and generate certificate
          this.showCompletionModal = true;
          this.generateCertificate();
        },
        error: (error) => console.error('Error completing course:', error)
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
        console.error('Error updating lesson progress:', error);
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
      error: (error) => {
        console.error('Error generating certificate:', error);
        this.isGeneratingCertificate = false;
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
      error: (error) => console.error('Error downloading certificate:', error)
    });
  }

  viewCertificate(): void {
    if (this.certificateUrl) {
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
      }).catch(console.error);
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
