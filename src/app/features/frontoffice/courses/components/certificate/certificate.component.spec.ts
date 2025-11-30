import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CertificateComponent } from './certificate.component';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { CertificateService, CertificateData } from 'src/app/core/services/certificate.service';
import { of } from 'rxjs';

describe('CertificateComponent', () => {
  let component: CertificateComponent;
  let fixture: ComponentFixture<CertificateComponent>;

  const mockCertificate: CertificateData = {
    id: 'cert-1',
    studentName: 'Test User',
    studentId: 'user-1',
    courseId: 'course-1',
    courseTitle: 'Sample Course',
    courseDomain: 'Agriculture',
    courseCountry: 'Kenya',
    completionDate: new Date(),
    totalTimeSpent: 120,
    totalLessons: 8,
    completionPercentage: 100,
    certificateId: 'cert-1',
    instructorName: 'Instructor',
    organizationName: 'AGRA',
    issueDate: new Date(),
    isValid: true,
    verificationUrl: '/verifyCertificate/cert-1',
    verificationCode: 'cert-1'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CertificateComponent],
      providers: [
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'course-1' } } } },
        { provide: CertificateService, useValue: { getCertificateByCourse: () => of(mockCertificate) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CertificateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

