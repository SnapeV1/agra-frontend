import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from 'src/app/core/models/user.model';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/core/services/auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private apiUrl = `${environment.apiBaseUrl}/users`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/AllUsers`);
  }

  updateUser(user: Partial<User> & { id: string }): Observable<User> {
    const token = this.authService.getToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : undefined;
    return this.http.put<User>(`${this.apiUrl}/updateUser/${user.id}`, user, { headers });
  }

}
