import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { ActivityLogsService } from 'src/app/features/backoffice/admin/services/activity-logs.service';
import { ActivityLog, ActivityType } from 'src/app/core/models/activity-log.model';

type ActivityFilterValue = ActivityType | '';

interface FilterState {
  userId: string;
  activityType: ActivityFilterValue;
  limit: number;
}

@Component({
  selector: 'app-activity-logs',
  templateUrl: './activity-logs.component.html',
  styleUrls: ['./activity-logs.component.css']
})
export class ActivityLogsComponent implements OnInit {
  logs: ActivityLog[] = [];
  loading = false;
  errorMessageKey: string | null = null;
  filters: FilterState = {
    userId: '',
    activityType: '',
    limit: 200
  };
  startInput = '';
  endInput = '';

  activityTypeOptions: Array<{ value: ActivityFilterValue; labelKey: string }> = [
    { value: '', labelKey: 'adminActivityLogs.activityTypes.ALL' },
    { value: 'LIKE', labelKey: 'adminActivityLogs.activityTypes.LIKE' },
    { value: 'PROFILE_UPDATE', labelKey: 'adminActivityLogs.activityTypes.PROFILE_UPDATE' },
    { value: 'COURSE_ENROLLMENT', labelKey: 'adminActivityLogs.activityTypes.COURSE_ENROLLMENT' },
    { value: 'COURSE_COMPLETION', labelKey: 'adminActivityLogs.activityTypes.COURSE_COMPLETION' },
    { value: 'TICKET_SUBMISSION', labelKey: 'adminActivityLogs.activityTypes.TICKET_SUBMISSION' },
    { value: 'CHATBOT_USAGE', labelKey: 'adminActivityLogs.activityTypes.CHATBOT_USAGE' },
    { value: 'OTHER', labelKey: 'adminActivityLogs.activityTypes.OTHER' }
  ];

  constructor(private activityLogsService: ActivityLogsService) {}

  ngOnInit(): void {
    this.fetchLogs();
  }

  applyFilters(): void {
    this.fetchLogs();
  }

  resetFilters(): void {
    this.filters = {
      userId: '',
      activityType: '',
      limit: 200
    };
    this.startInput = '';
    this.endInput = '';
    this.fetchLogs();
  }

  trackByLogId(_: number, log: ActivityLog): string {
    return log.id;
  }

  formatMetadataValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '-';
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  hasMetadataEntries(log: ActivityLog): boolean {
    return !!log.metadata && Object.keys(log.metadata).length > 0;
  }

  displayActivityLabelKey(type?: ActivityType | ''): string {
    if (!type) {
      return 'adminActivityLogs.activityTypes.ALL';
    }
    const normalized = type.toUpperCase() as ActivityType;
    const known = this.activityTypeOptions.some(option => option.value === normalized);
    return known ? `adminActivityLogs.activityTypes.${normalized}` : 'adminActivityLogs.activityTypes.OTHER';
  }

  formatTargetLabel(log: ActivityLog): string {
    if (!log.targetType && !log.targetId) {
      return '-';
    }
    if (log.targetType && log.targetId) {
      return `${log.targetType} · ${log.targetId}`;
    }
    return log.targetType || log.targetId || '-';
  }

  private fetchLogs(): void {
    this.loading = true;
    this.errorMessageKey = null;
    const userId = this.filters.userId.trim() || undefined;
    const activityType = this.filters.activityType || undefined;
    const limitValue = Number(this.filters.limit) || 200;
    const payload = {
      userId,
      activityType,
      limit: limitValue > 0 ? limitValue : 200,
      start: this.toIso(this.startInput),
      end: this.toIso(this.endInput)
    };

    this.activityLogsService.getActivityLogs(payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: logs => {
          this.logs = this.sortByDate(logs);
        },
        error: () => {
          this.errorMessageKey = 'adminActivityLogs.errors.fetchFailed';
          this.logs = [];
        }
      });
  }

  private sortByDate(logs: ActivityLog[]): ActivityLog[] {
    return [...logs].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime() || 0;
      const bTime = new Date(b.createdAt).getTime() || 0;
      return bTime - aTime;
    });
  }

  private toIso(localValue: string): string | undefined {
    if (!localValue) {
      return undefined;
    }
    const parsed = new Date(localValue);
    return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }
}
