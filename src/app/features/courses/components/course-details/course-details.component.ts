import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Course } from 'src/app/core/models/course';
import { CourseService } from 'src/app/core/services/course/course.service';

@Component({
  selector: 'app-course-details',
  templateUrl: './course-details.component.html',
  styleUrls: ['./course-details.component.css']
})
export class CourseDetailsComponent implements OnInit {
  course: Course | null = null;
  loading = true;
  error = '';
  courseId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.courseId = params['id'];
      this.loadCourse();
    });
  }

  loadCourse(): void {
    this.loading = true;
    this.error = '';

    this.courseService.getCourseById(this.courseId).subscribe({
      next: (course) => {
        this.course = course;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading course:', err);
        this.error = 'Failed to load course details. Please try again.';
        this.loading = false;
      }
    });
  }

  enrollInCourse(): void {
    if (!this.course) return;
    
    // Implement enrollment logic here
    console.log('Enrolling in course:', this.course);
    
    // You might want to call an enrollment service
    // this.enrollmentService.enrollInCourse(this.course.id).subscribe(...)
    
    // For now, just show an alert
    alert(`Successfully enrolled in "${this.course.title}"!`);
  }

  goBack(): void {
    this.router.navigate(['/courses']);
  }

  getCourseRating(): number | null {
    const r = 4.5;
    return typeof r === 'number' ? r : null;
  }

  generateStarArray(rating: number): boolean[] {
    const full = Math.floor(rating);
    return Array.from({ length: 5 }, (_, i) => i < full);
  }
}