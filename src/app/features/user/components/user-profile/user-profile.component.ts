import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { User } from '../../../../core/models/user.model';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { ProfileService } from 'src/app/core/services/profile/profile.service';
import { CourseService } from 'src/app/core/services/course/course.service';
import { ProgressService } from 'src/app/core/services/progress.service';
import { Course, CourseProgress } from 'src/app/core/models/course';

interface ProfileStats {
  icon: string;
  label: string;
  value: string | number;
  color: string;
}

interface EnrolledCourse {
  courseId: string;
  course?: Course; // Optional since we'll fetch it separately
  progress: CourseProgress;
  status: 'not-started' | 'in-progress' | 'completed';
  showSessionDetails?: boolean; // For expandable session progress
}

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  userProfile: User | null = null;
  isEditing = false;
  isLoading = true;
  isSaving = false;
  editForm: Partial<User> = {};
  originalProfile: User | null = null;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  
  enrolledCourses: EnrolledCourse[] = [];
  coursesLoading = false;
  coursesError = '';

  stats: ProfileStats[] = [
    {
      icon: 'book',
      label: 'Courses Completed',
      value: 0,
      color: 'bg-green-50 text-green-700'
    },
    {
      icon: 'star',
      label: 'Average Score',
      value: '0%',
      color: 'bg-blue-50 text-blue-700'
    },
    {
      icon: 'clock',
      label: 'Hours Studied',
      value: 0,
      color: 'bg-purple-50 text-purple-700'
    },
    {
      icon: 'trophy',
      label: 'Certificates Earned',
      value: 0,
      color: 'bg-amber-50 text-amber-700'
    }
  ];

  constructor(
    private authService: AuthService, 
    private profileService: ProfileService,
    private courseService: CourseService,
    private progressService: ProgressService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.subscribeToUserChanges();
    this.loadEnrolledCourses();
    this.subscribeToProgressUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToUserChanges(): void {
    this.authService.currentUser
      .pipe(takeUntil(this.destroy$))
      .subscribe(authUser => {
        if (authUser?.user) {
          this.userProfile = authUser.user;
          this.isLoading = false;
        }
      });
  }

  private subscribeToProgressUpdates(): void {
    this.progressService.currentProgress$
      .pipe(takeUntil(this.destroy$))
      .subscribe(updatedProgress => {
        if (updatedProgress) {
          // Find the corresponding enrolled course and update its progress
          const enrolledCourseIndex = this.enrolledCourses.findIndex(
            course => course.courseId === updatedProgress.courseId
          );
          
          if (enrolledCourseIndex !== -1) {
            // Update the progress data
            const newCompletionPercentage = this.progressService.calculateCompletionPercentage(updatedProgress.lessons);
            
            this.enrolledCourses[enrolledCourseIndex].progress.completionPercentage = newCompletionPercentage;
            this.enrolledCourses[enrolledCourseIndex].progress.completedSessionIds = updatedProgress.lessons
              .filter(l => l.completed)
              .map(l => l.lessonId);
            this.enrolledCourses[enrolledCourseIndex].status = this.getStatusFromProgress(newCompletionPercentage);
            
            // Update stats
            this.updateStats();
          }
        }
      });
  }

  private loadUserProfile(): void {
    this.isLoading = true;
    
    const currentAuthUser = this.authService.currentUserValue;
    if (currentAuthUser?.user) {
      this.userProfile = currentAuthUser.user;
      this.isLoading = false;
    }

    this.authService.getCurrentUserFromBackend()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: User) => {
          this.userProfile = user;
          this.isLoading = false;
        },
        error: (error) => {
    
          this.isLoading = false;
        }
      });
  }

  loadEnrolledCourses(): void {
    if (!this.authService.getToken()) {
      return;
    }

    this.coursesLoading = true;
    this.coursesError = '';

    this.courseService.getUserEnrolledCourses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (progressList: CourseProgress[]) => {
          // Filter out progress entries with undefined or null courseId
          const validProgressList = progressList.filter(progress => {
            if (!progress.courseId) {
    
              return false;
            }
            return true;
          });

          // Initialize enrolled courses with progress data (progress will be recalculated after course details are fetched)
          this.enrolledCourses = validProgressList.map(progress => ({
            courseId: progress.courseId,
            progress: progress, // Keep original progress for now
            status: this.getStatusFromProgress(progress.completionPercentage), // Will be updated after course details
            course: undefined // Will be populated when course details are fetched
          }));

          // Fetch course details for each enrolled course
          this.fetchCourseDetails();
        },
        error: (error) => {
    
          this.coursesError = 'Failed to load enrolled courses';
          this.coursesLoading = false;
        }
      });
  }

  private fetchCourseDetails(): void {
    let completedRequests = 0;
    const totalRequests = this.enrolledCourses.length;

    if (totalRequests === 0) {
      this.coursesLoading = false;
      this.updateStats();
      return;
    }

    this.enrolledCourses.forEach((enrolledCourse, index) => {
      // Additional safety check for undefined courseId
      if (!enrolledCourse.courseId) {
        completedRequests++;
        if (completedRequests === totalRequests) {
          this.coursesLoading = false;
          this.updateStats();
        }
        return;
      }

      this.courseService.getCourseById(enrolledCourse.courseId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (course: Course) => {
            this.enrolledCourses[index].course = course;
            
            // Now recalculate progress using the correct total lessons count from course data
            const totalLessons = course.textContent?.length || 0;
            const completedLessons = this.enrolledCourses[index].progress.completedSessionIds?.length || 0;
            const recalculatedPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
            
            // Update the progress object with the correct percentage
            this.enrolledCourses[index].progress = {
              ...this.enrolledCourses[index].progress,
              completionPercentage: recalculatedPercentage
            };
            
            // Update the status based on the recalculated percentage
            this.enrolledCourses[index].status = this.getStatusFromProgress(recalculatedPercentage);
            
            completedRequests++;
            
            // Check if all course details have been fetched
            if (completedRequests === totalRequests) {
              this.coursesLoading = false;
              this.updateStats();
            }
          },
          error: (error) => {
            // Set fallback course data
            this.enrolledCourses[index].course = {
              id: enrolledCourse.courseId,
              title: `Course ${enrolledCourse.courseId}`,
              imageUrl: 'https://res.cloudinary.com/dmumvupow/image/upload/v1758218323/defaultCourse_qqgiil.png',
              description: 'Course details unavailable',
              domain: 'N/A',
              country: 'N/A',
              trainerId: '',
              sessionIds: [],
              languagesAvailable: [],
              createdAt: new Date(),
              updatedAt: new Date(),
              archived: false,
              files: [],
              textContent: [],
              goals: []
            };
            completedRequests++;
            
            // Check if all requests have been completed (successful or failed)
            if (completedRequests === totalRequests) {
              this.coursesLoading = false;
              this.updateStats();
            }
          }
        });
    });
  }

  private getStatusFromProgress(percentage: number): 'not-started' | 'in-progress' | 'completed' {
    if (percentage === 0) return 'not-started';
    if (percentage === 100) return 'completed';
    return 'in-progress';
  }

  private updateStats(): void {
    const completedCourses = this.enrolledCourses.filter(course => course.status === 'completed').length;
    const totalProgress = this.enrolledCourses.reduce((sum, course) => sum + (course.progress?.completionPercentage || 0), 0);
    const averageScore = this.enrolledCourses.length > 0 ? Math.round(totalProgress / this.enrolledCourses.length) : 0;
    const totalHours = this.enrolledCourses.reduce((sum, course) => sum + (course.progress?.totalTimeSpent || 0), 0);
    
    this.stats = [
      {
        ...this.stats[0],
        value: completedCourses
      },
      {
        ...this.stats[1],
        value: `${averageScore}%`
      },
      {
        ...this.stats[2],
        value: Math.floor(totalHours / 60) // Convert minutes to hours
      },
      {
        ...this.stats[3],
        value: completedCourses
      }
    ];
  }

  toggleEdit(): void {
    if (!this.userProfile) return;

    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.originalProfile = JSON.parse(JSON.stringify(this.userProfile));
      this.editForm = { ...this.userProfile };
      this.selectedFile = null;
      this.previewUrl = null;
    } else {
      this.resetEditState();
    }
  }

  saveProfile(): void {
    if (!this.userProfile || !this.editForm || this.isSaving) return;

    this.isSaving = true;
    
    const updateData: any = {};
    
    if (this.editForm.name && this.editForm.name !== this.originalProfile?.name) {
      updateData.name = this.editForm.name;
    }
    if (this.editForm.email && this.editForm.email !== this.originalProfile?.email) {
      updateData.email = this.editForm.email;
    }
    if (this.editForm.phone && this.editForm.phone !== this.originalProfile?.phone) {
      updateData.phone = this.editForm.phone;
    }
    if (this.editForm.country && this.editForm.country !== this.originalProfile?.country) {
      updateData.country = this.editForm.country;
    }
    if (this.editForm.language && this.editForm.language !== this.originalProfile?.language) {
      updateData.language = this.editForm.language;
    }
    if (this.editForm.domain && this.editForm.domain !== this.originalProfile?.domain) {
      updateData.domain = this.editForm.domain;
    }

    this.profileService.updateUserProfile(updateData, this.selectedFile || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser: User) => {
          this.userProfile = updatedUser;
          
          this.authService.updateCurrentUser(updatedUser);
          
          this.resetEditState();
          this.isEditing = false;
          this.isSaving = false;
          
      
        },
        error: (error) => {
          
          this.isSaving = false;
          
          if (error.status === 401) {
            
            this.authService.logout('/login');
          } else if (error.status === 400) {
            
          } else {
            
          }
          
         
        }
      });
  }

  onProfilePictureChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0] || !this.isEditing) return;

    const file = input.files[0];
    
    if (!file.type.startsWith('image/')) {
      
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      
      return;
    }

    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  cancelEdit(): void {
    if (!this.originalProfile) return;

    this.userProfile = JSON.parse(JSON.stringify(this.originalProfile));
    
    this.resetEditState();
    this.isEditing = false;
  }

  private resetEditState(): void {
    this.editForm = {};
    this.originalProfile = null;
    this.selectedFile = null;
    this.previewUrl = null;
    this.isSaving = false;
  }

  getDisplayPicture(): string {
    if (this.isEditing && this.previewUrl) {
      return this.previewUrl;
    }
    return this.userProfile?.picture || '';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'not-started':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  continueCourse(courseId: string): void {
    this.router.navigate(['/courses/course-enrolled', courseId]);
  }

  startCourse(courseId: string): void {
    this.router.navigate(['/courses/course-enrolled', courseId]);
  }

  viewCertificate(courseId: string): void {
    const enrolledCourse = this.enrolledCourses.find(ec => ec.courseId === courseId);
    if (enrolledCourse && enrolledCourse.status === 'completed') {
      // Navigate to certificate view
      this.router.navigate(['/courses/certificate', courseId]);
    }
  }

  getUserDisplayName(): string {
    if (this.isEditing && this.editForm.name) {
      return this.editForm.name;
    }
    if (!this.userProfile) return 'User';
    return this.userProfile.name || this.userProfile.email.split('@')[0] || 'User';
  }

  getUserRole(): string {
    if (!this.userProfile) return 'Member';
    return this.userProfile.role === 'ADMIN' ? 'Administrator' : 'Member';
  }


getMemberSince(): string {
  const date = this.userProfile?.registeredAt ? new Date(this.userProfile.registeredAt) : null;
  if (!date) return '';

  const formatted = date.toLocaleString('default', { month: 'long', year: 'numeric' });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}



  getLocation(): string {
    return 'Agriculture';
  }

  getUserEmail(): string {
    if (this.isEditing && this.editForm.email) {
      return this.editForm.email;
    }
    return this.userProfile?.email || '';
  }

  getUserPhone(): string {
    if (this.isEditing && this.editForm.phone) {
      return this.editForm.phone;
    }
    return this.userProfile?.phone || '+33 1 23 45 67 89';
  }

  hasFormChanges(): boolean {
    if (!this.originalProfile || !this.isEditing) return false;
    
    return (
      this.selectedFile !== null ||
      this.editForm.name !== this.originalProfile.name ||
      this.editForm.email !== this.originalProfile.email ||
      this.editForm.phone !== this.originalProfile.phone ||
      this.editForm.country !== this.originalProfile.country ||
      this.editForm.language !== this.originalProfile.language ||
      this.editForm.domain !== this.originalProfile.domain
    );
  }

  getHoursFromMinutes(minutes: number): number {
    return Math.floor(minutes / 60);
  }

  // Enhanced progress tracking methods
  getSessionProgress(enrolledCourse: EnrolledCourse): { completed: number; total: number; percentage: number } {
    const completed = enrolledCourse.progress.completedSessionIds?.length || 0;
    const total = enrolledCourse.progress.totalSessions || 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  }

  getProgressMilestone(percentage: number): { label: string; color: string; icon: string } {
    if (percentage === 0) {
      return { label: 'Not Started', color: 'text-gray-500', icon: '🎯' };
    } else if (percentage < 25) {
      return { label: 'Getting Started', color: 'text-blue-500', icon: '🚀' };
    } else if (percentage < 50) {
      return { label: 'Making Progress', color: 'text-yellow-500', icon: '⚡' };
    } else if (percentage < 75) {
      return { label: 'Halfway There', color: 'text-orange-500', icon: '🔥' };
    } else if (percentage < 100) {
      return { label: 'Almost Done', color: 'text-purple-500', icon: '🎉' };
    } else {
      return { label: 'Completed', color: 'text-green-500', icon: '✅' };
    }
  }

  getEstimatedTimeToComplete(enrolledCourse: EnrolledCourse): string {
    const progress = enrolledCourse.progress;
    if (!progress || progress.completionPercentage >= 100) {
      return 'Completed';
    }

    const timeSpent = progress.totalTimeSpent || 0;
    const completionPercentage = progress.completionPercentage || 0;
    
    if (completionPercentage === 0 || timeSpent === 0) {
      return 'Time estimate unavailable';
    }

    const estimatedTotalTime = (timeSpent / completionPercentage) * 100;
    const remainingTime = estimatedTotalTime - timeSpent;
    const remainingHours = Math.ceil(remainingTime / 60);

    if (remainingHours <= 0) {
      return 'Almost done!';
    } else if (remainingHours === 1) {
      return '~1 hour remaining';
    } else {
      return `~${remainingHours} hours remaining`;
    }
  }

  // Session-level tracking methods
  getSessionArray(totalSessions: number): number[] {
    return Array.from({ length: totalSessions }, (_, i) => i + 1);
  }

  isSessionCompleted(enrolledCourse: EnrolledCourse, sessionNumber: number): boolean {
    const completedSessions = enrolledCourse.progress.completedSessionIds || [];
    return completedSessions.includes(sessionNumber.toString());
  }

  isCurrentSession(enrolledCourse: EnrolledCourse, sessionNumber: number): boolean {
    const currentSessionId = enrolledCourse.progress.currentSessionId;
    return currentSessionId === sessionNumber.toString() && !this.isSessionCompleted(enrolledCourse, sessionNumber);
  }

  getSessionTooltip(enrolledCourse: EnrolledCourse, sessionNumber: number): string {
    if (this.isSessionCompleted(enrolledCourse, sessionNumber)) {
      return `Session ${sessionNumber}: Completed`;
    } else if (this.isCurrentSession(enrolledCourse, sessionNumber)) {
      return `Session ${sessionNumber}: In Progress`;
    } else {
      return `Session ${sessionNumber}: Not Started`;
    }
  }
}