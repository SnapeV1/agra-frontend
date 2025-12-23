import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ActivityLog, ActivityType } from 'src/app/core/models/activity-log.model';
import { environment } from 'src/environments/environment';

export interface ActivityLogFilters {
  userId?: string;
  activityType?: ActivityType;
  start?: string;
  end?: string;
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityLogsService {
  private readonly endpoint = `${environment.apiBaseUrl}/admin/activity-logs`;

  constructor(private http: HttpClient) {}

  getActivityLogs(filters: ActivityLogFilters = {}): Observable<ActivityLog[]> {
    let params = new HttpParams();
    if (filters.userId) {
      params = params.set('userId', filters.userId);
    }
    if (filters.activityType) {
      params = params.set('activityType', filters.activityType);
    }
    if (filters.start) {
      params = params.set('start', filters.start);
    }
    if (filters.end) {
      params = params.set('end', filters.end);
    }
    const limitValue = filters.limit ?? 200;
    if (limitValue > 0) {
      params = params.set('limit', limitValue.toString());
    }
    return this.http.get<ActivityLog[]>(this.endpoint, { params });
  }
}
