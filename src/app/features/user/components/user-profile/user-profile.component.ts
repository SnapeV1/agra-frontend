import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { User } from '../../../../core/models/user.model';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { ProfileService } from 'src/app/core/services/profile/profile.service';

interface ProfileStats {
  icon: string;
  label: string;
  value: string | number;
  color: string;
}

interface Course {
  id: string;
  title: string;
  category: string;
  progress: number;
  status: 'not-started' | 'in-progress' | 'completed';
}

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  userProfile: User | null = null;
  isEditing = false;
  isLoading = true;
  isSaving = false;
  editForm: Partial<User> = {};
  originalProfile: User | null = null;
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  stats: ProfileStats[] = [
    {
      icon: 'book',
      label: 'Courses Completed',
      value: 0,
      color: 'bg-green-50 text-green-700'
    },
    {
      icon: 'star',
      label: 'Average Score',
      value: '0%',
      color: 'bg-blue-50 text-blue-700'
    },
    {
      icon: 'clock',
      label: 'Hours Studied',
      value: 0,
      color: 'bg-purple-50 text-purple-700'
    },
    {
      icon: 'trophy',
      label: 'Certificates Earned',
      value: 0,
      color: 'bg-amber-50 text-amber-700'
    }
  ];

  courses: Course[] = [
    {
      id: '1',
      title: 'Sustainable Agriculture Fundamentals',
      category: 'Agriculture Basics',
      progress: 75,
      status: 'in-progress'
    },
    {
      id: '2',
      title: 'Crop Management Techniques',
      category: 'Advanced Farming',
      progress: 100,
      status: 'completed'
    },
    {
      id: '3',
      title: 'Soil Health and Nutrition',
      category: 'Soil Science',
      progress: 0,
      status: 'not-started'
    }
  ];

  constructor(private authService: AuthService, private profileService: ProfileService) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.subscribeToUserChanges();
    this.updateStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToUserChanges(): void {
    this.authService.currentUser
      .pipe(takeUntil(this.destroy$))
      .subscribe(authUser => {
        if (authUser?.user) {
          this.userProfile = authUser.user;
          this.isLoading = false;
        }
      });
  }

  private loadUserProfile(): void {
    this.isLoading = true;
    
    const currentAuthUser = this.authService.currentUserValue;
    if (currentAuthUser?.user) {
      this.userProfile = currentAuthUser.user;
      this.isLoading = false;
    }

    this.authService.getCurrentUserFromBackend()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: User) => {
          this.userProfile = user;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading user profile:', error);
          this.isLoading = false;
        }
      });
  }

  private updateStats(): void {
    const completedCourses = this.courses.filter(course => course.status === 'completed').length;
    const totalProgress = this.courses.reduce((sum, course) => sum + course.progress, 0);
    const averageScore = this.courses.length > 0 ? Math.round(totalProgress / this.courses.length) : 0;
    
    this.stats = [
      {
        ...this.stats[0],
        value: completedCourses
      },
      {
        ...this.stats[1],
        value: `${averageScore}%`
      },
      {
        ...this.stats[2],
        value: Math.floor(completedCourses * 8.5)
      },
      {
        ...this.stats[3],
        value: completedCourses
      }
    ];
  }

  toggleEdit(): void {
    if (!this.userProfile) return;

    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.originalProfile = JSON.parse(JSON.stringify(this.userProfile));
      this.editForm = { ...this.userProfile };
      this.selectedFile = null;
      this.previewUrl = null;
    } else {
      this.resetEditState();
    }
  }

  saveProfile(): void {
    if (!this.userProfile || !this.editForm || this.isSaving) return;

    this.isSaving = true;
    
    const updateData: any = {};
    
    if (this.editForm.name && this.editForm.name !== this.originalProfile?.name) {
      updateData.name = this.editForm.name;
    }
    if (this.editForm.email && this.editForm.email !== this.originalProfile?.email) {
      updateData.email = this.editForm.email;
    }
    if (this.editForm.phone && this.editForm.phone !== this.originalProfile?.phone) {
      updateData.phone = this.editForm.phone;
    }
    if (this.editForm.country && this.editForm.country !== this.originalProfile?.country) {
      updateData.country = this.editForm.country;
    }
    if (this.editForm.language && this.editForm.language !== this.originalProfile?.language) {
      updateData.language = this.editForm.language;
    }
    if (this.editForm.domain && this.editForm.domain !== this.originalProfile?.domain) {
      updateData.domain = this.editForm.domain;
    }

    this.profileService.updateUserProfile(updateData, this.selectedFile || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser: User) => {
          this.userProfile = updatedUser;
          
          this.authService.updateCurrentUser(updatedUser);
          
          this.resetEditState();
          this.isEditing = false;
          this.isSaving = false;
          
      
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          this.isSaving = false;
          
          if (error.status === 401) {
            console.error('Unauthorized: Please login again');
            this.authService.logout('/login');
          } else if (error.status === 400) {
            console.error('Bad request: Please check your input data');
          } else {
            console.error('Server error: Please try again later');
          }
          
         
        }
      });
  }

  onProfilePictureChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0] || !this.isEditing) return;

    const file = input.files[0];
    
    if (!file.type.startsWith('image/')) {
      console.error('Please select a valid image file');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      console.error('File size must be less than 5MB');
      return;
    }

    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  cancelEdit(): void {
    if (!this.originalProfile) return;

    this.userProfile = JSON.parse(JSON.stringify(this.originalProfile));
    
    this.resetEditState();
    this.isEditing = false;
  }

  private resetEditState(): void {
    this.editForm = {};
    this.originalProfile = null;
    this.selectedFile = null;
    this.previewUrl = null;
    this.isSaving = false;
  }

  getDisplayPicture(): string {
    if (this.isEditing && this.previewUrl) {
      return this.previewUrl;
    }
    return this.userProfile?.picture || '';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'not-started':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  continueCourse(courseId: string): void {
    console.log('Continue course:', courseId);
    // Implement navigation to course
  }

  startCourse(courseId: string): void {
    console.log('Start course:', courseId);
    // Implement course start logic
  }

  viewCertificate(courseId: string): void {
    console.log('View certificate for course:', courseId);
    // Implement certificate viewing
  }

  getUserDisplayName(): string {
    if (this.isEditing && this.editForm.name) {
      return this.editForm.name;
    }
    if (!this.userProfile) return 'User';
    return this.userProfile.name || this.userProfile.email.split('@')[0] || 'User';
  }

  getUserRole(): string {
    if (!this.userProfile) return 'Member';
    return this.userProfile.role === 'ADMIN' ? 'Administrator' : 'Member';
  }


getMemberSince(): string {
  const date = this.userProfile?.registeredAt ? new Date(this.userProfile.registeredAt) : null;
  if (!date) return '';

  const formatted = date.toLocaleString('default', { month: 'long', year: 'numeric' });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}



  getLocation(): string {
    return 'Agriculture';
  }

  getUserEmail(): string {
    if (this.isEditing && this.editForm.email) {
      return this.editForm.email;
    }
    return this.userProfile?.email || '';
  }

  getUserPhone(): string {
    if (this.isEditing && this.editForm.phone) {
      return this.editForm.phone;
    }
    return this.userProfile?.phone || '+33 1 23 45 67 89';
  }

  hasFormChanges(): boolean {
    if (!this.originalProfile || !this.isEditing) return false;
    
    return (
      this.selectedFile !== null ||
      this.editForm.name !== this.originalProfile.name ||
      this.editForm.email !== this.originalProfile.email ||
      this.editForm.phone !== this.originalProfile.phone ||
      this.editForm.country !== this.originalProfile.country ||
      this.editForm.language !== this.originalProfile.language ||
      this.editForm.domain !== this.originalProfile.domain
    );
  }
}