import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CertificateData, CertificateService } from 'src/app/core/services/certificate.service';

type CertificateStatusFilter = 'all' | 'valid' | 'revoked';

@Component({
  selector: 'app-certificates-management',
  templateUrl: './certificates-management.component.html',
  styleUrls: ['./certificates-management.component.css']
})
export class CertificatesManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  certificates: CertificateData[] = [];
  filteredCertificates: CertificateData[] = [];
  selectedCertificate: CertificateData | null = null;

  loading = true;
  error = '';
  saving = false;
  revoking = false;

  searchTerm = '';
  statusFilter: CertificateStatusFilter = 'all';
  sortOption = 'latest';
  revokeReason = '';
  skeletonRows = Array.from({ length: 6 });

  editForm = {
    instructorName: '',
    organizationName: '',
    issueDate: '',
    notes: ''
  };

  constructor(private certificateService: CertificateService) {}

  ngOnInit(): void {
    this.fetchCertificates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalCertificates(): number {
    return this.certificates.length;
  }

  get activeCertificates(): number {
    return this.certificates.filter(cert => cert.isValid).length;
  }

  get revokedCertificates(): number {
    return this.certificates.filter(cert => !cert.isValid).length;
  }

  fetchCertificates(): void {
    this.loading = true;
    this.error = '';

    this.certificateService.getIssuedCertificates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (certificates) => {
          console.log('Admin certificates payload:', certificates);
          this.certificates = certificates;
          this.applyFilters();
          this.syncSelection();
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load certificates', err);
          this.error = 'Unable to load certificates right now.';
          this.loading = false;
        }
      });
  }

  applyFilters(): void {
    let list = [...this.certificates];
    const term = this.searchTerm.trim().toLowerCase();

    if (term) {
      list = list.filter(cert =>
        (cert.studentName || '').toLowerCase().includes(term) ||
        (cert.studentId || '').toLowerCase().includes(term) ||
        (cert.courseTitle || '').toLowerCase().includes(term) ||
        (cert.certificateId || '').toLowerCase().includes(term)
      );
    }

    if (this.statusFilter !== 'all') {
      const desiredState = this.statusFilter === 'valid';
      list = list.filter(cert => !!cert.isValid === desiredState);
    }

    switch (this.sortOption) {
      case 'name':
        list.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
        break;
      case 'course':
        list.sort((a, b) => (a.courseTitle || '').localeCompare(b.courseTitle || ''));
        break;
      case 'oldest':
        list.sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime());
        break;
      default:
        list.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    }

    this.filteredCertificates = list;
  }

  setStatusFilter(filter: CertificateStatusFilter): void {
    this.statusFilter = filter;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  selectCertificate(certificate: CertificateData): void {
    this.selectedCertificate = certificate;
    this.editForm = {
      instructorName: certificate.instructorName || '',
      organizationName: certificate.organizationName || '',
      issueDate: certificate.issueDate ? new Date(certificate.issueDate).toISOString().substring(0, 10) : '',
      notes: certificate.notes || ''
    };
    this.revokeReason = '';
  }

  clearSelection(): void {
    this.selectedCertificate = null;
    this.revokeReason = '';
  }

  saveCertificateEdits(): void {
    if (!this.selectedCertificate) {
      return;
    }
    const payload = {
      instructorName: this.editForm.instructorName,
      organizationName: this.editForm.organizationName,
      issueDate: this.editForm.issueDate ? new Date(this.editForm.issueDate) : undefined,
      notes: this.editForm.notes
    };

    console.log('Updating certificate metadata', payload);
    this.saving = true;

    this.certificateService.updateCertificateMetadata(this.selectedCertificate.certificateId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          console.log('Certificate updated', updated);
          this.saving = false;
          this.patchCertificate(updated);
        },
        error: (err) => {
          console.error('Failed to update certificate', err);
          this.saving = false;
        }
      });
  }

  revokeSelectedCertificate(): void {
    if (!this.selectedCertificate || !this.revokeReason.trim()) {
      return;
    }

    const reason = this.revokeReason.trim();
    console.log('Revoking certificate', this.selectedCertificate.certificateId, reason);
    this.revoking = true;

    this.certificateService.revokeCertificate(this.selectedCertificate.certificateId, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.revoking = false;
          const updated: CertificateData = { ...this.selectedCertificate!, isValid: false };
          this.patchCertificate(updated);
          this.revokeReason = '';
        },
        error: (err) => {
          console.error('Failed to revoke certificate', err);
          this.revoking = false;
        }
      });
  }

  formatDuration(totalMinutes?: number): string {
    if (!totalMinutes && totalMinutes !== 0) {
      return '—';
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) {
      return `${minutes}m`;
    }
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  }

  statusBadge(cert: CertificateData): string {
    return cert.isValid ? 'status-pill active' : 'status-pill revoked';
  }

  trackByCertificate(_: number, cert: CertificateData): string {
    return cert.certificateId || cert.id;
  }

  private syncSelection(): void {
    if (!this.selectedCertificate) {
      return;
    }
    const refreshed = this.certificates.find(cert => cert.certificateId === this.selectedCertificate?.certificateId);
    if (refreshed) {
      this.selectCertificate(refreshed);
    }
  }

  private patchCertificate(updated: CertificateData): void {
    this.certificates = this.certificates.map(cert =>
      cert.certificateId === updated.certificateId ? updated : cert
    );
    if (this.selectedCertificate?.certificateId === updated.certificateId) {
      this.selectCertificate(updated);
    }
    this.applyFilters();
  }
}
