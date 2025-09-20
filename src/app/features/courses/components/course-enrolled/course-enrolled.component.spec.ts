import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseEnrolledComponent } from './course-enrolled.component';

describe('CourseEnrolledComponent', () => {
  let component: CourseEnrolledComponent;
  let fixture: ComponentFixture<CourseEnrolledComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CourseEnrolledComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CourseEnrolledComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
