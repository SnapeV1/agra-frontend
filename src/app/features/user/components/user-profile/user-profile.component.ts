import { Component, OnInit, OnDestroy } from '@angular/core';

import { Subject, takeUntil } from 'rxjs';
import { User } from '../../models/user.model';
import { AuthService } from 'src/app/services/auth/auth.service';

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
  editForm: Partial<User> = {};
  
  stats: ProfileStats[] = [
    {
      icon: '📚',
      label: 'Courses Completed',
      value: 0,
      color: 'bg-green-50 text-green-700'
    },
    {
      icon: '⭐',
      label: 'Average Score',
      value: '0%',
      color: 'bg-blue-50 text-blue-700'
    },
    {
      icon: '🕐',
      label: 'Hours Studied',
      value: 0,
      color: 'bg-purple-50 text-purple-700'
    },
    {
      icon: '🏆',
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

  constructor(private authService: AuthService) {}

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
    
    // First check if we have user data in the auth service
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
      console.log(this.userProfile)
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
        value: Math.floor(completedCourses * 8.5) // Estimate hours based on completed courses
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
      this.editForm = { ...this.userProfile };
    }
  }

  saveProfile(): void {
    if (!this.userProfile || !this.editForm) return;

    const updateData = { ...this.editForm };
    
    // Call the auth service to update profile
  /*  this.authService.updateUserProfile(updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser: User) => {
          this.userProfile = updatedUser;
          this.isEditing = false;
          this.editForm = {};
          console.log('Profile updated successfully');
          // You could add a success toast notification here
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          // You could add an error toast notification here
        }
      });*/
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editForm = {};
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
    if (!this.userProfile) return 'User';
    return this.userProfile.name || this.userProfile.email.split('@')[0] || 'User';
  }

  getUserRole(): string {
    if (!this.userProfile) return 'Member';
    return this.userProfile.role === 'ADMIN' ? 'Administrator' : 'Member';
  }

  getUserStatus(): string {
    return this.authService.isAuthenticated() ? 'Active' : 'Inactive';
  }

  getMemberSince(): string {
    // This should come from user data, for now we'll use a placeholder
    return '2023';
  }

  getLocation(): string {
    // This should come from user profile, for now we'll use a placeholder
    return  'Agriculture';
  }

  getUserEmail(): string {
    return this.userProfile?.email || '';
  }

  getUserPhone(): string {
    return this.userProfile?.phone || '+33 1 23 45 67 89';
  }
}