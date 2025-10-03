import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Course } from 'src/app/core/models/course';
import { CourseService } from 'src/app/core/services/course/course.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-course-management',
  templateUrl: './course-management.component.html',
  styleUrls: ['./course-management.component.css']
})
export class CourseManagementComponent {
  courses: Course[] = [];
  loading = false;
  showModal = false;
  searchTerm = '';
  filterStatus: 'all' | 'archived' | 'active' = 'active';

  selectedImagePreview: string | null = null;
  selectedImageFile: File | null = null;
  selectedVideoFile: File | null = null;
  videoUploadProgress = 0;
  videoUploading = false;
  videoUploadError: string | null = null;

  languagesString = '';
  sessionIdsString = '';

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

  courseForm: Course = {
    title: '',
    description: '',
    imageUrl: 'https://res.cloudinary.com/dmumvupow/image/upload/v1758218323/defaultCourse_qqgiil.png',
    domain: '',
    country: '',
    trainerId: 'UMNAGRI',
    sessionIds: [],
    languagesAvailable: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    archived: false,
    files: [],
    textContent: [],
    goals: []

  };

  constructor(private courseService: CourseService, private router: Router) {}

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.loading = true;
    this.courseService.getAllCourses().subscribe({
      next: (courses) => {
        this.courses = courses;
        this.loading = false;
      },
      error: (error) => {
        alert('Failed to load courses.');
        this.courses = [];
        this.loading = false;
      }
    });
  }

  get filteredCourses(): Course[] {
    return this.courses
      .filter(course => {
        if (this.filterStatus === 'archived') return course.archived;
        if (this.filterStatus === 'active') return !course.archived;
        return true;
      })
      .filter(course =>
        course.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        course.trainerId.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        course.domain.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
  }

  goToCourseDetails(course: Course): void {
    this.router.navigate(['/admin/coursedetails', course.id]); 
  }

  openAddModal(): void {
    this.resetForm();
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.resetForm();
  }

  resetForm(): void {
    this.courseForm = {
      title: '',
      imageUrl: 'https://res.cloudinary.com/dmumvupow/image/upload/v1758218323/defaultCourse_qqgiil.png',
      description: '',
      domain: '',
      country: '',
      trainerId: 'UMNAGRI',
      archived: false,
      sessionIds: [],
      languagesAvailable: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      files: [],
      textContent: [],
       goals: []
    };
    this.languagesString = '';
    this.sessionIdsString = '';
    this.selectedImageFile = null;
    this.selectedImagePreview = null;
    this.selectedVideoFile = null;
    this.videoUploadProgress = 0;
    this.videoUploading = false;
    this.videoUploadError = null;
  }

  saveCourse(): void {
    if (!this.validateForm()) return;

    this.loading = true;
    this.courseForm.createdAt = new Date();
    this.courseForm.updatedAt = new Date();

    this.courseForm.languagesAvailable = this.languagesString
      ? this.languagesString.split(',').map(lang => lang.trim())
      : [];
    this.courseForm.sessionIds = this.sessionIdsString
      ? this.sessionIdsString.split(',').map(id => id.trim())
      : [];

    this.courseService.addCourse(this.courseForm, this.selectedImageFile || undefined, this.selectedVideoFile || undefined)
      .subscribe({
        next: (course) => {
          this.courses.push(course);
          this.goToCourseDetails(course);
          this.closeModal();
          this.loading = false;
        },
        error: (error) => {
          alert('Error saving course. Please try again.');
          this.loading = false;
        }
      });
  }


  private validateForm(): boolean {
    if (!this.courseForm.title.trim()) {
      alert('Course title is required');
      return false;
    }
    return true;
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedImageFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.selectedImagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.selectedImageFile = null;
    this.selectedImagePreview = null;
    this.courseForm.imageUrl = '';
  }


  onVideoSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      if (!file.type.startsWith('video/')) {
        this.videoUploadError = 'Please select a valid video file';
        return;
      }
      
      this.selectedVideoFile = file;
      this.videoUploadError = null;
    }
  }


  uploadCourseVideo(courseId: string, videoName?: string): void {
    if (!this.selectedVideoFile) {
      this.videoUploadError = 'Please select a video file first';
      return;
    }

    this.videoUploading = true;
    this.videoUploadProgress = 0;
    this.videoUploadError = null;

    this.courseService.uploadCourseVideo(courseId, this.selectedVideoFile, videoName)
      .subscribe({
        next: (response) => {
          if (response && response.videoUrl) {
            const courseIndex = this.courses.findIndex(c => c.id === courseId);
            if (courseIndex !== -1) {
              this.courses[courseIndex].videoUrl = response.videoUrl;
              this.courses[courseIndex].videoPublicId = response.publicId;
            }

            if (this.courseForm.id === courseId) {
              this.courseForm.videoUrl = response.videoUrl;
              this.courseForm.videoPublicId = response.publicId;
            }
          }
          
          this.videoUploading = false;
          this.videoUploadProgress = 100;
          this.selectedVideoFile = null;
          
          alert('Video uploaded successfully!');
        },
        error: (error: HttpErrorResponse) => {
          this.videoUploading = false;
          this.videoUploadProgress = 0;
          
          // Extract error message from response if available
          let errorMessage = 'Failed to upload video';
          if (error.error && error.error.error) {
            errorMessage = error.error.error;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          this.videoUploadError = errorMessage;
        }
      });
  }

  /**
   * Removes the selected video file and resets upload state
   */
  removeVideo(): void {
    this.selectedVideoFile = null;
    this.videoUploadProgress = 0;
    this.videoUploading = false;
    this.videoUploadError = null;
  }
}
