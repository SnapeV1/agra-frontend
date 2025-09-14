import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Course } from 'src/app/core/models/course';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private apiUrl = 'http://localhost:8080/api/courses'; 

  constructor(private http: HttpClient) { }

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
  
  return this.http.put<Course>(`${this.apiUrl}/updateCourse/${id}`, formData);
}


  archiveCourse(id: string|null): Observable<any> {
    return this.http.put(`${this.apiUrl}/ArchiveCourse/${id}`, {});
  }

  deleteCourse(id: string|null): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}