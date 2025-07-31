// src/app/features/courses/components/courses/courses.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CourseService } from '../../../../services/course/course.service';
import { Course } from '../../models/course';

@Component({
  selector: 'app-courses',
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.css']
})
export class CoursesComponent implements OnInit {
  courses: Course[] = [];
  filteredCourses: Course[] = [];
  searchTerm: string = '';
  selectedDomain: string = '';
  selectedCountry: string = '';
  loading: boolean = true;
  error: string = '';

  domains: string[] = [];
  countries: string[] = [];

  constructor(
    private courseService: CourseService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.loading = true;
    this.courseService.getAllCourses().subscribe({
      next: (courses) => {
        this.courses = courses;
        this.filteredCourses = courses;
        this.extractFilters();
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load courses. Please try again.';
        this.loading = false;
        console.error('Error loading courses:', error);
      }
    });
  }

  private extractFilters(): void {
    this.domains = [...new Set(this.courses.map(course => course.domain))];
    this.countries = [...new Set(this.courses.map(course => course.country))];
  }

  onSearch(): void {
    this.applyFilters();
  }

  onDomainChange(): void {
    this.applyFilters();
  }

  onCountryChange(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredCourses = this.courses.filter(course => {
      const matchesSearch = !this.searchTerm || 
        course.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesDomain = !this.selectedDomain || course.domain === this.selectedDomain;
      const matchesCountry = !this.selectedCountry || course.country === this.selectedCountry;

      return matchesSearch && matchesDomain && matchesCountry;
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedDomain = '';
    this.selectedCountry = '';
    this.filteredCourses = this.courses;
  }

  onCourseSelect(course: Course): void {
    // Navigate to course details page
    console.log('Selected course:', course);
    // You can add router navigation here to course details
    this.router.navigate(['/course-details', course.id]);
  }

  enrollInCourse(course: Course, event: Event): void {
    event.stopPropagation(); // Prevent card click
    console.log('Enrolling in course:', course);
    // Add enrollment logic here
    // this.router.navigate(['/enroll', course.id]);
  }
}