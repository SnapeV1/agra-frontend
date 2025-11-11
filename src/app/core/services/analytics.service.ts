import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth/auth.service';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private apiUrl = `${environment.apiBaseUrl}/analytics`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  // Helpers
  private authHeaders(): HttpHeaders | undefined {
    const token = this.auth.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
  }

  private withDates(params: HttpParams, start?: Date | string | null, end?: Date | string | null): HttpParams {
    let p = params;
    if (start) {
      const s = typeof start === 'string' ? start : start.toISOString();
      p = p.set('start', s);
    }
    if (end) {
      const e = typeof end === 'string' ? end : end.toISOString();
      p = p.set('end', e);
    }
    return p;
  }

  // ===== Courses =====
  getCourseSummary(): Observable<Record<string, any>> {
    return this.http.get<Record<string, any>>(`${this.apiUrl}/courses/summary`, { headers: this.authHeaders() });
  }

  getEnrollments(granularity: 'daily' | 'weekly' | 'monthly' = 'daily', start?: Date, end?: Date): Observable<Record<string, any>[]> {
    let params = new HttpParams().set('granularity', granularity);
    params = this.withDates(params, start, end);
    return this.http.get<Record<string, any>[]>(`${this.apiUrl}/enrollments`, { headers: this.authHeaders(), params });
  }

  getTopCourses(metric: string = 'enrollments', limit: number = 5): Observable<Record<string, any>[]> {
    const params = new HttpParams().set('metric', metric).set('limit', limit);
    return this.http.get<Record<string, any>[]>(`${this.apiUrl}/top-courses`, { headers: this.authHeaders(), params });
  }

  getCompletionRates(): Observable<Record<string, any>[]> {
    return this.http.get<Record<string, any>[]>(`${this.apiUrl}/completion-rates`, { headers: this.authHeaders() });
  }

  getCertificates(granularity: 'daily' | 'weekly' | 'monthly' = 'monthly', start?: Date, end?: Date): Observable<Record<string, any>[]> {
    let params = new HttpParams().set('granularity', granularity);
    params = this.withDates(params, start, end);
    return this.http.get<Record<string, any>[]>(`${this.apiUrl}/certificates`, { headers: this.authHeaders(), params });
  }

  // ===== Users =====
  getUserGrowth(granularity: 'daily' | 'weekly' | 'monthly' = 'monthly', start?: Date, end?: Date): Observable<Record<string, any>[]> {
    let params = new HttpParams().set('granularity', granularity);
    params = this.withDates(params, start, end);
    return this.http.get<Record<string, any>[]>(`${this.apiUrl}/users/growth`, { headers: this.authHeaders(), params });
  }

  getActiveUsers(days: number = 30): Observable<Record<string, any>> {
    const params = new HttpParams().set('days', days);
    return this.http.get<Record<string, any>>(`${this.apiUrl}/users/active`, { headers: this.authHeaders(), params });
  }

  getRolesBreakdown(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.apiUrl}/users/roles`, { headers: this.authHeaders() });
  }

  getGeoBreakdown(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.apiUrl}/users/geo`, { headers: this.authHeaders() });
  }

  getNewRegistrations(granularity: 'daily' | 'weekly' | 'monthly' = 'weekly', start?: Date, end?: Date): Observable<Record<string, any>[]> {
    let params = new HttpParams().set('granularity', granularity);
    params = this.withDates(params, start, end);
    return this.http.get<Record<string, any>[]>(`${this.apiUrl}/users/registrations`, { headers: this.authHeaders(), params });
  }

  // ===== Social / Feed =====
  getPostsTrend(granularity: 'daily' | 'weekly' | 'monthly' = 'weekly', start?: Date, end?: Date): Observable<Record<string, any>[]> {
    let params = new HttpParams().set('granularity', granularity);
    params = this.withDates(params, start, end);
    return this.http.get<Record<string, any>[]>(`${this.apiUrl}/social/posts/trend`, { headers: this.authHeaders(), params });
  }

  getTopPosts(limit: number = 10): Observable<Record<string, any>[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<Record<string, any>[]>(`${this.apiUrl}/social/posts/top`, { headers: this.authHeaders(), params });
  }

  getCommentsTrend(granularity: 'daily' | 'weekly' | 'monthly' = 'weekly', start?: Date, end?: Date): Observable<Record<string, any>[]> {
    let params = new HttpParams().set('granularity', granularity);
    params = this.withDates(params, start, end);
    return this.http.get<Record<string, any>[]>(`${this.apiUrl}/social/comments/trend`, { headers: this.authHeaders(), params });
  }

  getEngagementAverages(): Observable<Record<string, any>> {
    return this.http.get<Record<string, any>>(`${this.apiUrl}/social/engagement/averages`, { headers: this.authHeaders() });
  }

  getFeaturedPerformance(): Observable<Record<string, any>> {
    return this.http.get<Record<string, any>>(`${this.apiUrl}/social/featured-performance`, { headers: this.authHeaders() });
  }

  // ===== Notifications & Activity =====
  getNotificationsTrend(granularity: 'daily' | 'weekly' | 'monthly' = 'weekly', start?: Date, end?: Date): Observable<Record<string, any>[]> {
    let params = new HttpParams().set('granularity', granularity);
    params = this.withDates(params, start, end);
    return this.http.get<Record<string, any>[]>(`${this.apiUrl}/notifications/trend`, { headers: this.authHeaders(), params });
  }

  getWebsocketActive(): Observable<Record<string, any>> {
    return this.http.get<Record<string, any>>(`${this.apiUrl}/notifications/websocket/active`, { headers: this.authHeaders() });
  }

  getNotificationReadStatus(): Observable<Record<string, any>> {
    return this.http.get<Record<string, any>>(`${this.apiUrl}/notifications/read-status`, { headers: this.authHeaders() });
  }

  getTopNotificationTypes(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${this.apiUrl}/notifications/top-types`, { headers: this.authHeaders() });
  }
}
