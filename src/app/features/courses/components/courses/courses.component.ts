import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CourseService } from '../../../../core/services/course/course.service';
import { Course } from '../../../../core/models/course';

type CountItem = { value: string; count: number };

@Component({
  selector: 'app-courses',
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.css']
})
export class CoursesComponent implements OnInit {
  courses: Course[] = [];
  filteredCourses: Course[] = [];

  searchTerm = '';
  selectedLanguage = '';
  selectedCountry = '';

  languageListWithCounts: CountItem[] = [];
  countryListWithCounts: CountItem[] = [];

  loading = true;
  error = '';

  skeletonArray = Array(8).fill(0);

  constructor(private courseService: CourseService, private router: Router) {}

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.loading = true;
    this.error = '';

    this.courseService.getAllCourses().subscribe({
      next: (courses) => {
        this.courses = courses;
        this.filteredCourses = [...courses];
        this.buildLanguageList();
        this.buildCountryList();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading courses:', error);
        this.error = 'Failed to load courses. Please try again later.';
        this.loading = false;
      }
    });
  }

  private buildLanguageList(): void {
    const languageCounts = new Map<string, number>();
    this.courses.forEach(course => {
      if (course.languagesAvailable && course.languagesAvailable.length > 0) {
        course.languagesAvailable.forEach(language => {
          languageCounts.set(language, (languageCounts.get(language) || 0) + 1);
        });
      }
    });

    this.languageListWithCounts = Array.from(languageCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }

  private buildCountryList(): void {
    const countryMap = new Map<string, number>();

    for (const c of this.courses) {
      countryMap.set(c.country, (countryMap.get(c.country) ?? 0) + 1);
    }

    this.countryListWithCounts = Array.from(countryMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, count }));
  }

  onSearch(): void { this.applyFilters(); }

  onLanguageChange(event: any): void {
    this.selectedLanguage = event.target.value;
    this.applyFilters();
  }

  onCountryChange(event: any): void {
    this.selectedCountry = event.target.value;
    this.applyFilters();
  }

  private applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredCourses = this.courses.filter(course => {
      const matchesSearch =
        !term ||
        course.title.toLowerCase().includes(term) ||
        (course.description ?? '').toLowerCase().includes(term);

      const matchesLanguage = !this.selectedLanguage || 
        (course.languagesAvailable && course.languagesAvailable.includes(this.selectedLanguage));
      const matchesCountry = !this.selectedCountry || course.country === this.selectedCountry;

      return matchesSearch && matchesLanguage && matchesCountry;
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedLanguage = '';
    this.selectedCountry = '';
    this.filteredCourses = [...this.courses];
  }
onCourseSelect(course: Course): void {
  console.log('Navigating to course:', course.id); 
  this.router.navigate(['/courses/course-details', course.id]);
}

  enrollInCourse(course: Course, event: Event): void {
    event.stopPropagation();
    console.log('Enrolling in course:', course);
  }

  getCourseRating(course: any): number | null {
    const r = course?.rating;
    return typeof r === 'number' ? r : null;
  }

  generateStarArray(rating: number): boolean[] {
    const full = Math.floor(rating);
    return Array.from({ length: 5 }, (_, i) => i < full);
  }

  formatNumber(num: number): string {
    if (typeof num !== 'number') return '';
    return num.toLocaleString();
  }
}
