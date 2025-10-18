import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private endpoint = `${environment.chatbotApiUrl}/chat`;

  constructor(private http: HttpClient) {}

  sendMessage(message: string): Observable<string> {
    return this.http
      .post<{ response: string }>(this.endpoint, { message })
      .pipe(map((res) => (res && res.response ? res.response : '')));
  }
}

