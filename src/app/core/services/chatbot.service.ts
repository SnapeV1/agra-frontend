import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable, map, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private endpoint = `${environment.chatbotApiUrl}/respond`;

  constructor(private http: HttpClient) {}

  sendMessage(message: string): Observable<string> {
    return this.http
      .post<{ id: string; answer: string; confidence: string; matchedTags: string[] }>(this.endpoint, { message })
      .pipe(
        tap(() => {}),
        map((res) => (res && res.answer ? res.answer : ''))
      );
  }
}




