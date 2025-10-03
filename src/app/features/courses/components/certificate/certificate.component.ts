import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { Course } from '../../../../core/models/course';
import { CourseService } from '../../../../core/services/course/course.service';
import { ProgressService, CourseEnrollment } from '../../../../core/services/progress.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { CertificateData } from '../../../../core/services/certificate.service';

@Component({
  selector: 'app-certificate',
  templateUrl: './certificate.component.html',
  styleUrls: ['./certificate.component.css']
})
export class CertificateComponent implements OnInit, OnDestroy {
  certificateData: CertificateData | null = null;
  course: Course | null = null;
  courseEnrollment: CourseEnrollment | null = null;
  loading = true;
  error: string | null = null;
  courseId = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private progressService: ProgressService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('id') || '';
    if (this.courseId) {
      this.loadCertificateData();
    } else {
      this.error = 'Course ID not found';
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCertificateData(): void {
    forkJoin({
      course: this.courseService.getCourseById(this.courseId),
      enrollment: this.progressService.getCourseProgress(this.courseId)
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ course, enrollment }) => {
        this.course = course;
        this.courseEnrollment = enrollment;

        if (!this.course || !this.courseEnrollment) {
          this.error = 'Certificate data not found';
          this.loading = false;
          return;
        }

        if (!this.courseEnrollment.progress.completed) {
          this.error = 'Course not completed yet';
          this.loading = false;
          return;
        }

        this.generateCertificateData();
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load certificate data';
        this.loading = false;
      }
    });
  }

  private generateCertificateData(): void {
    if (!this.course || !this.courseEnrollment) return;

    const authUser = this.authService.currentUserValue;
    const user = authUser?.user;
    const completedLessons = this.courseEnrollment.lessons.filter(l => l.completed).length;
    const certificateId = this.generateCertificateId();
    
    // Ensure we have required IDs
    const courseId = this.course.id || 'unknown-course';
    const studentId = user?.id || 'unknown-student';
    const studentName = user?.name || 'Student';
    
    this.certificateData = {
      id: certificateId,
      studentName: studentName,
      studentId: studentId,
      courseId: courseId,
      courseTitle: this.course.title,
      courseDomain: this.course.domain,
      courseCountry: this.course.country,
      completionDate: this.courseEnrollment.progress.completedAt || new Date(),
      totalTimeSpent: this.courseEnrollment.progress.totalTimeSpent,
      totalLessons: completedLessons,
      completionPercentage: this.courseEnrollment.progress.completionPercentage,
      certificateId: certificateId,
      instructorName: 'Yeffa Team', // Since instructor is not in Course model
      organizationName: 'AGRA Learning Platform',
      issueDate: this.courseEnrollment.progress.completedAt || new Date(),
      isValid: true,
      verificationUrl: `${window.location.origin}/certificate/verify/${certificateId}`
    };
  }

  private generateCertificateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `CERT-${timestamp}-${random}`.toUpperCase();
  }

  formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  downloadCertificate(): void {
    if (!this.certificateData) return;
    
    // Create a printable version
    window.print();
  }

  shareCertificate(): void {
    if (!this.certificateData) return;

    const shareText = `I've successfully completed "${this.certificateData.courseTitle}" and earned my certificate! 🎓`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      navigator.share({
        title: 'Course Completion Certificate',
        text: shareText,
        url: shareUrl
      }).catch(() => {});
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`).then(() => {
        alert('Certificate link copied to clipboard!');
      }).catch(() => {
        alert('Unable to share. Please copy the URL manually.');
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/user/profile']);
  }

  goToCourses(): void {
    this.router.navigate(['/courses']);
  }
}