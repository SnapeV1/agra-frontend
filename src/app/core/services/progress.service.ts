import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, map } from 'rxjs/operators';
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
    const url = `${this.apiUrl}/course/${courseId}`;
    
    return this.http.get<any>(url, { headers }).pipe(
      map((response: any) => {
        // Transform backend response to match CourseEnrollment interface
        const courseEnrollment: CourseEnrollment = {
          courseId: courseId,
          progress: {
            courseId: courseId,
            enrolledAt: response.enrolledAt ? new Date(response.enrolledAt) : new Date(),
            startedAt: response.startedAt ? new Date(response.startedAt) : new Date(),
            lastAccessedAt: response.lastAccessedAt ? new Date(response.lastAccessedAt) : new Date(),
            completedAt: response.completedAt ? new Date(response.completedAt) : undefined,
            completed: response.completed || false,
            completionPercentage: response.progressPercentage || 0,
            certificateUrl: response.certificateUrl,
            completedSessionIds: response.completedSessionIds || [],
            currentSessionId: response.currentSessionId,
            totalSessions: response.totalSessions || 0,
            totalTimeSpent: response.totalTimeSpent || 0,
            accessCount: response.accessCount || 0
          },
          lessons: [],
          currentLessonId: response.currentLessonId
        };

        // Handle different response formats from backend
        if (response.lessons && Array.isArray(response.lessons)) {
          // Backend returns lessons array directly
          courseEnrollment.lessons = response.lessons.map((lesson: any) => ({
            lessonId: lesson.lessonId,
            completed: lesson.completed || false,
            timeSpent: lesson.timeSpent || 0,
            completedAt: lesson.completedAt ? new Date(lesson.completedAt) : undefined,
            lastAccessedAt: lesson.lastAccessedAt ? new Date(lesson.lastAccessedAt) : new Date()
          }));
        } else if (response.completedLessons && Array.isArray(response.completedLessons)) {
          // Backend returns completedLessons array - need to transform
          courseEnrollment.lessons = response.completedLessons.map((lessonId: string) => ({
            lessonId: lessonId,
            completed: true,
            timeSpent: 0, // Backend doesn't provide this in completedLessons format
            completedAt: response.lessonCompletionDates?.[lessonId] ? new Date(response.lessonCompletionDates[lessonId]) : undefined,
            lastAccessedAt: new Date()
          }));
        }

        return courseEnrollment;
      })
    );
  }

  // Update lesson completion status
  markLessonComplete(courseId: string, lessonId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    const requestBody = {
      courseId,
      lessonId,
      completedAt: new Date()
    };
    const url = `${this.apiUrl}/lesson/complete`;
    
    return this.http.post(url, requestBody, { headers });
  }

  // Update lesson progress (time spent, last accessed)
  updateLessonProgress(courseId: string, lessonId: string, timeSpent: number): Observable<any> {
    const headers = this.getAuthHeaders();
    const requestBody = {
      courseId,
      lessonId,
      timeSpent,
      lastAccessedAt: new Date()
    };
    const url = `${this.apiUrl}/lesson/progress`;
    
    return this.http.put(url, requestBody, { headers });
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
    const percentage = Math.round((completedLessons / lessons.length) * 100);
    
    return percentage;
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
