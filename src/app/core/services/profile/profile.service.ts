import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  private baseUrl = 'http://localhost:8080/api/users'; 
  constructor(private http: HttpClient) { }

  updateUserProfile(userData: any, profilePicture?: File): Observable<any> {
    const formData = new FormData();
    
    formData.append('user', JSON.stringify(userData));
    

    if (profilePicture) {
      formData.append('profilePicture', profilePicture);
    }

    const token = localStorage.getItem('auth_token');
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.put(`${this.baseUrl}/updateUser`, formData, { headers });
  }

}