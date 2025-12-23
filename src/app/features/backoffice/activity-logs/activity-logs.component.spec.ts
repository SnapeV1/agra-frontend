import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { ActivityLogsComponent } from './activity-logs.component';
import { ActivityLogsService } from 'src/app/features/backoffice/admin/services/activity-logs.service';

describe('ActivityLogsComponent', () => {
  let component: ActivityLogsComponent;
  let fixture: ComponentFixture<ActivityLogsComponent>;

  const activityLogsServiceStub = {
    getActivityLogs: () => of([])
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ActivityLogsComponent],
      imports: [
        FormsModule,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: ActivityLogsService, useValue: activityLogsServiceStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ActivityLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
