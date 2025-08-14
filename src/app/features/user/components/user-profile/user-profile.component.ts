import { Component, OnInit } from '@angular/core';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  user: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    phone: '+1 (555) 123-4567',
    picture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    country: 'United States',
    language: 'English',
    domain: 'Technology',
    role: 'Premium User',
    registeredAt: '2023-01-15T08:30:00Z',
    archived: false,
    progress: [
      {
        courseId: 'course-1',
        courseName: 'JavaScript Avancé',
        progress: 85,
        status: 'in-progress'
      },
      {
        courseId: 'course-2',
        courseName: 'Fondamentaux React',
        progress: 100,
        completedAt: '2024-02-15T10:30:00Z',
        status: 'completed'
      },
      {
        courseId: 'course-3',
        courseName: 'Backend Node.js',
        progress: 45,
        status: 'in-progress'
      },
      {
        courseId: 'course-4',
        courseName: 'Base de Données MongoDB',
        progress: 20,
        status: 'in-progress'
      }
    ]
  };

  isEditing = false;
  editForm: Partial<User> = {};

  ngOnInit() {
    this.editForm = { ...this.user };
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      // Reset form when canceling edit
      this.editForm = { ...this.user };
    }
  }

  saveProfile() {
    // Here you would typically call a service to save the user data
    this.user = { ...this.user, ...this.editForm };
    this.isEditing = false;
    console.log('Profil sauvegardé:', this.user);
    
    // You might want to show a success message here
    // this.showSuccessMessage('Profil mis à jour avec succès!');
  }

  /**
   * Get progress color based on completion percentage
   */
  getProgressColor(progress: number): string {
    if (progress >= 90) return '#10b981'; // Green for 90%+
    if (progress >= 70) return '#22c55e'; // Light green for 70-89%
    if (progress >= 50) return '#f59e0b'; // Orange for 50-69%
    if (progress >= 30) return '#f97316'; // Dark orange for 30-49%
    return '#ef4444'; // Red for <30%
  }

  /**
   * Get progress gradient for progress bars
   */
  getProgressGradient(progress: number): string {
    if (progress >= 90) return 'linear-gradient(90deg, #10b981, #22c55e)';
    if (progress >= 70) return 'linear-gradient(90deg, #22c55e, #84cc16)';
    if (progress >= 50) return 'linear-gradient(90deg, #f59e0b, #f97316)';
    if (progress >= 30) return 'linear-gradient(90deg, #f97316, #ea580c)';
    return 'linear-gradient(90deg, #ef4444, #dc2626)';
  }

  /**
   * Format registration date in French
   */
  getRegistrationDate(): string {
    const date = new Date(this.user.registeredAt);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Get count of completed courses
   */
  getCompletedCourses(): number {
    return this.user.progress?.filter(p => p.status === 'completed').length || 0;
  }

  /**
   * Get count of courses in progress
   */
  getInProgressCourses(): number {
    return this.user.progress?.filter(p => p.status === 'in-progress').length || 0;
  }

  /**
   * Calculate average progress across all courses
   */
  getAverageProgress(): number {
    if (!this.user.progress || this.user.progress.length === 0) return 0;
    const total = this.user.progress.reduce((sum, course) => sum + course.progress, 0);
    return Math.round(total / this.user.progress.length);
  }

  /**
   * Get total number of enrolled courses
   */
  getTotalCourses(): number {
    return this.user.progress?.length || 0;
  }

  /**
   * Continue a course (navigate to course detail)
   */
  continueCourse(courseId: string) {
    console.log('Navigating to course:', courseId);
    // Here you would typically navigate to the course detail page
    // this.router.navigate(['/courses', courseId]);
  }

  /**
   * Download or view certificate
   */
  viewCertificate(courseId: string) {
    console.log('Viewing certificate for course:', courseId);
    // Here you would typically download or display the certificate
    // this.certificateService.downloadCertificate(courseId);
  }

  /**
   * Handle profile image upload
   */
  onImageUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      // Here you would typically upload the image to a server
      const reader = new FileReader();
      reader.onload = (e) => {
        this.editForm.picture = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Check if user is premium
   */
  isPremiumUser(): boolean {
    return this.user.role === 'Premium User';
  }

  /**
   * Format completion date in French
   */
  formatCompletionDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}