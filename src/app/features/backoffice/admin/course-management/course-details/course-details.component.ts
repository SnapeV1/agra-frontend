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
import { TranslateService } from '@ngx-translate/core';

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
    defaultLanguage: "en",
    translations: {},
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
  translationLang = 'en';
  goalsTranslationLang = 'en';
  contentTranslationLang: Record<number, string> = {};
  translationPanelVisible: Record<number, boolean> = {};

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
  languages: string[] = ["en", "fr", "ar"];
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
    private liveSessionLauncher: LiveSessionLauncherService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get("id");
    const initialTranslationLang = this.getInitialTranslationLanguage();
    this.translationLang = initialTranslationLang;
    this.goalsTranslationLang = initialTranslationLang;
    if (!this.formData.languagesAvailable || this.formData.languagesAvailable.length === 0) {
      this.formData.languagesAvailable = [this.formData.defaultLanguage || 'en'];
    }
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
        alert(this.translate.instant('adminCourseDetails.errors.liveSession'));
      }
    });
  }

  loadCourse(id: string): void {
    this.loading = true;
    this.courseService.getCourseById(id).subscribe({
      next: (course) => {
        const preferredLang = this.getPreferredLanguage(course);
        const localizedCourse = this.resolveCourseTranslation(course, preferredLang);
        const translationLang = this.getInitialTranslationLanguage();
        this.course = course;
        this.formData = {
          ...course,
          defaultLanguage: course.defaultLanguage || preferredLang,
          translations: course.translations || {},
          title: localizedCourse.title,
          description: localizedCourse.description,
          sessionIds: course.sessionIds || [],
          languagesAvailable: course.languagesAvailable || [],
          files: course.files || [],
          textContent: (course.textContent || []).map((tc, idx) => {
            const type = (tc.type || '').toString().toLowerCase();
            const localized = this.resolveTextContentTranslation(tc, preferredLang, course.defaultLanguage);
            // Normalize quiz payload from backend into UI-friendly structure
            if (type === 'quiz') {
          const questions = (tc.quizQuestions || []).map((q: QuizQuestionApi) => {
                const options = (q.answers || [])
                  .map(a => this.resolveQuizAnswerText(a, preferredLang, course.defaultLanguage))
                  .filter(Boolean);
                const correctAnswer = (q.answers || []).find(a => a.correct);
                const correct = correctAnswer ? this.resolveQuizAnswerText(correctAnswer, preferredLang, course.defaultLanguage) : '';
                return {
                  id: q.id,
                  question: this.mergeLegacyTextMap(q.question, q.translations as any, 'question', preferredLang),
                  options: options.length ? options : ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                  correctAnswer: correct
                } as QuizQuestion;
              });
              return {
                ...tc,
            title: this.mergeLegacyTextMap(tc.title, tc.translations, 'title', preferredLang),
            content: this.mergeLegacyTextMap(tc.content, tc.translations, 'content', preferredLang),
            order: typeof tc.order === 'number' ? tc.order : idx + 1,
            type: 'quiz',
            questions
          } as TextContent;
            }
              return {
                ...tc,
                title: this.mergeLegacyTextMap(tc.title, tc.translations, 'title', preferredLang),
                content: this.mergeLegacyTextMap(tc.content, tc.translations, 'content', preferredLang),
                order: typeof tc.order === 'number' ? tc.order : idx + 1,
                type: type as any
              } as TextContent;
            }),
            goals: localizedCourse.goals
          };
        if (this.formData.defaultLanguage && !this.formData.languagesAvailable.includes(this.formData.defaultLanguage)) {
          this.formData.languagesAvailable = [...(this.formData.languagesAvailable || []), this.formData.defaultLanguage];
        }

      this.hydrateQuizContent();
      this.translationLang = translationLang;
      this.goalsTranslationLang = translationLang;
      this.contentTranslationLang = {};
      this.translationPanelVisible = {};

      // Initialize all text content items as collapsed
      this.textContentCollapsed = {};
      (this.formData.textContent || []).forEach((_, index) => {
        this.textContentCollapsed[index] = true;
        this.contentTranslationLang[index] = translationLang;
        this.translationPanelVisible[index] = false;
      });
      this.setDefaultSessionTitle();
      
        this.loading = false;
      },
      error: (err) => {
        this.error = 'adminCourseDetails.errors.loadCourse';
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
        this.sessionsError = 'adminCourseDetails.errors.loadSessions';
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

  languageLabel(language: string): string {
    const normalized = (language || '').toLowerCase();
    switch (normalized) {
      case 'ar':
      case 'arabic':
        return 'lang.ar';
      case 'fr':
      case 'french':
        return 'lang.fr';
      case 'en':
      case 'english':
      default:
        return 'lang.en';
    }
  }

  contentTypeLabel(type: string): string {
    const normalized = (type || '').toLowerCase();
    switch (normalized) {
      case 'lesson':
        return 'adminCourseDetails.textContent.types.lesson';
      case 'assignment':
        return 'adminCourseDetails.textContent.types.assignment';
      case 'reading':
        return 'adminCourseDetails.textContent.types.reading';
      case 'quiz':
        return 'adminCourseDetails.textContent.types.quiz';
      case 'project':
        return 'adminCourseDetails.textContent.types.project';
      default:
        return 'adminCourseDetails.textContent.types.unknown';
    }
  }

  untitledContentLabel(type: string): string {
    const typeLabel = this.translate.instant(this.contentTypeLabel(type));
    return this.translate.instant('adminCourseDetails.textContent.untitled', { type: typeLabel });
  }

  validateField(field: keyof Course, value: any): string {
    switch (field) {
      case "title":
        return !value || value.length < 3 ? 'adminCourseDetails.validation.titleRequired' : "";
      case "description":
        return !value || value.length < 10 ? 'adminCourseDetails.validation.descriptionRequired' : "";
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
    if (language === this.formData.defaultLanguage) return;

    if (currentLanguages.includes(language)) {
      this.formData.languagesAvailable = currentLanguages.filter((l) => l !== language);
    } else {
      this.formData.languagesAvailable = [...currentLanguages, language];
    }
  }

  setDefaultLanguage(language: string): void {
    if (!language) return;
    this.formData.defaultLanguage = language;
    if (!this.formData.languagesAvailable?.includes(language)) {
      this.formData.languagesAvailable = [...(this.formData.languagesAvailable || []), language];
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
    const lang = this.resolveDefaultLanguage();
    this.formData.textContent = [...currentContent, { 
      title: { [lang]: "" }, 
      type: "lesson", 
      content: { [lang]: "" }, 
      order: currentContent.length + 1 
    }];
    // Initialize new text content item as collapsed
    this.textContentCollapsed[newIndex] = true;
    this.contentTranslationLang[newIndex] = this.resolveDefaultLanguage();
    this.translationPanelVisible[newIndex] = false;
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
    const lang = this.resolveDefaultLanguage();
    if (!item.questions || !item.questions.length) {
      item.questions = [{
        question: { [lang]: '' },
        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
        correctAnswer: '',
        uiCollapsed: false
      }];
    }
    this.ensureQuizTranslationScaffold(item);
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
        const lang = this.formData.defaultLanguage || this.translationLang || 'en';
        item.type = 'quiz' as any;
        // Prefer API quizQuestions if present
        if (item.quizQuestions && item.quizQuestions.length) {
          item.questions = item.quizQuestions.map((q: QuizQuestionApi) => {
            const options = (q.answers || [])
              .map(a => this.resolveQuizAnswerText(a, lang, this.formData.defaultLanguage))
              .filter(Boolean);
            const correctAnswer = (q.answers || []).find(a => a.correct);
            const correct = correctAnswer ? this.resolveQuizAnswerText(correctAnswer, lang, this.formData.defaultLanguage) : '';
            return {
              question: this.mergeLegacyTextMap(q.question, q.translations as any, 'question', lang),
              options: options.length ? options : ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
              correctAnswer: correct,
              uiCollapsed: false
            } as QuizQuestion;
          });
        } else if (item.questions && item.questions.length) {
          item.questions = item.questions.map((q: any) => {
            const answers = (q.answers || []) as QuizAnswer[];
            const optionsFromAnswers = answers
              .map(a => this.resolveQuizAnswerText(a, lang, this.formData.defaultLanguage))
              .filter(Boolean);
            const mergedOptions = (q.options && q.options.length ? q.options : optionsFromAnswers);
            const normalizedOptions = mergedOptions && mergedOptions.length
              ? mergedOptions
              : ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
            const correctFromAnswers = (() => {
              const candidate = answers.find(a => a?.correct || (a as any)?.isCorrect || (a as any)?.isTrue);
              return candidate ? this.resolveQuizAnswerText(candidate, lang, this.formData.defaultLanguage) : '';
            })();
            const resolvedCorrect = q.correctAnswer || correctFromAnswers;

            return {
              question: this.normalizeTextMap(q.question, lang, ''),
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
      question: { [this.resolveDefaultLanguage()]: '' },
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctAnswer: '',
      uiCollapsed: false
    });
    this.ensureQuizTranslationScaffold(item);
  }

  removeQuizQuestion(contentIndex: number, questionIndex: number): void {
    const item = this.formData.textContent[contentIndex];
    if (!item.questions) return;
    item.questions = item.questions.filter((_, idx) => idx !== questionIndex);
    this.ensureQuizTranslationScaffold(item);
  }

  addQuizOption(contentIndex: number, questionIndex: number): void {
    const item = this.formData.textContent[contentIndex];
    if (!item.questions) return;
    const question = item.questions[questionIndex];
    if (!question) return;
    question.options = question.options || [];
    question.options.push(`Option ${question.options.length + 1}`);
    this.ensureQuizTranslationScaffold(item);
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
    this.ensureQuizTranslationScaffold(item);
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

  collapseQuizQuestion(contentIndex: number, questionIndex: number): void {
    const item = this.formData.textContent[contentIndex];
    if (!item?.questions || !item.questions[questionIndex]) return;
    const q: any = item.questions[questionIndex];
    q.uiCollapsed = true;
  }

  revealTranslationPanel(contentIndex: number): void {
    this.translationPanelVisible[contentIndex] = true;
  }

  toggleTranslationPanel(contentIndex: number): void {
    this.translationPanelVisible[contentIndex] = !this.translationPanelVisible[contentIndex];
  }


  removeTextContent(index: number): void {
    const currentContent = this.formData.textContent || [];
    this.formData.textContent = currentContent.filter((_, i) => i !== index);
    
    // Clean up collapsed state and reindex
    const newCollapsedState: Record<number, boolean> = {};
    const newTranslationLang: Record<number, string> = {};
    const newTranslationVisible: Record<number, boolean> = {};
    Object.keys(this.textContentCollapsed).forEach(key => {
      const keyIndex = parseInt(key);
      if (keyIndex < index) {
        newCollapsedState[keyIndex] = this.textContentCollapsed[keyIndex];
        if (this.contentTranslationLang[keyIndex]) {
          newTranslationLang[keyIndex] = this.contentTranslationLang[keyIndex];
        }
        if (this.translationPanelVisible[keyIndex]) {
          newTranslationVisible[keyIndex] = this.translationPanelVisible[keyIndex];
        }
      } else if (keyIndex > index) {
        newCollapsedState[keyIndex - 1] = this.textContentCollapsed[keyIndex];
        if (this.contentTranslationLang[keyIndex]) {
          newTranslationLang[keyIndex - 1] = this.contentTranslationLang[keyIndex];
        }
        if (this.translationPanelVisible[keyIndex]) {
          newTranslationVisible[keyIndex - 1] = this.translationPanelVisible[keyIndex];
        }
      }
    });
    this.textContentCollapsed = newCollapsedState;
    this.contentTranslationLang = newTranslationLang;
    this.translationPanelVisible = newTranslationVisible;
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
    const tempLang = this.contentTranslationLang[index];
    this.contentTranslationLang[index] = this.contentTranslationLang[newIndex];
    this.contentTranslationLang[newIndex] = tempLang;
    const tempVisible = this.translationPanelVisible[index];
    this.translationPanelVisible[index] = this.translationPanelVisible[newIndex];
    this.translationPanelVisible[newIndex] = tempVisible;
  }

  handleImageUpload(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    
    this.uploadingImage = true;

    if (!file.type.startsWith('image/')) {
      alert(this.translate.instant('adminCourseDetails.errors.invalidImage'));
      this.uploadingImage = false;
      return;
    }

    if (file.size > 10 * 1024 * 1024) { 
      alert(this.translate.instant('adminCourseDetails.errors.imageTooLarge'));
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
      alert(this.translate.instant('adminCourseDetails.errors.invalidVideo'));
      this.uploadingVideo = false;
      return;
    }

    if (file.size > 100 * 1024 * 1024) { 
      alert(this.translate.instant('adminCourseDetails.errors.videoTooLarge'));
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
      const confirmed = confirm(this.translate.instant('adminCourseDetails.confirm.deleteFileStaged', { name: target.name }));
      if (!confirmed) return;
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
      alert(this.translate.instant('adminCourseDetails.errors.invalidFiles', { names }));
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
      const confirmed = confirm(this.translate.instant('adminCourseDetails.confirm.deleteFile', { name: target.name }));
      if (!confirmed) return;
      this.uploadingFiles = true;
      this.courseService.deleteCourseFile(this.formData.id, target.id)
        .pipe(finalize(() => this.uploadingFiles = false))
        .subscribe({
          next: () => {
            this.formData.files = currentFiles.filter((_, i) => i !== index);
          },
          error: (err) => {
            
            alert(this.translate.instant('adminCourseDetails.errors.deleteFile'));
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

      const lessonTitle = this.getTextContentValue(tc, 'title') || this.translate.instant('adminCourseDetails.textContent.lessonFallback', { index: lessonIdx + 1 });

      (tc.questions || []).forEach((q: QuizQuestion, qi: number) => {
        const questionLabel = this.translate.instant('adminCourseDetails.quiz.questionLabelDetailed', {
          title: lessonTitle,
          index: qi + 1
        });
        const questionText = this.getQuizQuestionValue(q).trim();
        if (!questionText) {
          errors.push(this.translate.instant('adminCourseDetails.quiz.errors.emptyQuestion', { label: questionLabel }));
        }

        const options = (q.options || []).map(opt => (opt || '').trim()).filter(opt => opt !== '');
        if (options.length < 2) {
          errors.push(this.translate.instant('adminCourseDetails.quiz.errors.minOptions', { label: questionLabel }));
        }
        const hasEmptyOption = (q.options || []).some(opt => !(opt || '').trim());
        if (hasEmptyOption) {
          errors.push(this.translate.instant('adminCourseDetails.quiz.errors.blankOptions', { label: questionLabel }));
        }

        const correct = (q.correctAnswer || '').trim();
        if (!correct || !options.includes(correct)) {
          errors.push(this.translate.instant('adminCourseDetails.quiz.errors.correctRequired', { label: questionLabel }));
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
      alert(this.translate.instant('adminCourseDetails.errors.fixValidation'));
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
    const defaultLang = this.resolveDefaultLanguage();
    const nextCourseTranslations = this.mergeCourseTranslations(rest.translations, defaultLang, {
      title: rest.title,
      description: rest.description,
      goals: filteredGoals
    });
    const mergedLanguages = Array.from(new Set([...(rest.languagesAvailable || []), defaultLang]));

    const mappedTextContent = (rest.textContent || []).map((tc: TextContent, idx: number) => {
      const normalizedType = (tc.type || '').toString().toUpperCase();
      const base = {
        id: tc.id,
        order: typeof tc.order === 'number' ? tc.order : idx + 1,
        type: normalizedType,
        title: this.mergeLegacyTextMap(tc.title, tc.translations, 'title', defaultLang),
        content: this.mergeLegacyTextMap(tc.content, tc.translations, 'content', defaultLang)
      } as any;

      if (normalizedType !== 'QUIZ') {
        return base;
      }

      const quizQuestions = (tc.questions || []).map((q: QuizQuestion, qi: number) => ({
        id: (tc.quizQuestions && tc.quizQuestions[qi]?.id) || '',
        question: this.mergeLegacyTextMap(
          { ...(tc.quizQuestions?.[qi]?.question || {}), ...(q.question || {}) },
          tc.quizQuestions?.[qi]?.translations as Record<string, { question?: string }> | undefined,
          'question',
          defaultLang
        ),
        answers: (q.options || []).map((opt: string, oi: number) => ({
          id: (tc.quizQuestions && tc.quizQuestions[qi]?.answers?.[oi]?.id) || '',
          correct: q.correctAnswer === opt,
          text: this.mergeLegacyTextMap(
            { ...(tc.quizQuestions?.[qi]?.answers?.[oi]?.text || {}), [defaultLang]: opt },
            tc.quizQuestions?.[qi]?.answers?.[oi]?.translations as Record<string, { text?: string }> | undefined,
            'text',
            defaultLang
          )
        }))
      }));

      return {
        ...base,
        quizQuestions
      };
    });

    const courseDataToSave = {
      ...rest,
      defaultLanguage: rest.defaultLanguage || defaultLang,
      translations: nextCourseTranslations,
      languagesAvailable: mergedLanguages,
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
        
        alert(this.translate.instant('adminCourseDetails.errors.saveCourse'));  
        this.loading = false;
      },
    });
  }

  private finishSaveCleanup(): void {
    this.loading = false;
    alert(this.translate.instant('adminCourseDetails.messages.saveSuccess'));
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
      alert(this.translate.instant('adminCourseDetails.errors.deleteNew'));
      return;
    }
    
    if (confirm(this.translate.instant('adminCourseDetails.confirm.deleteCourse'))) {
      this.loading = true;
      this.courseService.deleteCourse(this.courseId).subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/admin/courses']);
        },
        error: (err) => {
          alert(this.translate.instant('adminCourseDetails.errors.deleteCourse'));
          this.loading = false;
        }
      });
    }
  }

  setTranslationLanguage(lang: string): void {
    if (!lang) return;
    this.translationLang = lang;
  }

  setGoalsTranslationLanguage(lang: string): void {
    if (!lang) return;
    this.goalsTranslationLang = lang;
  }

  setContentTranslationLanguage(index: number, lang: string): void {
    if (!lang) return;
    this.contentTranslationLang[index] = lang;
  }

  getTranslationLanguages(): string[] {
    return ['en', 'fr', 'ar'];
  }

  getLanguageOptions(): string[] {
    return this.languages;
  }

  getTextContentValue(content: TextContent, field: 'title' | 'content'): string {
    const lang = this.resolveDefaultLanguage();
    const map = field === 'title' ? content.title : content.content;
    return this.getMapValue(map, lang);
  }

  setTextContentValue(content: TextContent, field: 'title' | 'content', value: string): void {
    const lang = this.resolveDefaultLanguage();
    if (field === 'title') {
      content.title = this.setMapValue(content.title, lang, value);
    } else {
      content.content = this.setMapValue(content.content, lang, value);
    }
  }

  getQuizQuestionValue(question: QuizQuestion): string {
    const lang = this.resolveDefaultLanguage();
    return this.getMapValue(question.question, lang);
  }

  setQuizQuestionValue(contentIndex: number, questionIndex: number, value: string): void {
    const content = this.formData.textContent?.[contentIndex];
    if (!content?.questions?.[questionIndex]) return;
    const lang = this.resolveDefaultLanguage();
    const question = content.questions[questionIndex];
    question.question = this.setMapValue(question.question, lang, value);
    this.ensureQuizTranslationScaffold(content);
    const apiQuestion = content.quizQuestions?.[questionIndex];
    if (apiQuestion) {
      apiQuestion.question = this.setMapValue(apiQuestion.question, lang, value);
    }
  }

  getCourseTranslationValue(lang: string, field: 'title' | 'description'): string {
    const translations = this.formData.translations || {};
    return (translations[lang] as any)?.[field] || '';
  }

  setCourseTranslationValue(lang: string, field: 'title' | 'description', value: string): void {
    if (!lang) return;
    this.formData.translations = this.formData.translations || {};
    const existing = this.formData.translations[lang] || {};
    this.formData.translations[lang] = { ...existing, [field]: value };
  }

  getCourseTranslationGoals(lang: string): string[] {
    const translations = this.formData.translations || {};
    const goals = (translations[lang] as any)?.goals;
    return Array.isArray(goals) ? goals : [];
  }

  addTranslatedGoal(lang: string): void {
    if (!lang) return;
    const goals = this.getCourseTranslationGoals(lang);
    const next = [...goals, ''];
    this.formData.translations = this.formData.translations || {};
    const existing = this.formData.translations[lang] || {};
    this.formData.translations[lang] = { ...existing, goals: next };
  }

  updateTranslatedGoal(lang: string, index: number, value: string): void {
    if (!lang) return;
    const goals = this.getCourseTranslationGoals(lang);
    const next = goals.slice();
    next[index] = value;
    this.formData.translations = this.formData.translations || {};
    const existing = this.formData.translations[lang] || {};
    this.formData.translations[lang] = { ...existing, goals: next };
  }

  removeTranslatedGoal(lang: string, index: number): void {
    if (!lang) return;
    const goals = this.getCourseTranslationGoals(lang).filter((_, i) => i !== index);
    this.formData.translations = this.formData.translations || {};
    const existing = this.formData.translations[lang] || {};
    this.formData.translations[lang] = { ...existing, goals };
  }

  getTextContentTranslationValue(content: TextContent, lang: string, field: 'title' | 'content'): string {
    if (!lang) return '';
    const map = field === 'title' ? content.title : content.content;
    if (!map) return '';
    if (typeof map === 'string') {
      return lang === this.resolveDefaultLanguage() ? map : '';
    }
    return map[lang] ?? '';
  }

  setTextContentTranslationValue(content: TextContent, lang: string, field: 'title' | 'content', value: string): void {
    if (!lang) return;
    if (field === 'title') {
      content.title = this.setMapValue(content.title, lang, value);
    } else {
      content.content = this.setMapValue(content.content, lang, value);
    }
  }

  getQuizQuestionTranslation(content: TextContent, questionIndex: number, lang: string): string {
    const q = content.quizQuestions?.[questionIndex];
    const map = q?.question;
    if (!map) return '';
    if (typeof map === 'string') {
      return lang === this.resolveDefaultLanguage() ? map : '';
    }
    return map[lang] ?? '';
  }

  setQuizQuestionTranslation(content: TextContent, questionIndex: number, lang: string, value: string): void {
    if (!lang) return;
    this.ensureQuizTranslationScaffold(content);
    const q = content.quizQuestions?.[questionIndex];
    if (!q) return;
    q.question = this.setMapValue(q.question, lang, value);
  }

  getQuizAnswerTranslation(content: TextContent, questionIndex: number, optionIndex: number, lang: string): string {
    const q = content.quizQuestions?.[questionIndex];
    const answer = q?.answers?.[optionIndex];
    const map = answer?.text;
    if (!map) return '';
    if (typeof map === 'string') {
      return lang === this.resolveDefaultLanguage() ? map : '';
    }
    return map[lang] ?? '';
  }

  setQuizAnswerTranslation(content: TextContent, questionIndex: number, optionIndex: number, lang: string, value: string): void {
    if (!lang) return;
    this.ensureQuizTranslationScaffold(content);
    const q = content.quizQuestions?.[questionIndex];
    const answer = q?.answers?.[optionIndex];
    if (!answer) return;
    answer.text = this.setMapValue(answer.text, lang, value);
  }

  private getPreferredLanguage(course?: Course | null): string {
    return course?.defaultLanguage || course?.languagesAvailable?.[0] || this.translate.currentLang || this.translate.defaultLang || 'en';
  }

  private resolveDefaultLanguage(): string {
    return this.formData.defaultLanguage || this.formData.languagesAvailable?.[0] || this.translate.currentLang || this.translate.defaultLang || 'en';
  }

  private resolveCourseTranslation(course: Course, lang: string): { title: string; description: string; goals: string[] } {
    const translations = course.translations || {};
    const localized = this.pickTranslation(translations, lang, course.defaultLanguage);
    return {
      title: localized?.title ?? course.title ?? '',
      description: localized?.description ?? course.description ?? '',
      goals: localized?.goals ?? course.goals ?? []
    };
  }

  private resolveTextContentTranslation(tc: TextContent, lang: string, fallbackLang?: string): { title: string; content: string } {
    const title = this.getMapValue(tc.title, lang, fallbackLang);
    const content = this.getMapValue(tc.content, lang, fallbackLang);
    if (title || content) {
      return { title, content };
    }
    const translations = tc.translations || {};
    const localized = this.pickTranslation(translations, lang, fallbackLang);
    return {
      title: localized?.title ?? this.getMapValue(tc.title),
      content: localized?.content ?? this.getMapValue(tc.content)
    };
  }

  private resolveQuizQuestionText(q: QuizQuestionApi, lang: string, fallbackLang?: string): string {
    const direct = this.getMapValue(q.question, lang, fallbackLang);
    if (direct) return direct;
    const translations = q.translations || {};
    const localized = this.pickTranslation(translations, lang, fallbackLang);
    return localized?.question || '';
  }

  private resolveQuizAnswerText(a: QuizAnswer, lang: string, fallbackLang?: string): string {
    const direct = this.getMapValue(a.text, lang, fallbackLang);
    if (direct) return direct;
    const translations = a.translations || {};
    const localized = this.pickTranslation(translations, lang, fallbackLang);
    return localized?.text || '';
  }

  private normalizeTextMap(
    value: Record<string, string> | string | undefined,
    lang: string,
    fallback: string
  ): Record<string, string> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const map = { ...value } as Record<string, string>;
      if (Object.keys(map).length) {
        return map;
      }
    }
    const text = typeof value === 'string' ? value : fallback;
    return lang ? { [lang]: text || '' } : {};
  }

  private mergeLegacyTextMap(
    value: Record<string, string> | string | undefined,
    translations: Record<string, { title?: string; content?: string; question?: string; text?: string }> | undefined,
    field: 'title' | 'content' | 'question' | 'text',
    lang: string
  ): Record<string, string> {
    const base = this.normalizeTextMap(value, lang, '');
    const merged = { ...base };
    Object.keys(translations || {}).forEach((key) => {
      const entry = translations?.[key] as any;
      const text = entry?.[field];
      if (text !== undefined && text !== null && text !== '') {
        merged[key] = text;
      }
    });
    return merged;
  }

  private getMapValue(map: Record<string, string> | string | undefined, lang?: string, fallbackLang?: string): string {
    if (!map) return '';
    if (typeof map === 'string') return map;
    if (lang && map[lang] !== undefined) return map[lang] ?? '';
    if (fallbackLang && map[fallbackLang] !== undefined) return map[fallbackLang] ?? '';
    return this.pickValue(map);
  }

  private setMapValue(
    map: Record<string, string> | undefined,
    lang: string,
    value: string
  ): Record<string, string> {
    const next = { ...(map || {}) };
    if (lang) {
      next[lang] = value;
    }
    return next;
  }

  private pickValue(map?: Record<string, string>): string {
    if (!map) return '';
    const values = Object.values(map);
    return values[0] ?? '';
  }

  private mergeCourseTranslations(
    translations: Record<string, any> | undefined,
    lang: string,
    payload: { title: string; description: string; goals: string[] }
  ): Record<string, any> {
    const next = { ...(translations || {}) };
    next[lang] = { title: payload.title, description: payload.description, goals: payload.goals };
    return next;
  }

  private mergeTextContentTranslations(
    translations: Record<string, any> | undefined,
    lang: string,
    payload: { title: string; content: string }
  ): Record<string, any> {
    const next = { ...(translations || {}) };
    next[lang] = { title: payload.title, content: payload.content };
    return next;
  }

  private mergeQuizQuestionTranslations(
    translations: Record<string, any> | undefined,
    lang: string,
    payload: { question: string }
  ): Record<string, any> {
    const next = { ...(translations || {}) };
    next[lang] = { question: payload.question };
    return next;
  }

  private mergeQuizAnswerTranslations(
    translations: Record<string, any> | undefined,
    lang: string,
    payload: { text: string }
  ): Record<string, any> {
    const next = { ...(translations || {}) };
    next[lang] = { text: payload.text };
    return next;
  }

  private ensureQuizTranslationScaffold(content: TextContent): void {
    if (!content.questions) return;
    const lang = this.resolveDefaultLanguage();
    content.quizQuestions = content.quizQuestions || [];
    content.questions.forEach((question, qi) => {
      const existing = content.quizQuestions?.[qi] || { id: '', question: {}, answers: [] };
      existing.question = { ...(existing.question || {}), ...(question.question || {}) };
      existing.answers = existing.answers || [];
      const options = question.options || [];
      existing.answers = options.map((opt, oi) => {
        const answer = existing.answers?.[oi] || { id: '', text: {}, correct: false };
        if (!answer.text || typeof answer.text !== 'object') {
          answer.text = {};
        }
        if (opt) {
          answer.text = this.setMapValue(answer.text, lang, opt);
        }
        return answer;
      });
      content.quizQuestions![qi] = existing;
    });
    content.quizQuestions = content.quizQuestions.slice(0, content.questions.length);
  }

  private pickTranslation<T extends Record<string, any>>(
    translations: Record<string, T>,
    lang: string,
    fallbackLang?: string
  ): T | undefined {
    if (!translations) return undefined;
    if (translations[lang]) return translations[lang];
    if (fallbackLang && translations[fallbackLang]) return translations[fallbackLang];
    if (translations['en']) return translations['en'];
    const firstKey = Object.keys(translations)[0];
    return firstKey ? translations[firstKey] : undefined;
  }

  private getInitialTranslationLanguage(): string {
    return 'en';
  }

  handleRetrieve(): void {
    if (!this.courseId || this.courseId === "new") {
      alert(this.translate.instant('adminCourseDetails.errors.retrieveNew'));
      return;
    }
    
    if (confirm(this.translate.instant('adminCourseDetails.confirm.retrieveCourse'))) {
      this.loading = true;
      this.courseService.unarchiveCourse(this.courseId).subscribe({
        next: () => {
          this.formData.archived = false;
          this.loading = false;
        },
        error: (err) => {
          alert(this.translate.instant('adminCourseDetails.errors.retrieveCourse'));
          this.loading = false;
        }
      });
    }
  }

  
}
