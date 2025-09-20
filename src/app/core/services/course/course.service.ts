import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Course } from 'src/app/core/models/course';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private apiUrl = 'http://localhost:8080/api/courses'; 

  constructor(private http: HttpClient, private authService: AuthService) { }

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
  const formData = new FormData();
  console.log('Files:', { image, video, attachments });
  
  formData.append('course', new Blob([JSON.stringify(course)], {
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
  const formData = new FormData();
  
 formData.append('course', new Blob([JSON.stringify(course)], { type: 'application/json' }));

  
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
    
    if (!token) {
      throw new Error('Authentication required to check enrollment status');
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<any>(`${this.apiUrl}/${courseId}/enrollment-status`, { headers });
  }

  getUserEnrolledCourses(): Observable<any> {
    const token = this.authService.getToken();
    
    if (!token) {
      throw new Error('Authentication required to fetch enrolled courses');
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<any>(`${this.apiUrl}/enrolled`, { headers });
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