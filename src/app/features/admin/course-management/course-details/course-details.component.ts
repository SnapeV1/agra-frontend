import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Course } from "src/app/core/models/course";
import { CourseService } from "src/app/core/services/course/course.service";
import { ProgressService } from "src/app/core/services/progress.service";
import { SessionService } from "src/app/core/services/session.service";
import { CreateSessionDto } from "src/app/core/models/session.model";

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

  createSession(): void {
    if (!this.courseId) return;
    this.creatingSession = true;
    this.sessionService.create(this.courseId, this.newSession).subscribe({
      next: (s: any) => {
        this.formData.sessionIds = this.formData.sessionIds || [];
        if (s?.id) this.formData.sessionIds.push(s.id);
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
    private sessionService: SessionService
  ) {}

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get("id");
    if (this.courseId && this.courseId !== "new") {
      this.loadCourse(this.courseId);
    }
  }

  // Admin: start/join a live room for a session
  startSession(sessionId?: string): void {
    if (!sessionId || !this.courseId) { return; }
    this.router.navigate(['/courses', this.courseId, 'sessions', sessionId]);
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
          textContent: course.textContent || [],
          goals: course.goals || []
        };
        
        // Initialize all text content items as collapsed
        this.textContentCollapsed = {};
        (this.formData.textContent || []).forEach((_, index) => {
          this.textContentCollapsed[index] = true;
        });
        
        this.loading = false;
      },
      error: (err) => {
        this.error = "Failed to load course details.";
        this.loading = false;
      },
    });
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

  addSession(): void {
    const currentSessions = this.formData.sessionIds || [];
    this.formData.sessionIds = [...currentSessions, ""];
  }

  removeSession(index: number): void {
    const currentSessions = this.formData.sessionIds || [];
    this.formData.sessionIds = currentSessions.filter((_, i) => i !== index);
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

  handleFileUpload(event: any): void {
    const files = Array.from(event.target.files || []) as File[];
    if (files.length === 0) return;

    this.uploadingFiles = true;
    
    setTimeout(() => {
      // Store actual files
      this.selectedFiles = [...this.selectedFiles, ...files];
      
      const newFiles = files.map((file) => ({
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
        type: file.type || ""
      }));
      
      const currentFiles = this.formData.files || [];
      this.formData.files = [...currentFiles, ...newFiles];
      this.uploadingFiles = false;
      
      event.target.value = '';
    }, 2000);
  }

  removeFile(index: number): void {
    const currentFiles = this.formData.files || [];
    this.formData.files = currentFiles.filter((_, i) => i !== index);
    // Also remove from selectedFiles array
    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
  }

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

    this.loading = true;
    this.formData.updatedAt = new Date();
    
    if (this.courseId === "new") {
      this.formData.createdAt = new Date();
    }

    // Filter out empty goals before saving
    const filteredGoals = this.formData.goals.filter(goal => goal.trim() !== "");
    const courseDataToSave = {
      ...this.formData,
      goals: filteredGoals
    };

    const saveCall = this.courseId === "new"
      ? this.courseService.addCourse(courseDataToSave, this.selectedImageFile ?? undefined, this.selectedVideoFile ?? undefined)
      : this.courseService.updateCourse(this.formData.id!, courseDataToSave, this.selectedImageFile ?? undefined, this.selectedVideoFile ?? undefined);


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

        this.loading = false;
        alert("Course saved successfully!");
        

        // Log other files for future implementation
        if (this.selectedFiles.length > 0) {
          
        }
        
        // Clear selected files after successful save
        this.selectedImageFile = null;
        this.selectedVideoFile = null;
        this.selectedFiles = [];

        // Redirect to courses page after successful save
        this.router.navigate(['/admin/courses']);
      },
      error: (err) => {
        
        alert("Failed to save course.");  
        this.loading = false;
      },
    });
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
