import { Component } from '@angular/core';
import { Course } from 'src/app/core/models/course';
import { CourseService } from 'src/app/core/services/course/course.service';

@Component({
  selector: 'app-course-management',
  templateUrl: './course-management.component.html',
  styleUrls: ['./course-management.component.css']
})
export class CourseManagementComponent {
  courses: Course[] = [];
  loading = false;
  showModal = false;
  modalMode: 'add' | 'edit' = 'add';
  selectedCourse: Course | null = null;
  searchTerm = '';
  filterStatus: 'all' | 'archived' | 'active' = 'all';
selectedImagePreview: string | null = null;
selectedImageFile: File | null = null;

languagesString = '';
sessionIdsString = '';
  courseForm: Course = {
    title: '',
    description: '',
    imageUrl: '',
    domain: '',
    country: '',
    trainerId: '',
    sessionIds: [],
    languagesAvailable: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    archived: false
  };

  constructor(private courseService: CourseService) {}

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
        console.error('Error loading courses:', error);
        alert('Failed to load courses from server.');
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

  openAddModal(): void {
    this.modalMode = 'add';
    this.resetForm();
    this.showModal = true;
  }

  openEditModal(course: Course): void {
    this.modalMode = 'edit';
    this.selectedCourse = course;
    this.courseForm = { ...course };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedCourse = null;
    this.resetForm();
  }

  resetForm(): void {
    this.courseForm = {
      title: '',
      description: '',
      imageUrl: '',
      domain: '',
      country: '',
      trainerId: '',
      archived: false,
      sessionIds: [],
      languagesAvailable: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  saveCourse(): void {
  if (!this.validateForm()) return;

  this.loading = true;
  this.courseForm.updatedAt = new Date();

  const isAdd = this.modalMode === 'add';
  if (isAdd) this.courseForm.createdAt = new Date();

  const serviceCall = isAdd 
    ? this.courseService.addCourse(this.courseForm, this.selectedImageFile || undefined)
    : this.courseService.updateCourse(this.courseForm.id!, this.courseForm, this.selectedImageFile || undefined);

  serviceCall.subscribe({
    next: (course) => {
      if (isAdd) {
        this.courses.push(course);
      } else {
        const index = this.courses.findIndex(c => c.id === course.id);
        if (index !== -1) this.courses[index] = course;
      }
      this.closeModal();
      this.loading = false;
    },
    error: (error) => {
      console.error('Error saving course:', error);
      alert('Error saving course. Please try again.');
      this.loading = false;
    }
  });
}


  toggleArchiveCourse(course: Course): void {
    const action = course.archived ? 'unarchive' : 'archive';
    if (!confirm(`Are you sure you want to ${action} "${course.title}"?`)) return;

    this.loading = true;
    this.courseService.archiveCourse(course.id!).subscribe({
      next: () => {
        course.archived = !course.archived; 
        this.loading = false;
      },
      error: (error) => {
        console.error(`Error trying to ${action} course:`, error);
        alert(`Error trying to ${action} course. Please try again.`);
        this.loading = false;
      }
    });
  }

  private validateForm(): boolean {
    if (!this.courseForm.title.trim()) {
      alert('Course title is required');
      return false;
    }
    if (!this.courseForm.trainerId.trim()) {
      alert('Trainer ID is required');
      return false;
    }
    if (!this.courseForm.domain.trim()) {
      alert('Domain is required');
      return false;
    }
    if (!this.courseForm.country.trim()) {
      alert('Country is required');
      return false;
    }
    return true;
  }

  deleteCourse(course: Course): void {
  if (!confirm(`Are you sure you want to permanently delete "${course.title}"? This action cannot be undone.`)) return;

  this.loading = true;
  this.courseService.deleteCourse(course.id!).subscribe({
    next: () => {
      this.courses = this.courses.filter(c => c.id !== course.id);
      this.loading = false;
    },
    error: (error) => {
      console.error('Error deleting course:', error);
      alert('Error deleting course. Please try again.');
      this.loading = false;
    }
  });
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


}