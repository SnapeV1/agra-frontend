import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AuthService } from './auth/auth.service';
import { Course } from '../models/course';
import { environment } from 'src/environments/environment';

export interface CertificateData {
  id: string;
  studentName: string;
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
    return this.http.post<any>(`${this.apiUrl}/generate`, request, { headers }).pipe(
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
    return this.http.get<any>(`${this.apiUrl}/course/${courseId}`, { headers }).pipe(
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
  verifyCertificate(certificateId: string): Observable<CertificateVerificationResult> {
    // This endpoint doesn't require authentication for public verification
    return this.http.get<any>(`${this.apiUrl}/verify/${certificateId}`).pipe(
      map(response => ({
        isValid: response.isValid,
        certificateData: response.isValid ? this.mapResponseToCertificateData(response.certificate) : undefined,
        errorMessage: response.errorMessage
      }))
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

  // Get certificate statistics (admin only)
  getCertificateStatistics(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/statistics`, { headers });
  }

  // Helper method to map backend response to CertificateData
  private mapResponseToCertificateData(response: any): CertificateData {
    return {
      id: response.id,
      studentName: response.studentName,
      studentId: response.studentId,
      courseId: response.courseId,
      courseTitle: response.courseTitle,
      courseDomain: response.courseDomain,
      courseCountry: response.courseCountry,
      completionDate: new Date(response.completionDate),
      totalTimeSpent: response.totalTimeSpent,
      totalLessons: response.totalLessons,
      completionPercentage: response.completionPercentage,
      certificateId: response.certificateId,
      instructorName: response.instructorName || 'Dr. Agricultural Expert',
      organizationName: response.organizationName || 'AGRA Learning Platform',
      issueDate: new Date(response.issueDate),
      isValid: response.isValid !== false, // Default to true if not specified
      verificationUrl: response.verificationUrl || `${window.location.origin}/verify/${response.certificateId}`
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

  // Create certificate data from course and progress information
  createCertificateData(
    course: Course,
    progressData: any,
    user: any
  ): CertificateData {
    const certificateId = this.generateCertificateId();
    
    return {
      id: '', // Will be set by backend
      studentName: user?.name || 'Student Name',
      studentId: user?.id || '',
      courseId: course.id || 'unknown-course',
      courseTitle: course.title,
      courseDomain: course.domain,
      courseCountry: course.country,
      completionDate: progressData.completedAt || new Date(),
      totalTimeSpent: progressData.totalTimeSpent || 0,
      totalLessons: progressData.totalLessons || 0,
      completionPercentage: progressData.completionPercentage || 100,
      certificateId: certificateId,
      instructorName:  'UMNAGRI Educational Team',
      organizationName: 'AGRA Learning Platform',
      issueDate: new Date(),
      isValid: true,
      verificationUrl: `${window.location.origin}/verify/${certificateId}`
    };
  }

  // Clear certificates cache
  clearCertificatesCache(): void {
    this.certificatesSubject.next([]);
  }
}
