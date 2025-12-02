import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth/auth.service';

export interface NewsArticle {
  id?: string | number;
  title?: string;
  description?: string;
  country?: string;
  publishedAt?: string;
  source?: string;
  url?: string;
  urlToImage?: string;
}

@Injectable({ providedIn: 'root' })
export class NewsService {
  private readonly BASE_URL = `${environment.apiBaseUrl}/news`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  fetchWeeklyNews(): Observable<any> {
    return this.http.post(`${this.BASE_URL}/fetch-weekly`, {});
  }

  getAllNews(params?: { country?: string; date?: string }): Observable<NewsArticle[]> {
    let httpParams = new HttpParams();
    if (params?.country) httpParams = httpParams.set('country', params.country);
    if (params?.date) httpParams = httpParams.set('date', params.date);
    return this.http.get<NewsArticle[]>(`${this.BASE_URL}/all`, { params: httpParams });
  }

  deleteNews(id: string | number): Observable<void> {
    const token = this.auth.getToken?.();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.delete<void>(`${this.BASE_URL}/${id}`, { headers });
  }
}
