import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthUser } from 'src/app/features/auth/models/auth-user.model';
import { User } from 'src/app/features/user/models/user.model';

export interface LoginResponse {
  token: string;
  user: User;
  refreshToken?: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private apiUrl = 'http://localhost:8080/api/auth';
  
  private currentUserSubject: BehaviorSubject<AuthUser | null>;
  public currentUser: Observable<AuthUser | null>;
  private isAuthenticatedSubject: BehaviorSubject<boolean>;
  public isAuthenticated$: Observable<boolean>;
  
  public redirectUrl: string = '/home';
  private refreshTokenTimeout: any;
  private isRefreshing = false;

  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly EMAIL_KEY = 'user_email';
  private readonly ROLE_KEY = 'user_role';
  private readonly NAME_KEY = 'user_name';
  private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60; // 5 minutes

  constructor(private http: HttpClient, private router: Router) {
    this.currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
    this.currentUser = this.currentUserSubject.asObservable();
    this.isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    this.isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

    this.initializeAuthState();
    this.setupTokenRefreshTimer();
    this.autoLogout();
  }

  ngOnDestroy(): void {
    if (this.refreshTokenTimeout) clearTimeout(this.refreshTokenTimeout);
  }

  private initializeAuthState(): void {
    const token = this.getStoredItem(this.TOKEN_KEY);
    const refreshToken = this.getStoredItem(this.REFRESH_TOKEN_KEY);
    const email = this.getStoredItem(this.EMAIL_KEY);
    const role = this.getStoredItem(this.ROLE_KEY);
    const name = this.getStoredItem(this.NAME_KEY);

    if (token && email && role && this.isTokenValid()) {
      const authUser: AuthUser = {
        token,
        user: { email, role, name: name || '' } as User,
        refreshToken: refreshToken || undefined
      };
      this.currentUserSubject.next(authUser);
      this.isAuthenticatedSubject.next(true);
    } else {
      this.clearAuthData();
    }
  }

  login(credentials: any): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => this.handleSuccessfulAuth(response)),
      catchError(this.handleError)
    );
  }

  private handleSuccessfulAuth(response: LoginResponse): void {
    this.setStoredItem(this.TOKEN_KEY, response.token);
    this.setStoredItem(this.EMAIL_KEY, response.user.email);
    this.setStoredItem(this.ROLE_KEY, response.user.role);
    if (response.user.name) this.setStoredItem(this.NAME_KEY, response.user.name);
    if (response.refreshToken) this.setStoredItem(this.REFRESH_TOKEN_KEY, response.refreshToken);

    const authUser: AuthUser = {
      token: response.token,
      user: response.user,
      refreshToken: response.refreshToken
    };

    this.currentUserSubject.next(authUser);
    this.isAuthenticatedSubject.next(true);
    this.setupTokenRefreshTimer();
    this.router.navigate([this.redirectUrl || '/home']);
    this.redirectUrl = '/home';
  }

  logout(redirectTo: string = '/login'): void {
    this.clearAuthData();
    this.router.navigate([redirectTo]);
  }

  public get currentUserValue(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  getUserEmail(): string | null {
    return this.getStoredItem(this.EMAIL_KEY);
  }

  getUserRole(): string | null {
    return this.getStoredItem(this.ROLE_KEY);
  }

  refreshToken(): Observable<RefreshTokenResponse> {
    const refreshToken = this.getStoredItem(this.REFRESH_TOKEN_KEY);
    if (!refreshToken) return throwError(() => new Error('No refresh token available'));

    return this.http.post<RefreshTokenResponse>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      tap(response => {
        const current = this.currentUserSubject.value;
        if (!current) return;
        this.setStoredItem(this.TOKEN_KEY, response.token);
        if (response.refreshToken) this.setStoredItem(this.REFRESH_TOKEN_KEY, response.refreshToken);

        this.currentUserSubject.next({
          ...current,
          token: response.token,
          refreshToken: response.refreshToken || current.refreshToken
        });
        this.isAuthenticatedSubject.next(true);
        this.setupTokenRefreshTimer();
      }),
      catchError(error => {
        this.logout();
        return throwError(() => error);
      })
    );
  }

  private clearAuthData(): void {
    this.removeStoredItem(this.TOKEN_KEY);
    this.removeStoredItem(this.REFRESH_TOKEN_KEY);
    this.removeStoredItem(this.EMAIL_KEY);
    this.removeStoredItem(this.ROLE_KEY);
    this.removeStoredItem(this.NAME_KEY);
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    if (this.refreshTokenTimeout) clearTimeout(this.refreshTokenTimeout);
  }

  private setStoredItem(key: string, value: string) {
    localStorage.setItem(key, value);
  }

  private getStoredItem(key: string): string | null {
    return localStorage.getItem(key);
  }

  private removeStoredItem(key: string) {
    localStorage.removeItem(key);
  }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let message = 'An unknown error occurred';
    if (error.error instanceof ErrorEvent) message = error.error.message;
    else if (error.status === 401) message = 'Invalid credentials';
    else if (error.status === 403) message = 'Access forbidden';
    else if (error.status === 404) message = 'Service not found';
    else if (error.status === 500) message = 'Internal server error';
    else message = error.message;

    return throwError(() => new Error(message));
  };

  private isTokenValid(): boolean {
    const token = this.getStoredItem(this.TOKEN_KEY);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return !payload.exp || payload.exp > now;
    } catch {
      return false;
    }
  }

  private setupTokenRefreshTimer(): void {
    const token = this.getStoredItem(this.TOKEN_KEY);
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      const delay = expirationTime - currentTime - this.TOKEN_REFRESH_THRESHOLD * 1000;
      if (delay > 0) {
        this.refreshTokenTimeout = setTimeout(() => this.attemptTokenRefresh(), delay);
      }
    } catch {}
  }

  private attemptTokenRefresh(): void {
    if (this.isRefreshing) return;
    this.isRefreshing = true;
    this.refreshToken().subscribe({
      next: () => (this.isRefreshing = false),
      error: () => {
        this.isRefreshing = false;
        this.logout();
      }
    });
  }

  autoLogout(): void {
    const token = this.getStoredItem(this.TOKEN_KEY);
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const delay = payload.exp * 1000 - Date.now();
      if (delay > 0) setTimeout(() => this.logout(), delay);
    } catch {}
  }

  // Optional: check if token will expire soon
  isTokenExpiringSoon(): boolean {
    const token = this.getStoredItem(this.TOKEN_KEY);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now();
      const expirationTime = payload.exp * 1000;
      return expirationTime - currentTime <= this.TOKEN_REFRESH_THRESHOLD * 1000;
    } catch {
      return false;
    }
  }
  register(userData: any): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/register`, userData).pipe(
    tap(response => {
      console.log('User registered successfully:', response);
    }),
    catchError(this.handleError)
  );
}

isAuthenticated(): boolean {
  return this.isAuthenticatedSubject.value;
}
public refreshAuthState(): void {
  this.initializeAuthState();
}
isAdmin(): boolean {
  const role = localStorage.getItem('role');
  return role === 'ADMIN'; 
}
isUser(): boolean {
  const role = localStorage.getItem('role');
  return role === 'USER'; 
}
}
