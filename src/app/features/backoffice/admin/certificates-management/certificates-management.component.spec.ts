import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { CertificateService } from 'src/app/core/services/certificate.service';
import { CertificatesManagementComponent } from './certificates-management.component';

describe('CertificatesManagementComponent', () => {
  let component: CertificatesManagementComponent;
  let fixture: ComponentFixture<CertificatesManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CertificatesManagementComponent],
      imports: [FormsModule],
      providers: [
        {
          provide: CertificateService,
          useValue: {
            getIssuedCertificates: () => of([]),
            updateCertificateMetadata: () => of(),
            revokeCertificate: () => of()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CertificatesManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
