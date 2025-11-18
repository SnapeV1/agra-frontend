import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ContactFormRequest {
  fullName: string;
  email: string;
  subject: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private apiUrl = `${environment.apiBaseUrl}/contact`;

  constructor(private http: HttpClient) {}

  submit(payload: ContactFormRequest): Observable<void> {
    return this.http.post<void>(this.apiUrl, payload);
  }
}
