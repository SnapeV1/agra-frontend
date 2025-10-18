import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CreateSessionDto, JoinResponse, SessionModule } from '../models/session.model';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class SessionService {

private base = `${environment.apiBaseUrl}/sessions`;
  constructor(private http: HttpClient, private authService: AuthService) {}

  private authHeaders(): { headers?: HttpHeaders } {
    const token = this.authService.getToken();
    if (!token) return {};
    return {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    };
  }

  create(courseId: string, dto: CreateSessionDto) {
    return this.http.post<SessionModule>(`${this.base}/courses/${courseId}`, dto, this.authHeaders());
  }
  upcoming(courseId: string) {
    return this.http.get<SessionModule[]>(`${this.base}/courses/${courseId}/upcoming`, this.authHeaders());
  }
  get(sessionId: string) {
    return this.http.get<SessionModule>(`${this.base}/${sessionId}`, this.authHeaders());
  }
  join(sessionId: string) {
    return this.http.post<JoinResponse>(`${this.base}/${sessionId}/join`, {}, this.authHeaders());
  }
  // optional analytics
  event(sessionId: string, type: 'JOIN'|'LEAVE'|'STATS', secondsWatched?: number) {
    return this.http.post<void>(`${this.base}/${sessionId}/events`, { type, secondsWatched }, this.authHeaders());
  }
}
