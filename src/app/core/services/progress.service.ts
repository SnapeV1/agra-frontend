import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { CourseProgress } from '../models/course';
import { AuthService } from './auth/auth.service';
// import { environment } from '../../../environments/environment';

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  timeSpent: number; // in minutes
  completedAt?: Date;
  lastAccessedAt: Date;
}

export interface CourseEnrollment {
  courseId: string;
  progress: CourseProgress;
  lessons: LessonProgress[];
  currentLessonId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  private apiUrl = 'http://localhost:8080/api/progress';
  private currentProgressSubject = new BehaviorSubject<CourseEnrollment | null>(null);
  public currentProgress$ = this.currentProgressSubject.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) { }

  // Helper method to create authenticated headers
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // Get user's progress for a specific course
  getCourseProgress(courseId: string): Observable<CourseEnrollment> {
    const headers = this.getAuthHeaders();
    return this.http.get<CourseEnrollment>(`${this.apiUrl}/course/${courseId}`, { headers });
  }

  // Update lesson completion status
  markLessonComplete(courseId: string, lessonId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/lesson/complete`, {
      courseId,
      lessonId,
      completedAt: new Date()
    }, { headers });
  }

  // Update lesson progress (time spent, last accessed)
  updateLessonProgress(courseId: string, lessonId: string, timeSpent: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.apiUrl}/lesson/progress`, {
      courseId,
      lessonId,
      timeSpent,
      lastAccessedAt: new Date()
    }, { headers });
  }

  // Set current lesson
  setCurrentLesson(courseId: string, lessonId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.apiUrl}/current-lesson`, {
      courseId,
      lessonId
    }, { headers });
  }

  // Complete entire course
  completeCourse(courseId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/course/complete`, {
      courseId,
      completedAt: new Date()
    }, { headers });
  }

  // Local state management
  setCurrentProgress(progress: CourseEnrollment): void {
    this.currentProgressSubject.next(progress);
  }

  getCurrentProgress(): CourseEnrollment | null {
    return this.currentProgressSubject.value;
  }

  // Calculate overall course completion percentage
  calculateCompletionPercentage(lessons: LessonProgress[]): number {
    if (lessons.length === 0) return 0;
    const completedLessons = lessons.filter(lesson => lesson.completed).length;
    return Math.round((completedLessons / lessons.length) * 100);
  }

  // Get total time spent on course
  getTotalTimeSpent(lessons: LessonProgress[]): number {
    return lessons.reduce((total, lesson) => total + lesson.timeSpent, 0);
  }

  // Generate certificate for completed course
  generateCertificate(courseId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/certificate/generate`, {
      courseId,
      generatedAt: new Date()
    }, { headers });
  }

  // Download certificate
  downloadCertificate(courseId: string): Observable<Blob> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/certificate/${courseId}/download`, {
      responseType: 'blob',
      headers
    });
  }
}
