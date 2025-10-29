import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../../../core/models/user.model';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/core/services/auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private apiUrl = `${environment.apiBaseUrl}/users`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  getAllUsers(): Observable<User[]> {
    // Keep legacy endpoint if backend expects /AllUsers; otherwise fallback to base /users
    return this.http.get<User[]>(`${this.apiUrl}/AllUsers`);
  }

  updateUser(user: Partial<User> & { id: string }): Observable<User> {
    // Backend expects multipart FormData with a 'user' JSON part
    const formData = new FormData();
    formData.append('user', JSON.stringify(user));
    const token = this.authService.getToken();
    const options = token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};
    return this.http.put<User>(`${this.apiUrl}/updateUser`, formData, options);
  }
}
