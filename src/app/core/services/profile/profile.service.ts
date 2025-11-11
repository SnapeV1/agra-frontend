import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  private baseUrl = `${environment.apiBaseUrl}/users`;
  constructor(private http: HttpClient, private auth: AuthService) { }

  updateUserProfile(userData: any, profilePicture?: File): Observable<any> {
    const formData = new FormData();
    
    formData.append('user', JSON.stringify(userData));
    

    if (profilePicture) {
      formData.append('profilePicture', profilePicture);
    }

    // Prefer AuthService so it looks in both localStorage and sessionStorage
    const token = this.auth.getToken?.() || undefined;
    const headers = token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : undefined;
    return this.http.put(`${this.baseUrl}/updateUser`, formData, { headers });
  }

}
