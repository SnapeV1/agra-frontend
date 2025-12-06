import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Course, QuizAnswer, QuizQuestion, QuizQuestionApi, TextContent } from "src/app/core/models/course";
import { CourseService } from "src/app/core/services/course/course.service";
import { ProgressService } from "src/app/core/services/progress.service";
import { SessionService } from "src/app/core/services/session.service";
import { CreateSessionDto, SessionModule } from "src/app/core/models/session.model";
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { LiveSessionLauncherService } from "src/app/core/services/live-session-launcher.service";

@Component({
  selector: "app-course-details",
  templateUrl: "./course-details.component.html",
  styleUrls: ["./course-details.component.css"],
})
export class AdminCourseDetailsComponent implements OnInit {
  courseId: string | null = null;
  course: Course | null = null;
  loading = false;
  error = "";
  uploadingImage = false;
  uploadingVideo = false;
  uploadingFiles = false;


  // Store actual files
  selectedImageFile: File | null = null;
  selectedVideoFile: File | null = null;
  selectedFiles: File[] = [];
  pendingDeleteFileIds: string[] = [];

  formData: Course = {
    id: "",
    title: "",
    description: "",
    domain: "",
    country: "",
    trainerId: "UMNAGRI",
    imageUrl: "https://res.cloudinary.com/dmumvupow/image/upload/v1758218323/defaultCourse_qqgiil.png",
    videoUrl: "",
    sessionIds: [],
    languagesAvailable: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    archived: false,
    activeCall: false,
    files: [],
    textContent: [],
    goals: []
  };

  formErrors: Record<string, string> = {};

  // Collapsible sections state
  sectionCollapsed: Record<string, boolean> = {
    basicInfo: true,
    goals: true,
    media: true,
    
    languages: true,
    sessions: true,
    files: true,
    textContent: true
  };

  // Individual text content item collapsed state
  textContentCollapsed: Record<number, boolean> = {};

  domains: string[] = ["Technology", "Business", "Design", "Marketing", "Healthcare", "Education"];
  countries: string[] = [
    "Algeria",
    "Angola",
    "Benin",
    "Botswana",
    "Burkina Faso",
    "Burundi",
    "Cabo Verde",
    "Cameroon",
    "Central African Republic",
    "Chad",
    "Comoros",
    "Congo",
    "Democratic Republic of the Congo",
    "Djibouti",
    "Egypt",
    "Equatorial Guinea",
    "Eritrea",
    "Eswatini",
    "Ethiopia",
    "Gabon",
    "Gambia",
    "Ghana",
    "Guinea",
    "Guinea-Bissau",
    "Ivory Coast",
    "Kenya",
    "Lesotho",
    "Liberia",
    "Libya",
    "Madagascar",
    "Malawi",
    "Mali",
    "Mauritania",
    "Mauritius",
    "Morocco",
    "Mozambique",
    "Namibia",
    "Niger",
    "Nigeria",
    "Rwanda",
    "Sao Tome and Principe",
    "Senegal",
    "Seychelles",
    "Sierra Leone",
    "Somalia",
    "South Africa",
    "South Sudan",
    "Sudan",
    "Tanzania",
    "Togo",
    "Tunisia",
    "Uganda",
    "Zambia",
    "Zimbabwe"
  ];
  languages: string[] = ["Arabic", "English", "French"];
  textContentTypes: string[] = ["lesson", "assignment", "reading", "quiz", "project"];

  // Create session form
  creatingSession = false;
  newSession: CreateSessionDto = {
    title: '',
    description: '',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 60*60*1000).toISOString(),
    lobbyEnabled: true,
    recordingEnabled: false
  };
  sessions: SessionModule[] = [];
  sessionsLoading = false;
  sessionsError = '';

  createSession(): void {
    if (!this.courseId) return;
    this.setDefaultSessionTitle();
    this.creatingSession = true;
    this.sessionService.create(this.courseId, this.newSession).subscribe({
      next: (s: any) => {
        this.formData.sessionIds = this.formData.sessionIds || [];
        if (s?.id) {
          this.formData.sessionIds.push(s.id);
          this.sessions = [{ ...(s as SessionModule) }, ...this.sessions];
        }
        this.resetNewSessionTimes();
        this.creatingSession = false;
      },
      error: () => {
        this.creatingSession = false;
      }
    });
  }

  onStartChange(value: string): void {
    if (!value) return;
    try {
      this.newSession.startTime = new Date(value).toISOString();
    } catch {}
  }

  onEndChange(value: string): void {
    if (!value) return;
    try {
      this.newSession.endTime = new Date(value).toISOString();
    } catch {}
  }

  constructor(
    private route: ActivatedRoute, 
    private courseService: CourseService, 
    private router: Router,
    private progressService: ProgressService,
    private sessionService: SessionService,
    private liveSessionLauncher: LiveSessionLauncherService
  ) {}

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get("id");
    if (this.courseId && this.courseId !== "new") {
      this.loadCourse(this.courseId);
      this.loadSessions(this.courseId);
    }
  }

  // Admin: start/join a live room for a session
  startSession(sessionId?: string): void {
    if (!sessionId || !this.courseId) { return; }
    this.liveSessionLauncher.launch(sessionId).subscribe({
      next: (res) => {
        if (res?.blocked) {
          console.warn('[AdminCourseDetails] Popup blocked when opening live session', res.targetUrl);
        }
      },
      error: () => {
        alert('Failed to open live session. Please try again.');
      }
    });
  }

  loadCourse(id: string): void {
    this.loading = true;
    this.courseService.getCourseById(id).subscribe({
      next: (course) => {
        this.course = course;
        this.formData = {
          ...course,
          sessionIds: course.sessionIds || [],
          languagesAvailable: course.languagesAvailable || [],
          files: course.files || [],
          textContent: (course.textContent || []).map((tc, idx) => {
            const type = (tc.type || '').toString().toLowerCase();
            // Normalize quiz payload from backend into UI-friendly structure
            if (type === 'quiz') {
              const questions = (tc.quizQuestions || []).map((q: QuizQuestionApi) => {
                const options = (q.answers || []).map(a => a.text);
                const correct = (q.answers || []).find(a => a.correct)?.text || '';
                return {
                  id: q.id,
                  question: q.question || '',
                  options: options.length ? options : ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                  correctAnswer: correct
                } as QuizQuestion;
              });
              return {
                ...tc,
                order: typeof tc.order === 'number' ? tc.order : idx + 1,
                type: 'quiz',
                questions
              } as TextContent;
            }
              return {
                ...tc,
                order: typeof tc.order === 'number' ? tc.order : idx + 1,
                type: type as any
              } as TextContent;
            }),
            goals: course.goals || []
          };

      this.hydrateQuizContent();

      // Initialize all text content items as collapsed
      this.textContentCollapsed = {};
      (this.formData.textContent || []).forEach((_, index) => {
        this.textContentCollapsed[index] = true;
      });
      this.setDefaultSessionTitle();
      
        this.loading = false;
      },
      error: (err) => {
        this.error = "Failed to load course details.";
        this.loading = false;
      },
    });
  }

  private loadSessions(courseId: string): void {
    this.sessionsLoading = true;
    this.sessionsError = '';
    this.sessionService.upcoming(courseId).subscribe({
      next: (items) => {
        this.sessions = items || [];
        this.formData.sessionIds = (items || []).map(s => s.id).filter((id): id is string => !!id);
        this.sessionsLoading = false;
      },
      error: () => {
        this.sessionsError = 'Failed to load sessions';
        this.sessionsLoading = false;
      }
    });
  }

  private setDefaultSessionTitle(): void {
    if (!this.newSession.title || !this.newSession.title.trim()) {
      const title = this.formData.title || this.course?.title || '';
      this.newSession.title = title;
    }
  }

  private resetNewSessionTimes(): void {
    const start = new Date();
    const end = new Date(Date.now() + 60 * 60 * 1000);
    this.newSession.startTime = start.toISOString();
    this.newSession.endTime = end.toISOString();
    this.newSession.description = '';
    this.setDefaultSessionTitle();
  }

  validateField(field: keyof Course, value: any): string {
    switch (field) {
      case "title":
        return !value || value.length < 3 ? "Title is required (min 3 characters)" : "";
      case "description":
        return !value || value.length < 10 ? "Description is required (min 10 characters)" : "";
      default:
        return "";
    }
  }

  updateField(field: keyof Course, event: any): void {
    const value = event.target ? event.target.value : event;
    this.formData = { ...this.formData, [field]: value };
    const error = this.validateField(field, value);
    this.formErrors = { ...this.formErrors, [field]: error };
    
    if (!error) {
      const { [field]: removedError, ...restErrors } = this.formErrors;
      this.formErrors = restErrors;
    }
  }

  handleLanguageToggle(language: string): void {
    const currentLanguages = this.formData.languagesAvailable || [];
    
    if (currentLanguages.includes(language)) {
      this.formData.languagesAvailable = currentLanguages.filter((l) => l !== language);
    } else {
      this.formData.languagesAvailable = [...currentLanguages, language];
    }
  }

  removeSession(sessionId: string, index: number): void {
    this.formData.sessionIds = (this.formData.sessionIds || []).filter((id) => id !== sessionId);
    this.sessions = this.sessions.filter((_, i) => i !== index);
  }

  addGoal(): void {
    const currentGoals = this.formData.goals || [];
    this.formData.goals = [...currentGoals, ""];
    // Expand the goals section when adding a new goal
    this.sectionCollapsed['goals'] = false;
  }

  removeGoal(index: number): void {
    const currentGoals = this.formData.goals || [];
    this.formData.goals = currentGoals.filter((_, i) => i !== index);
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }
  trackByOption(index: number, _opt: string): number {
    return index;
  }

  // Collapsible section methods
  toggleSection(sectionName: string): void {
    this.sectionCollapsed[sectionName] = !this.sectionCollapsed[sectionName];
  }

  collapseAll(): void {
    Object.keys(this.sectionCollapsed).forEach(key => {
      this.sectionCollapsed[key] = true;
    });
  }

  expandAll(): void {
    Object.keys(this.sectionCollapsed).forEach(key => {
      this.sectionCollapsed[key] = false;
    });
  }

  areAllCollapsed(): boolean {
    return Object.values(this.sectionCollapsed).every(collapsed => collapsed);
  }

  areAllExpanded(): boolean {
    return Object.values(this.sectionCollapsed).every(collapsed => !collapsed);
  }

  addTextContent(): void {
    const currentContent = this.formData.textContent || [];
    const newIndex = currentContent.length;
    this.formData.textContent = [...currentContent, { 
      title: "", 
      type: "lesson", 
      content: "", 
      order: currentContent.length + 1 
    }];
    // Initialize new text content item as collapsed
    this.textContentCollapsed[newIndex] = true;
    // Expand the textContent section when adding new content
    this.sectionCollapsed['textContent'] = false;
  }

  onContentTypeChange(index: number, type: string): void {
    this.formData.textContent[index].type = type as any;
    if (type === 'quiz') {
      this.initQuizContent(index);
      this.textContentCollapsed[index] = false;
    }
  }

  private initQuizContent(index: number): void {
    const item = this.formData.textContent[index];
    if (!item.questions || !item.questions.length) {
      item.questions = [{
        question: '',
        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
        correctAnswer: '',
        uiCollapsed: false
      }];
    }
  }
  private ensureQuizDefaults(): void {
    (this.formData.textContent || []).forEach((item, idx) => {
      if (item.type === 'quiz') {
        this.initQuizContent(idx);
        item.questions?.forEach(q => {
          if (!q.options || !q.options.length) {
            q.options = ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
          }
          if ((q as any).uiCollapsed === undefined) {
            (q as any).uiCollapsed = false;
          }
        });
      }
    });
  }

  private hydrateQuizContent(): void {
    (this.formData.textContent || []).forEach((item, idx) => {
      const type = (item.type || '').toString().toLowerCase();
      if (type === 'quiz') {
        item.type = 'quiz' as any;
        // Prefer API quizQuestions if present
        if (item.quizQuestions && item.quizQuestions.length) {
          item.questions = item.quizQuestions.map((q: QuizQuestionApi) => {
            const options = (q.answers || []).map(a => a.text);
            const correct = (q.answers || []).find(a => a.correct)?.text || '';
            return {
              question: q.question || '',
              options: options.length ? options : ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
              correctAnswer: correct,
              uiCollapsed: false
            } as QuizQuestion;
          });
        } else if (item.questions && item.questions.length) {
          item.questions = item.questions.map((q: any) => {
            const answers = (q.answers || []) as QuizAnswer[];
            const optionsFromAnswers = answers.map(a => a.text).filter(Boolean);
            const mergedOptions = (q.options && q.options.length ? q.options : optionsFromAnswers);
            const normalizedOptions = mergedOptions && mergedOptions.length
              ? mergedOptions
              : ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
            const correctFromAnswers = answers.find(a => a?.correct || (a as any)?.isCorrect || (a as any)?.isTrue)?.text || '';
            const resolvedCorrect = q.correctAnswer || correctFromAnswers;

            return {
              question: q.question || '',
              options: normalizedOptions,
              correctAnswer: normalizedOptions.includes(resolvedCorrect) ? resolvedCorrect : '',
              uiCollapsed: q.uiCollapsed ?? false
            } as QuizQuestion;
          });
        }
        this.initQuizContent(idx);
      }
      // Normalize non-quiz type casing
      if (type !== 'quiz') {
        item.type = type as any;
      }
    });
  }

  addQuizQuestion(contentIndex: number): void {
    const item = this.formData.textContent[contentIndex];
    if (!item.questions) {
      item.questions = [];
    }
    item.questions.push({
      question: '',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctAnswer: '',
      uiCollapsed: false
    });
  }

  removeQuizQuestion(contentIndex: number, questionIndex: number): void {
    const item = this.formData.textContent[contentIndex];
    if (!item.questions) return;
    item.questions = item.questions.filter((_, idx) => idx !== questionIndex);
  }

  addQuizOption(contentIndex: number, questionIndex: number): void {
    const item = this.formData.textContent[contentIndex];
    if (!item.questions) return;
    const question = item.questions[questionIndex];
    if (!question) return;
    question.options = question.options || [];
    question.options.push(`Option ${question.options.length + 1}`);
  }

  removeQuizOption(contentIndex: number, questionIndex: number, optionIndex: number): void {
    const item = this.formData.textContent[contentIndex];
    if (!item.questions) return;
    const question = item.questions[questionIndex];
    if (!question) return;
    if (!question.options || question.options.length <= 2) return;
    const removed = question.options.splice(optionIndex, 1)[0];
    if (removed === question.correctAnswer) {
      question.correctAnswer = '';
    }
  }

  setCorrectOption(contentIndex: number, questionIndex: number, option: string): void {
    const item = this.formData.textContent[contentIndex];
    if (!item.questions) return;
    const question = item.questions[questionIndex];
    if (!question) return;
    question.correctAnswer = option;
  }

  toggleQuizQuestion(contentIndex: number, questionIndex: number): void {
    const item = this.formData.textContent[contentIndex];
    if (!item?.questions || !item.questions[questionIndex]) return;
    const q: any = item.questions[questionIndex];
    q.uiCollapsed = !q.uiCollapsed;
  }


  removeTextContent(index: number): void {
    const currentContent = this.formData.textContent || [];
    this.formData.textContent = currentContent.filter((_, i) => i !== index);
    
    // Clean up collapsed state and reindex
    const newCollapsedState: Record<number, boolean> = {};
    Object.keys(this.textContentCollapsed).forEach(key => {
      const keyIndex = parseInt(key);
      if (keyIndex < index) {
        newCollapsedState[keyIndex] = this.textContentCollapsed[keyIndex];
      } else if (keyIndex > index) {
        newCollapsedState[keyIndex - 1] = this.textContentCollapsed[keyIndex];
      }
    });
    this.textContentCollapsed = newCollapsedState;
  }

  toggleTextContent(index: number): void {
    this.textContentCollapsed[index] = !this.textContentCollapsed[index];
  }

  isTextContentCollapsed(index: number): boolean {
    return this.textContentCollapsed[index] || false;
  }

  moveTextContent(index: number, direction: "up" | "down"): void {
    const currentContent = this.formData.textContent || [];
    
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === currentContent.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newContent = [...currentContent];
    const temp = newContent[index];
    newContent[index] = newContent[newIndex];
    newContent[newIndex] = temp;
    this.formData.textContent = newContent;

    // Swap collapsed states as well
    const tempCollapsed = this.textContentCollapsed[index];
    this.textContentCollapsed[index] = this.textContentCollapsed[newIndex];
    this.textContentCollapsed[newIndex] = tempCollapsed;
  }

  handleImageUpload(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    
    this.uploadingImage = true;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      this.uploadingImage = false;
      return;
    }

    if (file.size > 10 * 1024 * 1024) { 
      alert('Image file must be less than 10MB');
      this.uploadingImage = false;
      return;
    }

    // Store the actual file
    this.selectedImageFile = file;
    
    setTimeout(() => {
      this.formData.imageUrl = URL.createObjectURL(file);
      this.uploadingImage = false;
    }, 2000);
  }

  handleVideoUpload(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    this.uploadingVideo = true;

    if (!file.type.startsWith('video/')) {
      alert('Please select a valid video file');
      this.uploadingVideo = false;
      return;
    }

    if (file.size > 100 * 1024 * 1024) { 
      alert('Video file must be less than 100MB');
      this.uploadingVideo = false;
      return;
    }

    // Store the actual file
    this.selectedVideoFile = file;

    setTimeout(() => {
      this.formData.videoUrl = URL.createObjectURL(file);
      this.uploadingVideo = false;
    }, 3000);
  }

  removeVideo(): void {
    this.formData.videoUrl = "";
    this.selectedVideoFile = null;
  }

  removeFileStaged(index: number): void {
    const currentFiles = this.formData.files || [];
    const target = currentFiles[index];
    if (!target) return;

    if (target.id) {
      if (!confirm(`Delete file "${target.name}"? Changes will persist on Save.`)) return;
      this.pendingDeleteFileIds = [...this.pendingDeleteFileIds, target.id];
    } else {
      const toRemoveIdx = this.selectedFiles.findIndex(f => f.name === target.name && f.size === target.size);
      if (toRemoveIdx !== -1) {
        this.selectedFiles.splice(toRemoveIdx, 1);
      }
    }
    this.formData.files = currentFiles.filter((_, i) => i !== index);
  }

  handleFileUpload(event: any): void {
    const files = Array.from(event.target.files || []) as File[];
    if (files.length === 0) return;

    // Validate file types: allow images and common document types only
    const allowedExtensions = ['pdf','doc','docx','xls','xlsx','csv','ppt','pptx','txt'];
    const isAllowed = (f: File) => {
      const mime = (f.type || '').toLowerCase();
      const name = (f.name || '').toLowerCase();
      const ext = name.includes('.') ? name.substring(name.lastIndexOf('.')+1) : '';
      return mime.startsWith('image/') || allowedExtensions.includes(ext);
    };

    const invalid = files.filter(f => !isAllowed(f));
    if (invalid.length > 0) {
      const names = invalid.map(f => f.name).join(', ');
      alert(`These files are not allowed and will be skipped: ${names}.\nAllowed: images, PDF, DOC/DOCX, XLS/XLSX/CSV, PPT/PPTX, TXT.`);
    }

    const validFiles = files.filter(isAllowed);
    if (validFiles.length === 0) {
      event.target.value = '';
      return;
    }

    // Stage files locally; upload will happen on Save
    try {
      
    } catch {}
    this.selectedFiles = [...this.selectedFiles, ...validFiles];

    const newFiles = validFiles.map((file) => ({
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
      type: file.type || ''
    }));

    const currentFiles = this.formData.files || [];
    this.formData.files = [...currentFiles, ...newFiles];

    event.target.value = '';
  }

  removeFile(index: number): void {
    const currentFiles = this.formData.files || [];
    const target = currentFiles[index];
    if (!target) return;

    // If file has an id and course is saved, delete from backend
    if (this.formData.id && target.id) {
      if (!confirm(`Delete file "${target.name}"?`)) return;
      this.uploadingFiles = true;
      this.courseService.deleteCourseFile(this.formData.id, target.id)
        .pipe(finalize(() => this.uploadingFiles = false))
        .subscribe({
          next: () => {
            this.formData.files = currentFiles.filter((_, i) => i !== index);
          },
          error: (err) => {
            
            alert('Failed to delete file.');
          }
        });
    } else {
      // Otherwise just remove locally
      this.formData.files = currentFiles.filter((_, i) => i !== index);
      this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
    }
  }

  // Removed URL editing helper; using file.url as-is

  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  removeImage(): void {
    this.formData.imageUrl = "";
    this.selectedImageFile = null;
  }

  triggerImageUpload(): void {
    const fileInput = document.getElementById('image-change') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  triggerVideoUpload(): void {
    const fileInput = document.getElementById('video-change') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  isFormValid(): boolean {
    const requiredFields: (keyof Course)[] = ["title", "description", "domain", "country", "trainerId"];
    return requiredFields.every((f) => !this.validateField(f, this.formData[f]));
  }

  private validateQuizContent(): string[] {
    const errors: string[] = [];
    (this.formData.textContent || []).forEach((tc, lessonIdx) => {
      const type = (tc.type || '').toString().toLowerCase();
      if (type !== 'quiz') return;

      (tc.questions || []).forEach((q: QuizQuestion, qi: number) => {
        const title = tc.title || `Lesson ${lessonIdx + 1}`;
        const questionLabel = `Quiz "${title}" question ${qi + 1}`;
        const questionText = (q.question || '').trim();
        if (!questionText) {
          errors.push(`${questionLabel} is empty.`);
        }

        const options = (q.options || []).map(opt => (opt || '').trim()).filter(opt => opt !== '');
        if (options.length < 2) {
          errors.push(`${questionLabel} needs at least two answers.`);
        }
        const hasEmptyOption = (q.options || []).some(opt => !(opt || '').trim());
        if (hasEmptyOption) {
          errors.push(`${questionLabel} has blank answers.`);
        }

        const correct = (q.correctAnswer || '').trim();
        if (!correct || !options.includes(correct)) {
          errors.push(`${questionLabel} must have a correct answer selected.`);
        }
      });
    });
    return errors;
  }

  hasValidationErrors(): boolean {
    return Object.values(this.formErrors).some((error) => error);
  }

  getValidationErrors(): string[] {
    return Object.values(this.formErrors).filter((error) => error);
  }

  handleSave(): void {
    if (!this.isFormValid() || this.hasValidationErrors()) {
      alert("Please fix validation errors before saving.");
      return;
    }

    const quizErrors = this.validateQuizContent();
    if (quizErrors.length) {
      alert(quizErrors.join('\n'));
      return;
    }

    this.loading = true;
    this.formData.updatedAt = new Date();
    
    if (this.courseId === "new") {
      this.formData.createdAt = new Date();
    }

    // Filter out empty goals before saving and exclude files from payload
    // Files are managed exclusively via upload/delete endpoints to avoid overwriting server state
    const filteredGoals = this.formData.goals.filter(goal => goal.trim() !== "");
    const { files: _omitFiles, ...rest } = this.formData as any;

    const mappedTextContent = (rest.textContent || []).map((tc: TextContent, idx: number) => {
      const normalizedType = (tc.type || '').toString().toUpperCase();
      const base = {
        id: tc.id,
        title: tc.title,
        content: tc.content || '',
        order: typeof tc.order === 'number' ? tc.order : idx + 1,
        type: normalizedType
      } as any;

      if (normalizedType !== 'QUIZ') {
        return base;
      }

      const quizQuestions = (tc.questions || []).map((q: QuizQuestion, qi: number) => ({
        id: (tc.quizQuestions && tc.quizQuestions[qi]?.id) || '',
        question: q.question || '',
        answers: (q.options || []).map((opt: string, oi: number) => ({
          id: (tc.quizQuestions && tc.quizQuestions[qi]?.answers?.[oi]?.id) || '',
          text: opt,
          correct: q.correctAnswer === opt
        }))
      }));

      return {
        ...base,
        quizQuestions
      };
    });

    const courseDataToSave = {
      ...rest,
      goals: filteredGoals,
      textContent: mappedTextContent
    } as Course;

    const saveCall = this.courseId === "new"
      ? this.courseService.addCourse(courseDataToSave, this.selectedImageFile ?? undefined, this.selectedVideoFile ?? undefined)
      : this.courseService.updateCourse(this.formData.id!, courseDataToSave, this.selectedImageFile ?? undefined, this.selectedVideoFile ?? undefined);

console.log("📤 Sending course to backend:", courseDataToSave);

    saveCall.subscribe({
      next: (savedCourse) => {
        this.course = savedCourse;
        this.formData = {
          ...savedCourse,
          sessionIds: savedCourse.sessionIds || [],
          languagesAvailable: savedCourse.languagesAvailable || [],
          files: savedCourse.files || [],
          textContent: savedCourse.textContent || [],
          goals: savedCourse.goals || []
        };

        // Also update local formData to remove any empty goals that might still be in the UI
        this.formData.goals = this.formData.goals.filter(goal => goal.trim() !== "");

        // If this is an update (not a new course), refresh progress data to reflect new lesson count
        if (this.courseId !== "new" && savedCourse.id) {
          
          // Note: Progress is automatically recalculated when users access the course via getCourseProgress
          // This ensures the completion percentage reflects the new lesson count
        }

        // After course is saved, process staged file uploads and deletions
        const ops: Array<any> = [];
        const courseId = this.formData.id || savedCourse.id;
        if (courseId) {
          if (this.selectedFiles.length > 0) {
            try {
              
            } catch {}
            const uploadOps = this.selectedFiles.map(f => this.courseService.uploadCourseFile(courseId, f).pipe(catchError((e) => { return of(null); })));
            ops.push(...uploadOps);
          }
          if (this.pendingDeleteFileIds.length > 0) {
            try {
              
            } catch {}
            const deleteOps = this.pendingDeleteFileIds.map(fid => this.courseService.deleteCourseFile(courseId, fid).pipe(catchError((e) => { return of(null); })));
            ops.push(...deleteOps);
          }
        }

        if (ops.length > 0) {
          this.uploadingFiles = true;
          forkJoin(ops).pipe(finalize(() => this.uploadingFiles = false)).subscribe({
            next: (results) => {
              try {
                
              } catch {}
              const newFiles = (results || []).filter((r: any) => r && r.url);
              if (newFiles.length > 0) {
                this.formData.files = [ ...(this.formData.files || []), ...newFiles ];
              }
            },
            complete: () => {
              this.finishSaveCleanup();
            },
            error: () => {
              this.finishSaveCleanup();
            }
          });
        } else {
          this.finishSaveCleanup();
        }
      },
      error: (err) => {
        
        alert("Failed to save course.");  
        this.loading = false;
      },
    });
  }

  private finishSaveCleanup(): void {
    this.loading = false;
    alert("Course saved successfully!");
    // Clear staged files and pending deletes
    this.selectedImageFile = null;
    this.selectedVideoFile = null;
    this.selectedFiles = [];
    this.pendingDeleteFileIds = [];
    // Redirect after everything is done
    this.router.navigate(['/admin/courses']);
  }
  

  toggleArchived(): void {
    this.formData.archived = !this.formData.archived;
  }



  handleDelete(): void {
    if (!this.courseId || this.courseId === "new") {
      alert("Cannot delete a new course.");
      return;
    }
    
    if (confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
      this.loading = true;
      this.courseService.deleteCourse(this.courseId).subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/admin/courses']);
        },
        error: (err) => {
          alert("Failed to delete course.");
          this.loading = false;
        }
      });
    }
  }

  handleRetrieve(): void {
    if (!this.courseId || this.courseId === "new") {
      alert("Cannot retrieve a new course.");
      return;
    }
    
    if (confirm("Are you sure you want to retrieve this course? It will be unarchived and made available again.")) {
      this.loading = true;
      this.courseService.unarchiveCourse(this.courseId).subscribe({
        next: () => {
          this.formData.archived = false;
          this.loading = false;
        },
        error: (err) => {
          alert("Failed to retrieve course.");
          this.loading = false;
        }
      });
    }
  }

  
}
