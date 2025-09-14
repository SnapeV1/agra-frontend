import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Course } from "src/app/core/models/course";
import { CourseService } from "src/app/core/services/course/course.service";

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

  formData: Course = {
    id: "",
    title: "",
    description: "",
    domain: "",
    country: "",
    trainerId: "",
    imageUrl: "",
    videoUrl: "",
    sessionIds: [],
    languagesAvailable: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    archived: false,
    files: [],
    textContent: []
  };

  formErrors: Record<string, string> = {};

  domains: string[] = ["Technology", "Business", "Design", "Marketing", "Healthcare", "Education"];
  countries: string[] = ["United States", "United Kingdom", "Canada", "Australia", "Germany", "France"];
  languages: string[] = ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Chinese", "Japanese"];
  textContentTypes: string[] = ["lesson", "assignment", "reading", "quiz", "project"];

  constructor(private route: ActivatedRoute, private courseService: CourseService) {}

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get("id");
    if (this.courseId && this.courseId !== "new") {
      this.loadCourse(this.courseId);
    }
  }

  loadCourse(id: string): void {
    this.loading = true;
    this.courseService.getCourseById(id).subscribe({
      next: (course) => {
        this.course = course;
        this.formData = { ...course };
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
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
      case "domain":
        return !value ? "Domain is required" : "";
      case "country":
        return !value ? "Country is required" : "";
      case "trainerId":
        return !value ? "Trainer ID is required" : "";
      default:
        return "";
    }
  }

  updateField(field: keyof Course, event: any): void {
    const value = event.target ? event.target.value : event;
    this.formData = { ...this.formData, [field]: value };
    const error = this.validateField(field, value);
    this.formErrors = { ...this.formErrors, [field]: error };
  }

  handleLanguageToggle(language: string): void {
    if (this.formData.languagesAvailable.includes(language)) {
      this.formData.languagesAvailable = this.formData.languagesAvailable.filter((l) => l !== language);
    } else {
      this.formData.languagesAvailable = [...this.formData.languagesAvailable, language];
    }
  }

  addSession(): void {
    this.formData.sessionIds = [...this.formData.sessionIds, ""];
  }

  updateSession(index: number, event: any): void {
    const value = event.target.value;
    this.formData.sessionIds = this.formData.sessionIds.map((s, i) => (i === index ? value : s));
  }

  removeSession(index: number): void {
    this.formData.sessionIds = this.formData.sessionIds.filter((_, i) => i !== index);
  }

  // Missing text content functions
  addTextContent(): void {
    this.formData.textContent = [...this.formData.textContent, { title: "", type: "lesson", content: "",order:1 }];
  }

  updateTextContent(index: number, field: string, event: any): void {
    const value = event.target.value;
    this.formData.textContent = this.formData.textContent.map((content, i) =>
      i === index ? { ...content, [field]: value } : content,
    );
  }

  removeTextContent(index: number): void {
    this.formData.textContent = this.formData.textContent.filter((_, i) => i !== index);
  }

  moveTextContent(index: number, direction: "up" | "down"): void {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === this.formData.textContent.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const newContent = [...this.formData.textContent];
    const temp = newContent[index];
    newContent[index] = newContent[newIndex];
    newContent[newIndex] = temp;
    this.formData.textContent = newContent;
  }

  handleImageUpload(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    this.uploadingImage = true;

    // Simulate upload
    setTimeout(() => {
      this.formData.imageUrl = URL.createObjectURL(file);
      this.uploadingImage = false;
    }, 2000);
  }

  // Missing video upload functions
  handleVideoUpload(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    this.uploadingVideo = true;
    // Simulate upload
    setTimeout(() => {
      this.formData.videoUrl = URL.createObjectURL(file);
      this.uploadingVideo = false;
    }, 3000);
  }

  removeVideo(): void {
    this.formData.videoUrl = "";
  }

  // Missing file upload functions
  handleFileUpload(event: any): void {
    const files = Array.from(event.target.files || []) as File[];
    if (files.length === 0) return;

    this.uploadingFiles = true;
    // Simulate upload
    setTimeout(() => {
      const newFiles = files.map((file) => ({
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
        type:""
      }));
      this.formData.files = [...this.formData.files, ...newFiles];
      this.uploadingFiles = false;
    }, 2000);
  }

  removeFile(index: number): void {
    this.formData.files = this.formData.files.filter((_, i) => i !== index);
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
  }

  isFormValid(): boolean {
    const requiredFields: (keyof Course)[] = ["title", "description", "domain", "country", "trainerId"];
    return requiredFields.every((f) => !this.validateField(f, this.formData[f]));
  }

  // Missing validation helper functions
  hasValidationErrors(): boolean {
    return Object.values(this.formErrors).some((error) => error);
  }

  getValidationErrors(): string[] {
    return Object.values(this.formErrors).filter((error) => error);
  }

  handleSave(): void {
    if (!this.isFormValid()) {
      alert("Please fix validation errors before saving.");
      return;
    }

    this.loading = true;

    const saveCall = this.courseId === "new"
      ? this.courseService.addCourse(this.formData)
      : this.courseService.updateCourse(this.formData.id!, this.formData);

    saveCall.subscribe({
      next: (savedCourse) => {
        this.course = savedCourse;
        this.formData = { ...savedCourse };
        this.loading = false;
        alert("Course saved successfully!");
      },
      error: (err) => {
        console.error(err);
        alert("Failed to save course.");
        this.loading = false;
      },
    });
  }

  toggleArchived(): void {
    this.formData.archived = !this.formData.archived;
  }

  // Missing action functions
  handlePreview(): void {
    alert("Opening course preview...");
  }

  handleDuplicate(): void {
    this.courseId = "new";
    this.formData.id = "";
    this.formData.title = `${this.formData.title} (Copy)`;
  }

  handleDelete(): void {
    if (confirm("Are you sure you want to delete this course?")) {
      alert("Course deleted!");
    }
  }
}