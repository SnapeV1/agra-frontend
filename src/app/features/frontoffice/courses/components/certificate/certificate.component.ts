import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CertificateService, CertificateData } from 'src/app/core/services/certificate.service';

@Component({
  selector: 'app-certificate',
  templateUrl: './certificate.component.html',
  styleUrls: ['./certificate.component.css']
})
export class CertificateComponent implements OnInit, OnDestroy {
  certificateData: CertificateData | null = null;
  loading = true;
  error: string | null = null;
  private courseId = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private certificateService: CertificateService
  ) {}

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.courseId) {
      this.error = 'Course ID not found.';
      this.loading = false;
      return;
    }

    this.loadCertificateData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCertificateData(): void {
    this.loading = true;
    this.certificateService.getCertificateByCourse(this.courseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (certificate) => {
          console.log('Certificate payload from API:', certificate);
          this.certificateData = certificate;
          console.log('Certificate data applied to template:', this.certificateData);
          this.loading = false;
        },
        error: () => {
          this.error = 'Certificate not available. Please ensure the course is completed.';
          this.loading = false;
        }
      });
  }

  formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  downloadCertificate(): void {
    if (!this.certificateData) return;
    window.print();
  }

  shareCertificate(): void {
    if (!this.certificateData) return;

    const shareText = `I've successfully completed "${this.certificateData.courseTitle}" and earned my certificate!`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      navigator.share({
        title: 'Course Completion Certificate',
        text: shareText,
        url: shareUrl
      }).catch(() => {});
    } else {
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




