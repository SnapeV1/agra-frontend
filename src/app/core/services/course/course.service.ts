import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Course, CourseProgress } from 'src/app/core/models/course';
import { AuthService } from '../auth/auth.service';
import { MockDataService } from '../mock-data.service';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private apiUrl = 'http://localhost:8080/api/courses'; 

  constructor(private http: HttpClient, private authService: AuthService, private mockDataService: MockDataService) { }

  getAllCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.apiUrl}/getAllCourses`);
  }

  getCourseById(id: string): Observable<Course> {
    return this.http.get<Course>(`${this.apiUrl}/${id}`);
  }

  getCoursesByDomain(domain: string): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.apiUrl}/domain/${domain}`);
  }

  getCoursesByCountry(country: string): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.apiUrl}/country/${country}`);
  }

  searchCourses(searchTerm: string): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.apiUrl}/search?q=${searchTerm}`);
  }

// Optional: Extended version of your CourseService to support more file types

addCourse(course: Course, image?: File, video?: File, attachments?: File[]): Observable<Course> {
  const courseJson = JSON.stringify(course);

  const formData = new FormData();
  
  formData.append('course', new Blob([courseJson], {
    type: 'application/json'
  }));
  
  if (image) {
    formData.append('image', image);
  }
  
  if (video) {
    formData.append('video', video);
  }
  
  if (attachments && attachments.length > 0) {
    attachments.forEach((file) => {
      formData.append('attachments', file);
    });
  }
  
  return this.http.post<Course>(`${this.apiUrl}/addCourse`, formData);
}

updateCourse(id: string, course: Course, image?: File, video?: File, attachments?: File[]): Observable<Course> {
  const courseJson = JSON.stringify(course);

  const formData = new FormData();
  
 formData.append('course', new Blob([courseJson], { type: 'application/json' }));

  
  if (image) {
    formData.append('image', image);
  }
  
  if (video) {
    formData.append('video', video);
  }
  
  if (attachments && attachments.length > 0) {
    attachments.forEach((file) => {
      formData.append('attachments', file);
    });
  }
  
  return this.http.put<Course>(`${this.apiUrl}/updateCourse/${id}`, formData);
}


  archiveCourse(id: string|null): Observable<any> {
    return this.http.put(`${this.apiUrl}/ArchiveCourse/${id}`, {});
  }

  unarchiveCourse(id: string|null): Observable<any> {
    return this.http.put(`${this.apiUrl}/UnarchiveCourse/${id}`, {});
  }

  deleteCourse(id: string|null): Observable<any> {
    return this.http.put(`${this.apiUrl}/ArchiveCourse/${id}`, {});
  }


  uploadCourseVideo(courseId: string, videoFile: File, videoName?: string): Observable<any> {
    const formData = new FormData();
    formData.append('video', videoFile);
    if (videoName) {
      formData.append('videoName', videoName);
    }
    
    return this.http.post<any>(`${this.apiUrl}/${courseId}/upload-video`, formData);
  }

  enrollInCourse(courseId: string): Observable<any> {
    const token = this.authService.getToken();
    
    if (!token) {
      throw new Error('Authentication required for enrollment');
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(`${this.apiUrl}/${courseId}/enroll`, {}, { headers });
  }

  checkEnrollmentStatus(courseId: string): Observable<any> {
    const token = this.authService.getToken();
    
    if (!token || !this.authService.isAuthenticated()) {
      // Return observable with default not-enrolled status instead of throwing error
      return new Observable(observer => {
        observer.next({ enrolled: false });
        observer.complete();
      });
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<any>(`${this.apiUrl}/${courseId}/enrollment-status`, { headers }).pipe(
      catchError(error => {
        // If we get a 403 or 401, it might be a token issue
        if (error.status === 403 || error.status === 401) {
          
          // Return default not-enrolled status instead of propagating the error
          return new Observable(observer => {
            observer.next({ enrolled: false });
            observer.complete();
          });
        }
        // For other errors, propagate them
        throw error;
      })
    );
  }

  getUserEnrolledCourses(): Observable<CourseProgress[]> {
    const token = this.authService.getToken();
    
    if (!token) {
      return this.mockDataService.getMockEnrolledCourses();
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    // Use the enhanced enrolled courses endpoint that now includes progress data
    return this.http.get<any>(`${this.apiUrl}/enrolled`, { headers })
      .pipe(
        map((response: any) => {
          
          // Handle the new response format with courses array and totalEnrollments
          const courses = response.courses || response; // Support both formats
          
          return courses.map((item: any) => {
            // Transform enhanced backend response to CourseProgress object
            return {
              courseId: item.id || item.courseId,
              enrolledAt: item.enrolledAt ? new Date(item.enrolledAt) : new Date(),
              startedAt: item.startedAt ? new Date(item.startedAt) : new Date(),
              lastAccessedAt: item.lastAccessedAt ? new Date(item.lastAccessedAt) : new Date(),
              completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
              completed: item.completed || false,
              completionPercentage: item.progressPercentage || 0,
              certificateUrl: item.certificateUrl,
              completedSessionIds: item.completedLessons || [],
              currentSessionId: item.currentLessonId,
              totalSessions: item.sessionIds ? item.sessionIds.length : 0,
              totalTimeSpent: item.totalTimeSpent || 0,
              accessCount: item.accessCount || 1
            } as CourseProgress;
          });
        }),
        catchError((error) => {
          
          return this.mockDataService.getMockEnrolledCourses();
        })
      );
  }

  getCourseProgress(courseId: string): Observable<any> {
    const token = this.authService.getToken();
    
    if (!token) {
      throw new Error('Authentication required to fetch course progress');
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<any>(`${this.apiUrl}/${courseId}/progress`, { headers });
  }
}