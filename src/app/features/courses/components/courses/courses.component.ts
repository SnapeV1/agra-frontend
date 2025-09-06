import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CourseService } from '../../../../services/course/course.service';
import { Course } from '../../models/course';

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
  selectedDomain = '';
  selectedCountry = '';

  // counts for chips
  domainListWithCounts: CountItem[] = [];
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
        this.courses = courses ?? [];
        this.filteredCourses = [...this.courses];
        this.computeCounts();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Failed to load courses. Please try again.';
        this.loading = false;
      }
    });
  }

  private computeCounts(): void {
    const domainMap = new Map<string, number>();
    const countryMap = new Map<string, number>();

    for (const c of this.courses) {
      domainMap.set(c.domain, (domainMap.get(c.domain) ?? 0) + 1);
      countryMap.set(c.country, (countryMap.get(c.country) ?? 0) + 1);
    }

    this.domainListWithCounts = Array.from(domainMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, count }));

    this.countryListWithCounts = Array.from(countryMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, count }));
  }

  // Search / Filters
  onSearch(): void { this.applyFilters(); }

  selectDomain(value: string): void {
    this.selectedDomain = value;
    this.applyFilters();
  }

  selectCountry(value: string): void {
    this.selectedCountry = value;
    this.applyFilters();
  }

  private applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredCourses = this.courses.filter(course => {
      const matchesSearch =
        !term ||
        course.title.toLowerCase().includes(term) ||
        (course.description ?? '').toLowerCase().includes(term);

      const matchesDomain = !this.selectedDomain || course.domain === this.selectedDomain;
      const matchesCountry = !this.selectedCountry || course.country === this.selectedCountry;

      return matchesSearch && matchesDomain && matchesCountry;
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedDomain = '';
    this.selectedCountry = '';
    this.filteredCourses = [...this.courses];
  }

  onCourseSelect(course: Course): void {
    this.router.navigate(['/course-details', course.id]);
  }

  enrollInCourse(course: Course, event: Event): void {
    event.stopPropagation();
    console.log('Enrolling in course:', course);
  }

  // UI helpers (rating/students/duration are optional fields on backend)
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
