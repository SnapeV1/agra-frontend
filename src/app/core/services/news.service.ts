import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private readonly BASE_URL = 'http://localhost:8080/api/news';

  constructor(private http: HttpClient) {}

  fetchWeeklyNews(): Observable<any> {
    return this.http.post(`${this.BASE_URL}/fetch-weekly`, {});
  }

  getAllNews(params?: { country?: string; date?: string }): Observable<NewsArticle[]> {
    let httpParams = new HttpParams();
    if (params?.country) httpParams = httpParams.set('country', params.country);
    if (params?.date) httpParams = httpParams.set('date', params.date);
    return this.http.get<NewsArticle[]>(`${this.BASE_URL}/all`, { params: httpParams });
  }
}