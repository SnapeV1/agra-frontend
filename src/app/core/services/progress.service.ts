import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { CourseProgress } from '../models/course';
import { AuthService } from './auth/auth.service';
import { environment } from 'src/environments/environment';

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

export interface CertificateProgressPayload {
  certificateUrl?: string;
  certificateCode?: string;
  certificateIssuedAt?: Date;
}

export interface SessionAnalytics {
  averageLessonMinutes: number;
  totalTrackedMinutes: number;
  peakHour: number | null;
  peakHourRange: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  private apiUrl = `${environment.apiBaseUrl}/progress`;
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
    const token = this.authService.getToken();
    if (!token) {
      return throwError(() => new Error('Authentication required'));
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    const url = `${this.apiUrl}/course/${courseId}`;
    
    return this.http.get<any>(url, { headers }).pipe(
      map((response: any) => {
        const certificateMeta = this.extractCertificateMetadata(response);
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
            certificateUrl: certificateMeta.certificateUrl,
            certificateCode: certificateMeta.certificateCode,
            certificateIssuedAt: certificateMeta.certificateIssuedAt,
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

  calculateSessionAnalytics(lessons: LessonProgress[]): SessionAnalytics {
    if (!Array.isArray(lessons) || lessons.length === 0) {
      return {
        averageLessonMinutes: 0,
        totalTrackedMinutes: 0,
        peakHour: null,
        peakHourRange: 'N/A'
      };
    }

    const totalMinutes = lessons.reduce((sum, lesson) => sum + (lesson.timeSpent || 0), 0);
    const average = Math.round(totalMinutes / lessons.length);
    const hourlyBuckets = Array.from({ length: 24 }, () => 0);

    lessons.forEach(lesson => {
      const lastAccessed = lesson.lastAccessedAt ? new Date(lesson.lastAccessedAt) : null;
      if (!lastAccessed || isNaN(lastAccessed.getTime())) {
        return;
      }
      const hour = lastAccessed.getHours();
      hourlyBuckets[hour] += lesson.timeSpent || 0;
    });

    const maxMinutes = Math.max(...hourlyBuckets);
    const peakHour = maxMinutes > 0 ? hourlyBuckets.indexOf(maxMinutes) : null;

    return {
      averageLessonMinutes: average,
      totalTrackedMinutes: totalMinutes,
      peakHour,
      peakHourRange: peakHour !== null ? this.formatHourRange(peakHour) : 'N/A'
    };
  }

  private formatHourRange(hour: number): string {
    const startLabel = this.formatHour(hour);
    const endLabel = this.formatHour((hour + 1) % 24);
    return `${startLabel} - ${endLabel}`;
  }

  private formatHour(hour: number): string {
    const normalized = ((hour % 24) + 24) % 24;
    const suffix = normalized >= 12 ? 'PM' : 'AM';
    const hour12 = normalized % 12 || 12;
    return `${hour12} ${suffix}`;
  }

  private extractCertificateMetadata(source: any): CertificateProgressPayload {
    if (!source) {
      return {};
    }
    const fromProgress = source.progress || {};
    const certificateBlock = source.certificate || fromProgress.certificate || {};
    const url =
      source.certificateUrl ||
      fromProgress.certificateUrl ||
      certificateBlock.url ||
      certificateBlock.downloadUrl ||
      source.verificationUrl ||
      source.certificateDownloadUrl;
    const code =
      source.certificateCode ||
      source.certificateVerificationCode ||
      source.verificationCode ||
      fromProgress.certificateCode ||
      fromProgress.verificationCode ||
      certificateBlock.code ||
      certificateBlock.verificationCode;
    const issuedRaw =
      source.certificateIssuedAt ||
      source.certificateIssuedOn ||
      source.issuedAt ||
      fromProgress.certificateIssuedAt ||
      fromProgress.certificateIssuedOn ||
      certificateBlock.issuedAt ||
      certificateBlock.issueDate ||
      certificateBlock.createdAt;

    return {
      certificateUrl: url,
      certificateCode: code,
      certificateIssuedAt: issuedRaw ? new Date(issuedRaw) : undefined
    };
  }

  // Generate certificate for completed course
  generateCertificate(courseId: string): Observable<CertificateProgressPayload> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/progress/generate`, {
      courseId,
      generatedAt: new Date()
    }, { headers }).pipe(
      map(response => this.extractCertificateMetadata(response))
    );
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
