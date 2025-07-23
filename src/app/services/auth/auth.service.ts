import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from 'src/app/features/user/models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth'; // Adjust to match your backend

  constructor(private http: HttpClient) {}

  register(userData: Partial<User>): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/register`, userData);
  }
}
