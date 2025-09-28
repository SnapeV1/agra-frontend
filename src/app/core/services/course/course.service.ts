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
  // DEBUG: Log the course data being sent
  console.log('=== COURSE ADD DEBUG ===');
  console.log('Course Data:', course);
  console.log('Text Content:', course.textContent);
  console.log('Goals:', course.goals);
  console.log('Session IDs:', course.sessionIds);
  console.log('Languages Available:', course.languagesAvailable);
  console.log('Files:', course.files);
  
  // DEBUG: Log file attachments
  console.log('Image File:', image ? { name: image.name, size: image.size, type: image.type } : 'None');
  console.log('Video File:', video ? { name: video.name, size: video.size, type: video.type } : 'None');
  console.log('Attachment Files:', attachments ? attachments.map(f => ({ name: f.name, size: f.size, type: f.type })) : 'None');
  
  // DEBUG: Log the JSON string that will be sent
  const courseJson = JSON.stringify(course);
  console.log('Course JSON String Length:', courseJson.length);
  console.log('Course JSON String:', courseJson);
  console.log('=== END DEBUG ===');

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
  // DEBUG: Log the course data being sent
  console.log('=== COURSE UPDATE DEBUG ===');
  console.log('Course ID:', id);
  console.log('Course Data:', course);
  console.log('Text Content:', course.textContent);
  console.log('Goals:', course.goals);
  console.log('Session IDs:', course.sessionIds);
  console.log('Languages Available:', course.languagesAvailable);
  console.log('Files:', course.files);
  
  // DEBUG: Log file attachments
  console.log('Image File:', image ? { name: image.name, size: image.size, type: image.type } : 'None');
  console.log('Video File:', video ? { name: video.name, size: video.size, type: video.type } : 'None');
  console.log('Attachment Files:', attachments ? attachments.map(f => ({ name: f.name, size: f.size, type: f.type })) : 'None');
  
  // DEBUG: Log the JSON string that will be sent
  const courseJson = JSON.stringify(course);
  console.log('Course JSON String Length:', courseJson.length);
  console.log('Course JSON String:', courseJson);
  console.log('=== END DEBUG ===');

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
    console.log("uploadCourseVideo:   ", courseId, videoFile, videoName);
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
          console.warn('Authentication error when checking enrollment status:', error);
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
      console.warn('No authentication token found, using mock data for enrolled courses');
      return this.mockDataService.getMockEnrolledCourses();
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<any>(`${this.apiUrl}/enrolled`, { headers })
      .pipe(
        map((response: any[]) => {
          // Transform Course objects from API into CourseProgress objects
          const now = new Date();
          return response.map(item => {
            // Check if item is already a CourseProgress object
            if (item.courseId && item.enrolledAt) {
              return item as CourseProgress;
            }
            
            // Transform Course object to CourseProgress object
            return {
              courseId: item.id,
              course: item as Course, // Include the full course object
              enrolledAt: now,
              startedAt: now,
              lastAccessedAt: now,
              completedAt: undefined,
              completed: false,
              completionPercentage: 0,
              certificateUrl: undefined,
              completedSessionIds: [],
              currentSessionId: undefined,
              sessionTimeSpent: {}, // Initialize empty session time tracking
              totalSessions: item.sessionIds ? item.sessionIds.length : 0,
              totalTimeSpent: 0,
              accessCount: 1
            } as CourseProgress;
          });
        }),
        catchError((error) => {
          console.warn('API call failed for enrolled courses, falling back to mock data:', error);
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