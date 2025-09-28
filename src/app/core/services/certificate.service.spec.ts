import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CertificateService, CertificateData, CertificateGenerationRequest } from './certificate.service';
import { AuthService } from './auth/auth.service';

describe('CertificateService', () => {
  let service: CertificateService;
  let httpMock: HttpTestingController;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  const mockCertificateData: CertificateData = {
    id: '1',
    studentName: 'Test User',
    studentId: 'user1',
    courseId: 'course1',
    courseTitle: 'Test Course',
    courseDomain: 'Agriculture',
    courseCountry: 'Kenya',
    completionDate: new Date('2023-12-25'),
    totalTimeSpent: 120,
    totalLessons: 10,
    completionPercentage: 100,
    certificateId: 'CERT-123',
    instructorName: 'Dr. Test',
    organizationName: 'AGRA Learning Platform',
    issueDate: new Date('2023-12-25'),
    isValid: true,
    verificationUrl: 'http://localhost/verify/CERT-123'
  };

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getToken']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CertificateService,
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    service = TestBed.inject(CertificateService);
    httpMock = TestBed.inject(HttpTestingController);
    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    
    mockAuthService.getToken.and.returnValue('mock-token');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate certificate', () => {
    const request: CertificateGenerationRequest = {
      courseId: 'course1',
      studentId: 'user1',
      completionData: {
        completionDate: new Date(),
        totalTimeSpent: 120,
        totalLessons: 10,
        completionPercentage: 100
      }
    };

    service.generateCertificate(request).subscribe(certificate => {
      expect(certificate).toEqual(mockCertificateData);
    });

    const req = httpMock.expectOne('http://localhost:8080/api/certificates/generate');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer mock-token');
    req.flush(mockCertificateData);
  });

  it('should get certificate by ID', () => {
    service.getCertificate('CERT-123').subscribe(certificate => {
      expect(certificate).toEqual(mockCertificateData);
    });

    const req = httpMock.expectOne('http://localhost:8080/api/certificates/CERT-123');
    expect(req.request.method).toBe('GET');
    req.flush(mockCertificateData);
  });

  it('should get certificate by course ID', () => {
    service.getCertificateByCourse('course1').subscribe(certificate => {
      expect(certificate).toEqual(mockCertificateData);
    });

    const req = httpMock.expectOne('http://localhost:8080/api/certificates/course/course1');
    expect(req.request.method).toBe('GET');
    req.flush(mockCertificateData);
  });

  it('should get user certificates', () => {
    const certificates = [mockCertificateData];

    service.getUserCertificates().subscribe(certs => {
      expect(certs).toEqual(certificates);
    });

    const req = httpMock.expectOne('http://localhost:8080/api/certificates/user');
    expect(req.request.method).toBe('GET');
    req.flush(certificates);
  });

  it('should verify certificate', () => {
    const verificationResult = {
      isValid: true,
      certificate: mockCertificateData
    };

    service.verifyCertificate('CERT-123').subscribe(result => {
      expect(result.isValid).toBe(true);
      expect(result.certificateData).toEqual(mockCertificateData);
    });

    const req = httpMock.expectOne('http://localhost:8080/api/certificates/verify/CERT-123');
    expect(req.request.method).toBe('GET');
    req.flush(verificationResult);
  });

  it('should download certificate PDF', () => {
    const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });

    service.downloadCertificatePDF('CERT-123').subscribe(blob => {
      expect(blob).toEqual(mockBlob);
    });

    const req = httpMock.expectOne('http://localhost:8080/api/certificates/CERT-123/download');
    expect(req.request.method).toBe('GET');
    req.flush(mockBlob);
  });

  it('should check if certificate exists', () => {
    service.checkCertificateExists('course1').subscribe(exists => {
      expect(exists).toBe(true);
    });

    const req = httpMock.expectOne('http://localhost:8080/api/certificates/exists/course1');
    expect(req.request.method).toBe('GET');
    req.flush({ exists: true });
  });

  it('should format time correctly', () => {
    expect(service.formatTime(90)).toBe('1h 30m');
    expect(service.formatTime(45)).toBe('45m');
    expect(service.formatTime(120)).toBe('2h 0m');
  });

  it('should format date correctly', () => {
    const date = new Date('2023-12-25');
    const formatted = service.formatDate(date);
    expect(formatted).toContain('December');
    expect(formatted).toContain('25');
    expect(formatted).toContain('2023');
  });

  it('should generate unique certificate ID', () => {
    const id1 = service.generateCertificateId();
    const id2 = service.generateCertificateId();
    
    expect(id1).toMatch(/^CERT-[A-Z0-9]+-[A-Z0-9]+$/);
    expect(id2).toMatch(/^CERT-[A-Z0-9]+-[A-Z0-9]+$/);
    expect(id1).not.toBe(id2);
  });

  it('should handle authentication error', () => {
    mockAuthService.getToken.and.returnValue(null);

    expect(() => {
      service.generateCertificate({
        courseId: 'course1',
        studentId: 'user1',
        completionData: {
          completionDate: new Date(),
          totalTimeSpent: 120,
          totalLessons: 10,
          completionPercentage: 100
        }
      }).subscribe();
    }).toThrowError('Authentication required');
  });
});