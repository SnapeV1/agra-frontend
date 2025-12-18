import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { VerifyCertificateComponent } from './verify-certificate.component';
import { CertificateService } from 'src/app/core/services/certificate.service';

describe('VerifyCertificateComponent', () => {
  let component: VerifyCertificateComponent;
  let fixture: ComponentFixture<VerifyCertificateComponent>;

  beforeEach(async () => {
    const certificateServiceMock = {
      verifyCertificate: jasmine.createSpy('verifyCertificate').and.returnValue(of({ isValid: false })),
      formatDate: jasmine.createSpy('formatDate').and.callFake((date: Date) => date.toISOString()),
      formatTime: jasmine.createSpy('formatTime').and.returnValue('0m')
    };

    await TestBed.configureTestingModule({
      declarations: [VerifyCertificateComponent],
      imports: [RouterTestingModule],
      providers: [
        { provide: CertificateService, useValue: certificateServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
              queryParamMap: convertToParamMap({})
            }
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerifyCertificateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
