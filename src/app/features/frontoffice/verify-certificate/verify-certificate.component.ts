import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import {
  CertificateData,
  CertificateService,
  CertificateVerificationResult
} from 'src/app/core/services/certificate.service';

@Component({
  selector: 'app-verify-certificate',
  templateUrl: './verify-certificate.component.html',
  styleUrls: ['./verify-certificate.component.css']
})
export class VerifyCertificateComponent implements OnInit {
  codeInput = '';
  status: 'idle' | 'loading' | 'success' | 'error' | 'revoked' = 'idle';
  isChecking = false;
  errorMessage = '';
  lastCheckedAt: Date | null = null;

  verificationResult: CertificateVerificationResult | null = null;
  certificateData: CertificateData | null = null;

  constructor(
    private certificateService: CertificateService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const initialCode =
      this.route.snapshot.paramMap.get('code') ||
      this.route.snapshot.queryParamMap.get('code') ||
      this.route.snapshot.queryParamMap.get('id') ||
      '';

    if (initialCode) {
      this.codeInput = initialCode;
      this.verifyCertificate();
    }
  }

  verifyCertificate(): void {
    const normalizedCode = this.normalizeCode(this.codeInput);
    if (!normalizedCode) {
      this.status = 'error';
      this.errorMessage = 'Enter a certificate ID or verification code to continue.';
      return;
    }

    this.status = 'loading';
    this.isChecking = true;
    this.errorMessage = '';
    this.certificateData = null;
    this.verificationResult = null;

    this.certificateService
      .verifyCertificate(normalizedCode)
      .pipe(
        finalize(() => {
          this.isChecking = false;
          this.lastCheckedAt = new Date();
        })
      )
      .subscribe({
        next: (result) => {
          this.verificationResult = result;
          if (result.isValid && result.certificateData) {
            this.certificateData = result.certificateData;
            this.status = 'success';
            this.pushCodeToUrl(normalizedCode);
          } else if (result.revoked) {
            this.status = 'revoked';
            this.errorMessage = result.revokedReason || result.errorMessage || 'This certificate has been revoked.';
          } else {
            this.status = 'error';
            this.errorMessage = result.errorMessage || 'Certificate not found or invalid.';
          }
        },
        error: (err) => {
          const statusCode = err?.status;
          const payload = err?.error || {};
          if (statusCode === 410) {
            this.status = 'revoked';
            this.errorMessage = payload.revokedReason || payload.message || 'This certificate has been revoked.';
          } else if (statusCode === 404) {
            this.status = 'error';
            this.errorMessage = 'Certificate not found. Please check the ID or link.';
          } else {
            this.status = 'error';
            this.errorMessage = 'Unable to verify right now. Please try again in a moment.';
          }
        }
      });
  }

  useExample(code: string): void {
    this.codeInput = code;
    this.verifyCertificate();
  }

  clearState(): void {
    this.codeInput = '';
    this.status = 'idle';
    this.errorMessage = '';
    this.certificateData = null;
    this.verificationResult = null;
    this.router.navigate(['/verifyCertificate']);
  }

  formatDate(date?: Date | string | null): string {
    if (!date) {
      return 'Not available';
    }
    const parsed = typeof date === 'string' ? new Date(date) : date;
    return this.certificateService.formatDate(parsed);
  }

  formatTime(minutes?: number | null): string {
    if (!minutes && minutes !== 0) {
      return '-';
    }
    return this.certificateService.formatTime(minutes);
  }

  private normalizeCode(value: string): string {
    if (!value) {
      return '';
    }

    const trimmed = value.trim();
    const urlMatch = trimmed.match(/verifyCertificate\/([^\s\/?#]+)/i);
    if (urlMatch?.[1]) {
      return urlMatch[1];
    }

    const parts = trimmed.split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : trimmed;
  }

  private pushCodeToUrl(code: string): void {
    // Update the URL so the state can be refreshed or shared without reloading
    this.router.navigate(['/verifyCertificate', code], {
      replaceUrl: true
    });
  }
}
