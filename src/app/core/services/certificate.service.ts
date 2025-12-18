import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { AuthService } from './auth/auth.service';
import { environment } from 'src/environments/environment';

export interface CertificateData {
  id: string;
  studentName: string;
  studentEmail?: string;
  studentBirthdate?: string;
  studentId: string;
  courseId: string;
  courseTitle: string;
  courseDomain: string;
  courseCountry: string;
  completionDate: Date;
  totalTimeSpent: number;
  totalLessons: number;
  completionPercentage: number;
  certificateId: string;
  instructorName: string;
  organizationName: string;
  issueDate: Date;
  isValid: boolean;
  verificationUrl: string;
  verificationCode?: string;
  notes?: string;
  lastVerifiedAt?: Date | null;
}

export interface CertificateGenerationRequest {
  courseId: string;
  studentId: string;
  completionData: {
    completionDate: Date;
    totalTimeSpent: number;
    totalLessons: number;
    completionPercentage: number;
  };
}

export interface CertificateVerificationResult {
  isValid: boolean;
  certificateData?: CertificateData;
  errorMessage?: string;
  revoked?: boolean;
  revokedReason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CertificateService {
  private apiUrl = `${environment.apiBaseUrl}/certificates`;
  private certificatesSubject = new BehaviorSubject<CertificateData[]>([]);
  public certificates$ = this.certificatesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Helper method to create authenticated headers
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Generate a new certificate
  generateCertificate(request: CertificateGenerationRequest): Observable<CertificateData> {
    const headers = this.getAuthHeaders();
    const url = `${this.apiUrl}/generate/${encodeURIComponent(request.courseId)}`;
    return this.http.post<any>(url, request, { headers }).pipe(
      map(response => this.mapResponseToCertificateData(response)),
      tap(certificate => {
        // Update local certificates list
        const currentCertificates = this.certificatesSubject.value;
        this.certificatesSubject.next([...currentCertificates, certificate]);
      })
    );
  }

  // Generate certificate with individual parameters (legacy method)
  generateCertificateWithParams(courseId: string, studentId: string, completionDate: Date, totalTimeSpent: number, totalLessons: number, completionPercentage: number): Observable<CertificateData> {
    const request: CertificateGenerationRequest = {
      courseId,
      studentId,
      completionData: {
        completionDate,
        totalTimeSpent,
        totalLessons,
        completionPercentage
      }
    };
    return this.generateCertificate(request);
  }

  // Get certificate by ID
  getCertificate(certificateId: string): Observable<CertificateData> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/${certificateId}`, { headers }).pipe(
      map(response => this.mapResponseToCertificateData(response))
    );
  }

  // Get certificate by course ID
  getCertificateByCourse(courseId: string): Observable<CertificateData> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/user/course/${courseId}`, { headers }).pipe(
      map(response => this.mapResponseToCertificateData(response))
    );
  }

  // Get all certificates for current user
  getUserCertificates(): Observable<CertificateData[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any[]>(`${this.apiUrl}/user`, { headers }).pipe(
      map(response => response.map(cert => this.mapResponseToCertificateData(cert))),
      tap(certificates => this.certificatesSubject.next(certificates))
    );
  }

  // Verify certificate authenticity
  verifyCertificate(codeOrId: string): Observable<CertificateVerificationResult> {
    // Public validation endpoint (falls back to legacy route if needed)
    return this.http.get<any>(`${this.apiUrl}/validate/${codeOrId}`).pipe(
      map(response => this.mapVerificationResponse(response)),
      catchError(() =>
        this.http.get<any>(`${this.apiUrl}/verify/${codeOrId}`).pipe(
          map(response => this.mapVerificationResponse(response))
        )
      )
    );
  }

  // Download certificate as PDF
  downloadCertificatePDF(certificateId: string): Observable<Blob> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/${certificateId}/download`, {
      responseType: 'blob',
      headers
    });
  }

  // Generate certificate preview (without saving)
  generateCertificatePreview(courseId: string): Observable<CertificateData> {
    const headers = this.getAuthHeaders();
    return this.http.post<any>(`${this.apiUrl}/preview`, { courseId }, { headers }).pipe(
      map(response => this.mapResponseToCertificateData(response))
    );
  }

  // Check if certificate exists for course
  checkCertificateExists(courseId: string): Observable<boolean> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/exists/${courseId}`, { headers }).pipe(
      map(response => response.exists)
    );
  }

  // Revoke certificate (admin only)
  revokeCertificate(certificateId: string, reason: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/${certificateId}/revoke`, { reason }, { headers });
  }

  // Admin: list issued certificates
  getIssuedCertificates(): Observable<CertificateData[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any[]>(`${this.apiUrl}/admin/issued`, { headers }).pipe(
      map(response => (response || []).map(cert => this.mapResponseToCertificateData(cert)))
    );
  }

  // Admin: update metadata
  updateCertificateMetadata(certificateId: string, payload: Partial<{ instructorName: string; organizationName: string; issueDate: string | Date; notes?: string }>): Observable<CertificateData> {
    const headers = this.getAuthHeaders();
    return this.http.put<any>(`${this.apiUrl}/${certificateId}`, payload, { headers }).pipe(
      map(response => this.mapResponseToCertificateData(response))
    );
  }

  // Get certificate statistics (admin only)
  getCertificateStatistics(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/statistics`, { headers });
  }

  // Helper method to map backend response to CertificateData
  private mapResponseToCertificateData(response: any): CertificateData {
    const certificateId = response.certificateId || response.verificationCode || response.certificateCode || response.id;
    return {
      id: response.id,
      studentName: response.studentName,
      studentEmail: response.studentEmail || response.email || response.userEmail,
      studentBirthdate: response.studentBirthdate || response.birthdate,
      studentId: response.studentId,
      courseId: response.courseId,
      courseTitle: response.courseTitle,
      courseDomain: response.courseDomain,
      courseCountry: response.courseCountry,
      completionDate: new Date(response.completionDate),
      totalTimeSpent: response.totalTimeSpent,
      totalLessons: response.totalLessons,
      completionPercentage: response.completionPercentage,
      certificateId,
      instructorName: response.instructorName || 'Dr. Agricultural Expert',
      organizationName: response.organizationName || 'YEFFA Learning Platform',
      issueDate: response.issueDate ? new Date(response.issueDate) : new Date(),
      isValid: response.isValid !== false, // Default to true if not specified
      verificationUrl: `${window.location.origin}/verifyCertificate/${certificateId}`,
      verificationCode: certificateId,
      notes: response.notes,
      lastVerifiedAt: response.lastVerifiedAt ? new Date(response.lastVerifiedAt) : null
    };
  }
  private mapVerificationResponse(response: any): CertificateVerificationResult {
    if (!response) {
      return { isValid: false, errorMessage: 'Certificate not found' };
    }
    const certificatePayload = response.certificate || response.data || response;
    const validFlag = response.valid;
    const isValidFlag = response.isValid;
    const isValid = (validFlag !== undefined ? validFlag : isValidFlag) !== false && !!certificatePayload;
    const revoked = isValid === false && (response.revoked === true || response.status === 'revoked' || response.revokedReason);
    const revokedReason = response.revokedReason || response.reason || response.message;
    return {
      isValid,
      revoked,
      revokedReason: revoked ? revokedReason : undefined,
      certificateData: isValid ? this.mapResponseToCertificateData(certificatePayload) : undefined,
      errorMessage: isValid
        ? undefined
        : revoked
          ? revokedReason || 'This certificate has been revoked.'
          : (response.errorMessage || response.message || 'Invalid certificate code')
    };
  }

  // Generate unique certificate ID
  generateCertificateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `CERT-${timestamp}-${random}`.toUpperCase();
  }

  // Format time for display
  formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  // Format date for display
  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Clear certificates cache
  clearCertificatesCache(): void {
    this.certificatesSubject.next([]);
  }
}
