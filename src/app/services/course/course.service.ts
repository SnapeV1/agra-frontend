// src/app/services/course/course.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Course } from 'src/app/features/courses/models/course';

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
}