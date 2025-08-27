import { Component, OnInit } from '@angular/core';
import { User } from '../../models/user.model';
import { AuthService } from 'src/app/services/auth/auth.service';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  user: User | null = null;
  isEditing = false;
  editForm: Partial<User> = {};
  loading = true;
  error: string | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.loadCurrentUser();
  }

  private loadCurrentUser(): void {
    this.loading = true;
    this.authService.getCurrentUserFromBackend().subscribe({
      next: userData => {
        this.user = { ...userData };
        this.editForm = { ...this.user };
        this.loading = false;
        console.log('Loaded user:', this.user);
      },
      error: err => {
        this.error = 'Failed to load user';
        this.loading = false;
        console.error(err);
      }
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing && this.user) {
      this.editForm = { ...this.user };
    }
  }

  saveProfile() {
    if (!this.user) return;
    this.user = { ...this.user, ...this.editForm };
    this.isEditing = false;
    console.log('Profile saved:', this.user);

    // Optionally, send updated user to backend here
    // this.authService.updateUser(this.user).subscribe(...);
  }

  getProgressColor(progress: number): string {
    if (progress >= 90) return '#10b981';
    if (progress >= 70) return '#22c55e';
    if (progress >= 50) return '#f59e0b';
    if (progress >= 30) return '#f97316';
    return '#ef4444';
  }

  getProgressGradient(progress: number): string {
    if (progress >= 90) return 'linear-gradient(90deg, #10b981, #22c55e)';
    if (progress >= 70) return 'linear-gradient(90deg, #22c55e, #84cc16)';
    if (progress >= 50) return 'linear-gradient(90deg, #f59e0b, #f97316)';
    if (progress >= 30) return 'linear-gradient(90deg, #f97316, #ea580c)';
    return 'linear-gradient(90deg, #ef4444, #dc2626)';
  }

  getRegistrationDate(): string {
    if (!this.user) return '';
    const date = new Date(this.user.registeredAt);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getCompletedCourses(): number {
    return this.user?.progress?.filter(p => p.status === 'completed').length || 0;
  }

  getInProgressCourses(): number {
    return this.user?.progress?.filter(p => p.status === 'in-progress').length || 0;
  }

  getAverageProgress(): number {
    if (!this.user?.progress || this.user.progress.length === 0) return 0;
    const total = this.user.progress.reduce((sum, course) => sum + course.progress, 0);
    return Math.round(total / this.user.progress.length);
  }

  getTotalCourses(): number {
    return this.user?.progress?.length || 0;
  }

  continueCourse(courseId: string) {
    console.log('Navigating to course:', courseId);
    // this.router.navigate(['/courses', courseId]);
  }

  viewCertificate(courseId: string) {
    console.log('Viewing certificate for course:', courseId);
    // this.certificateService.downloadCertificate(courseId);
  }

  onImageUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.editForm.picture = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  isPremiumUser(): boolean {
    return this.user?.role === 'Premium User';
  }

  formatCompletionDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}
