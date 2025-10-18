import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CourseService } from '../../../../core/services/course/course.service';
import { Course } from '../../../../core/models/course';

type CountItem = { value: string; count: number };

@Component({
  selector: 'app-courses',
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoursesComponent implements OnInit {
  courses: Course[] = [];
  filteredCourses: Course[] = [];

  searchTerm = '';
  selectedLanguage = '';
  selectedCountry = '';
  selectedLevel = '';

  languageListWithCounts: CountItem[] = [];
  countryListWithCounts: CountItem[] = [];
  levelOptions = [
    { value: '', label: 'All Levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];

  loading = true;
  error = '';

  // Pagination properties
  currentPage = 1;
  itemsPerPage = 8;
  totalPages = 1;

  skeletonArray = Array(8).fill(0);

  constructor(private courseService: CourseService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Restore filters from query params
    const qp = this.route.snapshot.queryParamMap;
    this.searchTerm = qp.get('q') || '';
    this.selectedLanguage = qp.get('lang') || '';
    this.selectedCountry = qp.get('country') || '';
    this.selectedLevel = qp.get('level') || '';
    const page = Number(qp.get('page'));
    this.currentPage = Number.isFinite(page) && page > 0 ? page : 1;
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

  onLevelChange(event: any): void {
    this.selectedLevel = event.target.value;
    this.applyFilters();
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredCourses = this.courses.filter(course => {
      const matchesSearch =
        !term ||
        course.title.toLowerCase().includes(term) ||
        (course.description ?? '').toLowerCase().includes(term);

      const matchesLanguage = !this.selectedLanguage || 
        (course.languagesAvailable && course.languagesAvailable.includes(this.selectedLanguage));
      const matchesCountry = !this.selectedCountry || course.country === this.selectedCountry;
      
      // Simple level matching based on course title/description keywords
      const matchesLevel = !this.selectedLevel || this.getCourseLevel(course) === this.selectedLevel;

      return matchesSearch && matchesLanguage && matchesCountry && matchesLevel;
    });
    
    this.updatePaginatedCourses();
    this.updateQueryParams();
  }

  private getCourseLevel(course: Course): string {
    const title = course.title.toLowerCase();
    const description = (course.description ?? '').toLowerCase();
    const content = title + ' ' + description;
    
    if (content.includes('beginner') || content.includes('intro') || content.includes('basic') || content.includes('fundamentals')) {
      return 'beginner';
    } else if (content.includes('advanced') || content.includes('expert') || content.includes('master') || content.includes('professional')) {
      return 'advanced';
    } else {
      return 'intermediate';
    }
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedLanguage = '';
    this.selectedCountry = '';
    this.selectedLevel = '';
    this.applyFilters();
  }
onCourseSelect(course: Course): void {
  this.router.navigate(['/courses/course-details', course.id]);
}

  enrollInCourse(course: Course, event: Event): void {
    event.stopPropagation();
    
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

  // Pagination methods
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedCourses();
      this.updateQueryParams();
    }
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, this.currentPage - 2);
      const end = Math.min(this.totalPages, start + maxVisiblePages - 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  getStartIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  getTotalCourses(): number {
    return this.filteredCourses.length;
  }

  getPaginatedCourses(): Course[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredCourses.slice(startIndex, endIndex);
  }

  private updatePaginatedCourses(): void {
    this.totalPages = Math.ceil(this.filteredCourses.length / this.itemsPerPage);
    
    // Reset to page 1 if current page is beyond total pages
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  private updateQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.searchTerm || undefined,
        lang: this.selectedLanguage || undefined,
        country: this.selectedCountry || undefined,
        level: this.selectedLevel || undefined,
        page: this.currentPage !== 1 ? this.currentPage : undefined
      },
      queryParamsHandling: 'merge'
    });
  }

  trackByCourseId(index: number, course: Course) { return course.id || index; }
}
