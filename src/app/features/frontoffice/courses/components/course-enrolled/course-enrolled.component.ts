import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, Subscription, interval } from 'rxjs';
import { Course, TextContent } from 'src/app/core/models/course';
import { ProgressService, LessonProgress, CourseEnrollment } from 'src/app/core/services/progress.service';
import { CertificateService, CertificateData } from 'src/app/core/services/certificate.service';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { CourseService } from 'src/app/core/services/course/course.service';
import { LiveSessionLauncherService } from 'src/app/core/services/live-session-launcher.service';
import { SessionService } from 'src/app/core/services/session.service';
import { SessionModule } from 'src/app/core/models/session.model';
import { TranslateService } from '@ngx-translate/core';

interface QuizRunState {
  currentIndex: number;
  answers: Record<number, string>;
  submitted: boolean;
  score: number;
  allCorrect: boolean;
}

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
  certificateCode: string | null = null;
  certificateIssuedAt: Date | null = null;
  isGeneratingCertificate = false;
  certificateData: CertificateData | null = null;
  certificateError: string | null = null;
  private idleTimer: any;
  private readonly idleTimeoutMs = 60000;
  isIdle = false;
  quizStates: Record<string, QuizRunState> = {};
  quizStatusMessage: string | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private progressService: ProgressService,
    private courseService: CourseService,
    private certificateService: CertificateService,
    private authService: AuthService,
    private sessionService: SessionService,
    private liveSessionLauncher: LiveSessionLauncherService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('id') || '';
    if (this.courseId) {
      this.loadCourseData();
      this.loadSessions();
    } else {
      this.error = 'courseEnrolled.errors.courseIdMissing';
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
  joiningSessionId: string | null = null;
  joinPopupBlockedUrl: string | null = null;
  sessionJoinError: string | null = null;

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
          this.sessionsError = 'courseEnrolled.errors.liveSessionsFailed';
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
    this.sessionJoinError = null;
    this.joinPopupBlockedUrl = null;
    this.joiningSessionId = sessionId;

    this.liveSessionLauncher.launch(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.joiningSessionId = null;
          if (res?.blocked) {
            this.sessionJoinError = 'courseEnrolled.errors.popupBlocked';
            this.joinPopupBlockedUrl = res.targetUrl;
          }
        },
        error: (err) => {
          console.error('[CourseEnrolled] join session failed', err);
          this.sessionJoinError = 'courseEnrolled.errors.joinSessionFailed';
          this.joiningSessionId = null;
        }
      });
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

  get hasLiveSession(): boolean {
    return (this.sessions || []).some(s => this.isLive(s));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopTimeTracking();
    this.clearIdleTimer();
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
          this.course = this.normalizeQuizLessons(course);
          this.checkDataLoadComplete();
        },
        error: (error) => {
          
          // Handle different error types
          if (error.status === 403) {
            this.error = 'courseEnrolled.errors.accessDenied';
          } else if (error.status === 401) {
            this.error = 'courseEnrolled.errors.authRequired';
          } else if (error.status === 404) {
            this.error = 'courseEnrolled.errors.courseNotFound';
          } else {
            this.error = 'courseEnrolled.errors.courseLoadFailed';
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
              accessCount: 0,
              certificateUrl: undefined,
              certificateCode: undefined,
              certificateIssuedAt: undefined
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

  private normalizeQuizLessons(course: Course): Course {
    const normalized = { ...course };
    normalized.textContent = (course.textContent || []).map((lesson) => {
      const rawType = (lesson.type || '').toString().toLowerCase();
      const normalizedType: 'lesson' | 'assignment' | 'reading' | 'quiz' =
        rawType === 'quiz'
          ? 'quiz'
          : rawType === 'assignment'
          ? 'assignment'
          : rawType === 'reading'
          ? 'reading'
          : 'lesson';

      if (normalizedType !== 'quiz') {
        return { ...lesson, type: normalizedType } as TextContent;
      }

      const quizQuestions = (lesson as any).quizQuestions || [];
      const mappedQuestions = (quizQuestions.length ? quizQuestions : lesson.questions || []).map((q: any) => {
        const answers = (q.answers || []) as Array<{ text?: string; correct?: boolean; isCorrect?: boolean; isTrue?: boolean }>;
        const options = (q.options && q.options.length ? q.options : answers.map(a => a.text).filter(Boolean)) as string[];
        const correctAnswer = q.correctAnswer || answers.find(a => a?.correct || a?.isCorrect || a?.isTrue)?.text || '';
        return {
          id: q.id,
          question: q.question || '',
          options: options && options.length ? options : ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
          correctAnswer
        };
      });

      return { ...(lesson as any), type: 'quiz', questions: mappedQuestions } as TextContent;
    }) as TextContent[];
    return normalized;
  }

  private checkDataLoadComplete(): void {
    if (this.course && this.courseEnrollment) {
      this.initializeLessons();
      this.setCurrentLesson();
      this.refreshCompletionPercentage();
      this.loading = false;
      this.syncCertificateMetadata();
    }
  }

  initializeLessons(): void {
    if (!this.course || !this.courseEnrollment) return;
    
    // Ensure every lesson has a stable id for progress tracking
    this.course.textContent = this.course.textContent.map((lesson, idx) => ({
      ...lesson,
      id: lesson.id || `lesson-${lesson.order ?? idx + 1}`
    }));

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
      this.prepareQuizStateForLesson(this.currentLesson);
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
    this.quizStatusMessage = null;
    
    // Update current lesson in backend
    if (lesson.id) {
      this.progressService.setCurrentLesson(this.courseId, lesson.id).subscribe();
    }
    
    // Start time tracking for new lesson
    this.prepareQuizStateForLesson(lesson);
    this.startTimeTracking();
  }

  private prepareQuizStateForLesson(lesson: TextContent | null): void {
    if (!lesson || lesson.type !== 'quiz' || !lesson.id) {
      return;
    }
    const totalQuestions = lesson.questions?.length || 0;
    const existing = this.quizStates[lesson.id] || {
      currentIndex: 0,
      answers: {},
      submitted: false,
      score: 0,
      allCorrect: false
    };

    // Ensure we always have an entry for each question index
    for (let i = 0; i < totalQuestions; i++) {
      if (existing.answers[i] === undefined) {
        existing.answers[i] = '';
      }
    }

    // Clamp current index to available questions
    existing.currentIndex = Math.min(existing.currentIndex, Math.max(0, totalQuestions - 1));
    this.quizStates[lesson.id] = existing;
  }

  get currentQuizState(): QuizRunState | null {
    if (!this.currentLesson || this.currentLesson.type !== 'quiz' || !this.currentLesson.id) {
      return null;
    }
    return this.quizStates[this.currentLesson.id] || null;
  }

  get currentQuizQuestion(): any {
    if (!this.currentLesson || this.currentLesson.type !== 'quiz') {
      return null;
    }
    const idx = this.currentQuizState?.currentIndex || 0;
    return this.currentLesson.questions?.[idx] || null;
  }

  get quizQuestionCount(): number {
    if (!this.currentLesson || this.currentLesson.type !== 'quiz') {
      return 0;
    }
    return this.currentLesson.questions?.length || 0;
  }

  get quizAnsweredCount(): number {
    const state = this.currentQuizState;
    if (!state) return 0;
    return Object.values(state.answers || {}).filter(value => !!value).length;
  }

  get quizProgressPercent(): number {
    const total = this.quizQuestionCount;
    if (!total) return 0;
    return Math.round((this.quizAnsweredCount / total) * 100);
  }

  private getLessonQuizState(lesson: TextContent | null): QuizRunState | null {
    if (!lesson?.id || lesson.type !== 'quiz') {
      return null;
    }
    return this.quizStates[lesson.id] || null;
  }

  getSelectedAnswer(index?: number): string {
    const state = this.currentQuizState;
    if (!state) return '';
    const idx = typeof index === 'number' ? index : state.currentIndex;
    return state.answers[idx] || '';
  }

  nextQuizQuestion(): void {
    const state = this.currentQuizState;
    if (!state || this.quizQuestionCount === 0) return;
    if (!this.getSelectedAnswer(state.currentIndex)) {
      this.quizStatusMessage = 'courseEnrolled.quiz.selectAnswer';
      return;
    }
    this.quizStatusMessage = null;
    if (state.currentIndex < this.quizQuestionCount - 1) {
      state.currentIndex += 1;
    }
  }

  previousQuizQuestion(): void {
    const state = this.currentQuizState;
    if (!state) return;
    this.quizStatusMessage = null;
    if (state.currentIndex > 0) {
      state.currentIndex -= 1;
    }
  }

  selectQuizOption(option: string): void {
    const state = this.currentQuizState;
    if (!state || !this.currentLesson?.id) {
      return;
    }
    state.answers[state.currentIndex] = option;
    this.quizStatusMessage = null;
  }

  submitQuiz(): void {
    if (!this.currentLesson || this.currentLesson.type !== 'quiz' || !this.currentLesson.id) {
      return;
    }
    const state = this.currentQuizState;
    const total = this.quizQuestionCount;
    if (!state || total === 0) {
      this.quizStatusMessage = 'courseEnrolled.quiz.noQuestions';
      return;
    }
    const answeredAll = this.quizAnsweredCount === total && Object.values(state.answers).every(ans => !!ans);
    if (!answeredAll) {
      this.quizStatusMessage = 'courseEnrolled.quiz.answerAll';
      return;
    }

    let correct = 0;
    this.currentLesson.questions?.forEach((q, idx) => {
      const selected = state.answers[idx];
      if (selected && q.correctAnswer && selected === q.correctAnswer) {
        correct += 1;
      }
    });

    state.score = correct;
    state.submitted = true;
    state.allCorrect = correct === total;
    this.quizStatusMessage = state.allCorrect
      ? 'courseEnrolled.quiz.perfect'
      : 'courseEnrolled.quiz.reviewTryAgain';

    // Auto-complete the lesson when all answers are correct
    if (state.allCorrect && !this.getLessonProgress(this.currentLesson.id || '')?.completed) {
      this.markLessonComplete();
    }
  }

  resetQuizAttempt(): void {
    if (!this.currentLesson?.id || this.currentLesson.type !== 'quiz') {
      return;
    }
    const state = this.quizStates[this.currentLesson.id];
    if (state) {
      state.submitted = false;
      state.score = 0;
      state.allCorrect = false;
    }
    this.quizStatusMessage = null;
  }

  isLastQuizQuestion(): boolean {
    const state = this.currentQuizState;
    if (!state) return false;
    return state.currentIndex >= this.quizQuestionCount - 1;
  }

  nextLesson(): void {
    if (!this.course || this.currentLessonIndex >= this.course.textContent.length - 1) return;
    
    this.selectLesson(this.course.textContent[this.currentLessonIndex + 1], this.currentLessonIndex + 1);
  }

  previousLesson(): void {
    if (!this.course || this.currentLessonIndex <= 0) return;
    
    this.selectLesson(this.course.textContent[this.currentLessonIndex - 1], this.currentLessonIndex - 1);
  }

  canMarkCurrentLessonComplete(): boolean {
    if (!this.currentLesson) {
      return false;
    }
    if (this.currentLesson.type !== 'quiz') {
      return true;
    }
    const quizState = this.getLessonQuizState(this.currentLesson);
    return !!(quizState && quizState.submitted && quizState.allCorrect);
  }

  isQuizLessonPassable(): boolean {
    if (!this.currentLesson || this.currentLesson.type !== 'quiz') {
      return true;
    }
    return this.canMarkCurrentLessonComplete();
  }

  getQuizCompletionLockReason(): string {
    if (!this.currentLesson || this.currentLesson.type !== 'quiz') {
      return '';
    }
    const quizState = this.getLessonQuizState(this.currentLesson);
    if (!quizState?.submitted) {
      return this.translate.instant('courseEnrolled.quiz.lockSubmitToUnlock');
    }
    if (!quizState.allCorrect) {
      return this.translate.instant('courseEnrolled.quiz.lockAllCorrectToUnlock');
    }
    return '';
  }

  markLessonComplete(): void {
    if (!this.currentLesson?.id || !this.courseEnrollment) {
      return;
    }

    if (this.currentLesson.type === 'quiz') {
      const quizState = this.getLessonQuizState(this.currentLesson);
      if (!quizState?.submitted) {
        this.quizStatusMessage = 'courseEnrolled.quiz.submitToComplete';
        return;
      }
      if (!quizState.allCorrect) {
        this.quizStatusMessage = 'courseEnrolled.quiz.allCorrectToComplete';
        return;
      }
    }

    this.quizStatusMessage = null;
    
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
        this.refreshCompletionPercentage();
        
        // Check if course is complete
        this.checkCourseCompletion();
        
        // Auto-advance to next lesson
        this.nextLesson();
      },
      error: (error) => {
        
        
        // Rollback optimistic update
        lessonProgress.completed = originalCompleted;
        lessonProgress.completedAt = originalCompletedAt;
        
        // Show user-friendly error message
        alert(this.translate.instant('courseEnrolled.errors.markCompleteFailed'));
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
          this.refreshCompletionPercentage();
          
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
    this.isIdle = false;
    this.clearIdleTimer();
    
    // Stop any existing subscription
    if (this.timeTrackingSubscription) {
      this.timeTrackingSubscription.unsubscribe();
    }
    
    // Update time every minute
    this.timeTrackingSubscription = interval(60000).subscribe(() => {
      this.updateTimeSpent();
    });
    this.resetIdleTimer();
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
    this.clearIdleTimer();
  }

  updateTimeSpent(): void {
    if (!this.lessonStartTime || !this.currentLesson?.id || !this.courseEnrollment) {
      return;
    }

    // Skip tracking when user is not authenticated (avoid 403 errors)
    if (!this.authService.getToken()) {
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
      next: () => {},
      error: () => {
        // Swallow errors to avoid surfacing when user session is invalid/expired
      }
    });
    
    // Reset start time
    this.lessonStartTime = new Date();
    this.resetIdleTimer();
  }

  private resetIdleTimer(): void {
    if (!this.timeTrackingSubscription) {
      return;
    }
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    this.idleTimer = setTimeout(() => this.handleIdleTimeout(), this.idleTimeoutMs);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private handleIdleTimeout(): void {
    if (this.isIdle) {
      return;
    }
    this.isIdle = true;
    this.stopTimeTracking();
  }

  @HostListener('document:mousemove')
  @HostListener('document:keydown')
  @HostListener('document:click')
  @HostListener('document:touchstart')
  handleUserActivity(): void {
    if (!this.courseEnrollment || !this.currentLesson) {
      return;
    }

    if (this.isIdle) {
      this.startTimeTracking();
    } else {
      this.resetIdleTimer();
    }
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

  // Removed URL editing helper; using file.url as-is

  getFileType(file: { name?: string; type?: string }): string {
    if (file?.type) {
      const subtype = file.type.split('/')[1] || file.type;
      return (subtype || '').toUpperCase();
    }
    const name = file?.name || '';
    const dot = name.lastIndexOf('.')
    return dot !== -1 ? name.substring(dot + 1).toUpperCase() : 'FILE';
  }

  getFileIcon(file: { name?: string; type?: string }): string {
    const type = (file?.type || '').toLowerCase();
    const name = (file?.name || '').toLowerCase();
    const is = (ext: string) => name.endsWith('.' + ext) || type.includes(ext);
    if (is('pdf')) return 'FileText';
    if (is('zip') || is('rar') || is('7z')) return 'File';
    if (is('xls') || is('xlsx') || is('csv')) return 'FileText';
    if (is('doc') || is('docx')) return 'FileText';
    if (is('ppt') || is('pptx')) return 'FileText';
    if (type.startsWith('image/')) return 'Image';
    if (type.startsWith('video/')) return 'Video';
    if (type.startsWith('audio/')) return 'Music';
    return 'File';
  }


  getLessonProgress(lessonId: string): LessonProgress | null {
    const progress = this.courseEnrollment?.lessons.find(l => l.lessonId === lessonId) || null;
    

    
    return progress;
  }

  getOverallProgress(): number {
    if (!this.courseEnrollment) return 0;
    const progress = this.progressService.calculateCompletionPercentage(this.courseEnrollment.lessons);
    this.courseEnrollment.progress.completionPercentage = progress;
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
      next: (meta) => {
        this.isGeneratingCertificate = false;
        if (this.courseEnrollment) {
          this.courseEnrollment.progress.certificateUrl = meta.certificateUrl;
          this.courseEnrollment.progress.certificateCode = meta.certificateCode;
          this.courseEnrollment.progress.certificateIssuedAt = meta.certificateIssuedAt || new Date();
        }
        this.syncCertificateMetadata();
      },
      error: () => {
        this.isGeneratingCertificate = false;
      }
    });
  }

  generateEnhancedCertificate(): void {
    if (!this.course || !this.courseEnrollment) {
      this.certificateError = 'courseEnrolled.errors.courseDataMissing';
      return;
    }

    const authUser = this.authService.currentUserValue;
    const user = authUser?.user;
    if (!authUser || !user) {
      this.certificateError = 'courseEnrolled.errors.userNotAuthenticated';
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
        
        if (this.courseEnrollment) {
          this.courseEnrollment.progress.certificateUrl = certificateData.verificationUrl;
          this.courseEnrollment.progress.certificateCode = certificateData.verificationCode || certificateData.certificateId;
          this.courseEnrollment.progress.certificateIssuedAt = certificateData.issueDate || new Date();
        }
        this.syncCertificateMetadata();
      },
      error: () => {
        this.certificateError = 'courseEnrolled.errors.certificateGenerateFailed';
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
        title: this.translate.instant('courseEnrolled.share.title', { title: this.course.title }),
        text: this.translate.instant('courseEnrolled.share.text', { title: this.course.title }),
        url: window.location.href
      }).catch(() => {});
    } else {
      // Fallback for browsers that don't support Web Share API
      const text = this.translate.instant('courseEnrolled.share.text', { title: this.course?.title || '' });
      navigator.clipboard.writeText(text).then(() => {
        alert(this.translate.instant('courseEnrolled.share.copied'));
      }).catch(() => {
        alert(this.translate.instant('courseEnrolled.share.failed'));
      });
    }
  }

  private syncCertificateMetadata(): void {
    const progress = this.courseEnrollment?.progress;
    if (!progress) {
      this.certificateUrl = null;
      this.certificateCode = null;
      this.certificateIssuedAt = null;
      return;
    }
    this.certificateUrl = progress.certificateUrl || null;
    this.certificateCode = progress.certificateCode || null;
    const issuedAt = progress.certificateIssuedAt;
    this.certificateIssuedAt = issuedAt ? new Date(issuedAt) : null;
  }

  copyCertificateCode(): void {
    if (!this.certificateCode || !navigator?.clipboard) {
      return;
    }
    navigator.clipboard.writeText(this.certificateCode).catch(() => {});
  }

  private refreshCompletionPercentage(): void {
    if (!this.courseEnrollment) {
      return;
    }
    this.courseEnrollment.progress.completionPercentage = this.progressService.calculateCompletionPercentage(
      this.courseEnrollment.lessons || []
    );
  }
}
