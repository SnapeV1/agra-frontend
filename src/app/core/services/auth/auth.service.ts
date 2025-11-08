import { Injectable, OnDestroy, NgZone } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthUser } from 'src/app/core/models/auth-user.model';
import { User } from 'src/app/core/models/user.model';
import { environment } from 'src/environments/environment';

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
  private readonly USER_ME_URL = 'http://localhost:8080/api/auth/me';

  
  private currentUserSubject: BehaviorSubject<AuthUser | null>;
  public currentUser: Observable<AuthUser | null>;
  private isAuthenticatedSubject: BehaviorSubject<boolean>;
  public isAuthenticated$: Observable<boolean>;
  
  public redirectUrl: string | null = null;
  private refreshTokenTimeout: any;
  private isRefreshing = false;

  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly EMAIL_KEY = 'user_email';
  private readonly ROLE_KEY = 'user_role';
  private readonly NAME_KEY = 'user_name';
  private readonly PICTURE_KEY = 'user_picture';
  private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60; 
  private readonly THEME_KEY = 'pref_theme';
  // Storage preference: false => localStorage (remember), true => sessionStorage (no remember)
  private useSessionStorage = false;

  constructor(private http: HttpClient, private router: Router, private ngZone: NgZone) {
    this.currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
    this.currentUser = this.currentUserSubject.asObservable();
    this.isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    this.isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

    this.detectStoragePreference();
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
  const picture = this.getStoredItem(this.PICTURE_KEY); 

  if (token && email && role && this.isTokenValid()) {
    const authUser: AuthUser = {
      token,
      user: { email, role, name: name || '', picture } as User, 
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

  // Set from UI before login to decide persistence
  setRememberMe(remember: boolean): void {
    this.useSessionStorage = !remember;
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/forgot-password`, { email }).pipe(
      tap(() => {}),
      catchError(this.handleError)
    );
  }

  // Reset password using token from email link
  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reset-password`, { token, password }).pipe(
      tap(() => {}),
      catchError(this.handleError)
    );
  }

  // Simple connectivity test to the backend health endpoint
  testConnection(): Observable<any> {
    const base = (environment as any)?.apiBaseUrl || 'http://localhost:8080/api';
    const url = `${base}/auth/health/google`;
    return this.http.get(url, { observe: 'response' }).pipe(
      tap(() => {}),
      catchError(this.handleError)
    );
  }

  // Backend-verified Google login. Sends the Google ID token to backend `/api/auth/google`.
  // On success, persists returned JWT, refresh token (if any), and user profile.
  loginWithGoogleIdToken(idToken: string): void {
    this.http
      .post<LoginResponse>(`${this.apiUrl}/google`, { token: idToken })
      .pipe(
        tap((response) => {
          try {
            if (response?.user) {
              const { email, name, role } = response.user;
              const picture = (response.user as any)?.picture;
              console.log('[Auth][Google] Backend user', { email, name, role, picture });
            }
          } catch {}
          this.handleSuccessfulAuth(response);
        }),
        catchError(this.handleError)
      )
      .subscribe({
        next: () => {},
        error: () => {}
      });
  }

  // Completes signup by setting a password for the current (Google-authenticated) user
  setPassword(newPassword: string): Observable<any> {
    const token = this.getStoredItem(this.TOKEN_KEY);
    if (!token) return throwError(() => new Error('Not authenticated'));
    return this.http.post<any>(`${this.apiUrl}/set-password`, { password: newPassword }, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).pipe(
      tap(() => {}),
      catchError(this.handleError)
    );
  }

  // Change password for authenticated user
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    const token = this.getStoredItem(this.TOKEN_KEY);
    if (!token) return throwError(() => new Error('Not authenticated'));
    return this.http.post<any>(`${this.apiUrl}/changePassword`, { currentPassword, newPassword }, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).pipe(
      tap(() => {}),
      catchError(this.handleError)
    );
  }

  // Change email for authenticated user (endpoint may vary on backend)
  changeEmail(newEmail: string, password: string): Observable<any> {
    const token = this.getStoredItem(this.TOKEN_KEY);
    if (!token) return throwError(() => new Error('Not authenticated'));
    return this.http.post<any>(`${this.apiUrl}/changeEmail`, { newEmail, password }, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).pipe(
      tap(() => {}),
      catchError(this.handleError)
    );
  }

  private handleSuccessfulAuth(response: LoginResponse): void {
  this.setStoredItem(this.TOKEN_KEY, response.token);
  this.setStoredItem(this.EMAIL_KEY, response.user.email);
  this.setStoredItem(this.ROLE_KEY, response.user.role);
  if (response.user.name) this.setStoredItem(this.NAME_KEY, response.user.name);
  if (response.user.picture) this.setStoredItem(this.PICTURE_KEY, response.user.picture); 
  if (response.refreshToken) this.setStoredItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
  // Sync theme preference from backend if provided
  try { this.applyThemePreference((response.user as any)?.themePreference); } catch {}

  const authUser: AuthUser = {
    token: response.token,
    user: response.user,
    refreshToken: response.refreshToken
  };

  this.currentUserSubject.next(authUser);
  this.isAuthenticatedSubject.next(true);
  this.setupTokenRefreshTimer();
  const fallback = this.isProfileComplete(response.user) ? '/home' : '/complete-profile';
  const target = this.redirectUrl ?? fallback;
  this.ngZone.run(() => this.router.navigate([target]));
  this.redirectUrl = null;
}


  logout(): void {
    this.clearAuthData();
  }

  logoutOnUnload(): void {
    try {
      this.clearAuthData();
    } catch {
    }
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
  getUserPicture(): string | null {
  return this.getStoredItem(this.PICTURE_KEY);
}

  private isProfileComplete(user: User | null | undefined): boolean {
    if (!user) return false;
    const hasPhone = !!user.phone;
    const hasRole = !!user.role;
    return hasPhone && hasRole;
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
  this.removeStoredItem(this.PICTURE_KEY); 
  // Clear theme so logged-out state doesn't keep last user's preference
  try {
    this.removeStoredItem(this.THEME_KEY);
    document.documentElement.removeAttribute('data-theme');
  } catch {}
  this.currentUserSubject.next(null);
  this.isAuthenticatedSubject.next(false);
  if (this.refreshTokenTimeout) clearTimeout(this.refreshTokenTimeout);
}


  private setStoredItem(key: string, value: string) {
    try {
      const store = this.useSessionStorage ? sessionStorage : localStorage;
      store.setItem(key, value);
    } catch {}
  }

  private getStoredItem(key: string): string | null {
    try {
      // Prefer current storage, fall back to the other
      const primary = this.useSessionStorage ? sessionStorage : localStorage;
      const secondary = this.useSessionStorage ? localStorage : sessionStorage;
      const fromPrimary = primary.getItem(key);
      if (fromPrimary !== null) return fromPrimary;
      const fromSecondary = secondary.getItem(key);
      if (fromSecondary !== null) return fromSecondary;
      return null;
    } catch {
      return null;
    }
  }

  private removeStoredItem(key: string) {
    try { localStorage.removeItem(key); } catch {}
    try { sessionStorage.removeItem(key); } catch {}
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
  const role = this.getStoredItem(this.ROLE_KEY);
  return role === 'ADMIN'; 
}
isUser(): boolean {
  const role = this.getStoredItem(this.ROLE_KEY);
  return role === 'USER'; 
}

 getCurrentUserFromBackend(): Observable<User> {
    const token = this.getStoredItem(this.TOKEN_KEY);
    if (!token) {
      // No token present; do not redirect; just error for callers to handle
      return throwError(() => new Error('No auth token found'));
    }

    return this.http.get<User>(this.USER_ME_URL, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).pipe(
      tap(user => {
        const currentAuthUser = this.currentUserSubject.value;
        if (currentAuthUser) {
          currentAuthUser.user = user;
          this.currentUserSubject.next(currentAuthUser);
        }
        try { this.applyThemePreference((user as any)?.themePreference); } catch {}
      }),
      catchError(err => {
        // Propagate error; let guards/services decide what to do
        return throwError(() => err);
      })
    );
  }

  updateCurrentUser(updatedUser: User): void {
  const currentAuthUser = this.currentUserValue;
  
  if (currentAuthUser) {
    const updatedAuthUser = {
      ...currentAuthUser,
      user: updatedUser
    };
    
    this.currentUserSubject.next(updatedAuthUser);
    
    this.setStoredItem(this.EMAIL_KEY, updatedUser.email);
    this.setStoredItem(this.ROLE_KEY, updatedUser.role);
    
    if (updatedUser.name) {
      this.setStoredItem(this.NAME_KEY, updatedUser.name);
    } else {
      this.removeStoredItem(this.NAME_KEY);
    }
    
    if (updatedUser.picture) {
      this.setStoredItem(this.PICTURE_KEY, updatedUser.picture);
    } else {
      this.removeStoredItem(this.PICTURE_KEY);
    }
    // Apply any updated theme preference
    try { this.applyThemePreference((updatedUser as any)?.themePreference); } catch {}
    
  }
  }
getToken(): string | null {
  try {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  } catch {
    return null;
  }
  }

  private applyThemePreference(pref?: string | null | undefined): void {
    try {
      if (!pref) return; // do not override if backend didn't send
      this.setStoredItem(this.THEME_KEY, pref);
      const root = document.documentElement;
      if (pref === 'dark') {
        root.setAttribute('data-theme', 'dark');
      } else if (pref === 'auto') {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) root.setAttribute('data-theme', 'dark');
        else root.removeAttribute('data-theme');
      } else {
        root.removeAttribute('data-theme');
      }
    } catch {}
  }

  // Keeping decodeJwt helper in case it is useful elsewhere; not used in the Google flow now.
  private decodeJwt(token: string): any | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  private detectStoragePreference(): void {
    try {
      // If token is in localStorage, prefer persistence; else if in session, use session
      if (localStorage.getItem(this.TOKEN_KEY)) {
        this.useSessionStorage = false;
      } else if (sessionStorage.getItem(this.TOKEN_KEY)) {
        this.useSessionStorage = true;
      }
    } catch {}
  }

}
