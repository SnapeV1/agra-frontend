import { Component } from '@angular/core';
import { Course } from 'src/app/features/courses/models/course';

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

  // Base API URL
  private apiUrl = 'http://localhost:8080/api/courses';

  courseForm: Course = {
    id: '',
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
  };

  constructor() {}

  ngOnInit(): void {
    this.loadCourses();
  }

  /** Load all courses */
  async loadCourses(): Promise<void> {
    this.loading = true;
    try {
      const response = await fetch(`${this.apiUrl}/getAllCourses`);
      if (!response.ok) throw new Error('Failed to load courses');
      this.courses = await response.json();
    } catch (error) {
      console.error('Error loading courses:', error);
      alert('Failed to load courses from server.');
      this.courses = []; // or fallback mock data
    } finally {
      this.loading = false;
    }
  }

  /** Filtered courses for search */
  get filteredCourses(): Course[] {
    return this.courses.filter(course =>
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
      id: '',
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
    };
  }

  /** Add or Update Course */
  async saveCourse(): Promise<void> {
    if (!this.validateForm()) return;

    this.loading = true;
    try {
      this.courseForm.updatedAt = new Date();

      if (this.modalMode === 'add') {
        this.courseForm.createdAt = new Date();
        const response = await fetch(`${this.apiUrl}/addCourse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.courseForm)
        });
        if (!response.ok) throw new Error('Failed to add course');
        const newCourse = await response.json();
        this.courses.push(newCourse);

      } else {
        const response = await fetch(`${this.apiUrl}/updateCourse/${this.courseForm.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.courseForm)
        });
        if (!response.ok) throw new Error('Failed to update course');
        const updatedCourse = await response.json();
        const index = this.courses.findIndex(c => c.id === updatedCourse.id);
        if (index !== -1) {
          this.courses[index] = updatedCourse;
        }
      }

      this.closeModal();
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Error saving course. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  /** Delete Course */
  async deleteCourse(course: Course): Promise<void> {
    if (!confirm(`Are you sure you want to delete "${course.title}"?`)) return;

    this.loading = true;
    try {
      const response = await fetch(`${this.apiUrl}/deleteCourse/${course.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete course');
      this.courses = this.courses.filter(c => c.id !== course.id);
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Error deleting course. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  /** Validate form before submit */
  private validateForm(): boolean {
    if (!this.courseForm.title.trim()) {
      alert('Course title is required');
      return false;
    }
    if (!this.courseForm.trainerId.trim()) {
      alert('Trainer name is required');
      return false;
    }
    if (!this.courseForm.domain.trim()) {
      alert('Domain is required');
      return false;
    }
    return true;
  }
}
