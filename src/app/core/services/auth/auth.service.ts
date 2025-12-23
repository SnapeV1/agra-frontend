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
  private apiUrl = `${environment.apiBaseUrl}/auth`;
  private readonly USER_ME_URL = `${environment.apiBaseUrl}/auth/me`;

  
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
  private readonly VERIFIED_KEY = 'user_verified';
  private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60; 
  private readonly THEME_KEY = 'pref_theme';
  private readonly PROVISIONAL_SIGNUP_KEY = 'signup_google_profile';
  private readonly PASSWORD_SET_TOKEN_KEY = 'password_set_token';
  private readonly PASSWORD_RESET_COOLDOWN_KEY = 'pwd_reset_cooldown_until';
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly USER_ID_KEY = 'user_id';
  private readonly ADMIN_NOTIFICATION_PREFS_KEY = 'admin_notification_prefs';
  private readonly USER_SCOPED_PREFIXES = [
    'liked_posts_',
    'liked_comments_',
    'notif_seen_ids_',
    'notif_deleted_ids_',
    'admin_notification_prefs'
  ];
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
  const rawRole = this.getStoredItem(this.ROLE_KEY) || '';
  const role = this.normalizeRole(rawRole);
  const name = this.getStoredItem(this.NAME_KEY);
  const picture = this.getStoredItem(this.PICTURE_KEY); 
  const verified = this.getStoredItem(this.VERIFIED_KEY) === 'true';

  if (token && email && role && this.isTokenValid()) {
    const authUser: AuthUser = {
      token,
      user: { email, role, name: name || '', picture, verified } as User, 
      refreshToken: refreshToken || undefined
    };
    this.currentUserSubject.next(authUser);
    // Only mark fully authenticated when verified is true or not set
    const isAuthed = this.getStoredItem(this.VERIFIED_KEY) === null ? true : verified;
    this.isAuthenticatedSubject.next(isAuthed);
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

  requestPasswordResetSms(phone: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/forgot-password/sms`, { phone }).pipe(
      tap(() => {}),
      catchError(this.handleError)
    );
  }

  verifyPasswordResetSms(phone: string, code: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/reset-password/sms`, { phone, code }).pipe(
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
    const url = `${environment.apiBaseUrl}/auth/health/google`;
    return this.http.get(url, { observe: 'response' }).pipe(
      tap(() => {}),
      catchError(this.handleError)
    );
  }

  // Google auth: call backend to exchange the ID token and branch using existingAccount
  beginGoogleSignup(idToken: string): void {
    const url = `${this.apiUrl}/google`;
    this.http.post<any>(url, { token: idToken }).pipe(
      catchError(this.handleError)
    ).subscribe({
      next: (res) => {
        const existing = !!(res as any)?.existingAccount;
        const profileCompleted = !!(res as any)?.profileCompleted;
        
        // Store a lightweight provisional profile for guard/UI context
        try {
          const user = (res as any)?.user as User;
          const provisional = {
            email: user?.email || '',
            name: user?.name || '',
            picture: user?.picture || '',
            sub: '',
            idToken
          };
          this.setStoredItem(this.PROVISIONAL_SIGNUP_KEY, JSON.stringify(provisional));
        } catch {}

        if (existing || profileCompleted) {
          // Existing or already complete: finalize auth and ensure we leave login
          
          // If it's an existing account but backend marks profileCompleted=false (e.g., optional fields), still go Home
          if (existing && !profileCompleted) {
            try { (this as any).clearProvisionalSignup?.(); } catch {}
            this.redirectUrl = '/home';
          }
          this.handleSuccessfulAuth(res as LoginResponse);
          // Failsafe navigation in case anything suppresses the internal redirect
          this.ngZone.run(() => { this.router.navigateByUrl('/home'); });
          return;
        }

        // New Google account (not completed): log user in, then redirect to complete-signup to set password
        this.redirectUrl = '/complete-signup';
        this.handleSuccessfulAuth(res as LoginResponse);
      },
      error: (err) => {
        // On failure, allow user to proceed with local flow as a fallback
        try {
          this.setStoredItem(this.PROVISIONAL_SIGNUP_KEY, JSON.stringify({ email: '', name: '', picture: '', sub: '', idToken }));
        } catch {}
        this.ngZone.run(() => this.router.navigate(['/complete-signup']));
      }
    });
  }

  getProvisionalSignup(): any | null {
    try {
      const raw = this.getStoredItem(this.PROVISIONAL_SIGNUP_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null }
  }

  clearProvisionalSignup(): void {
    try { this.removeStoredItem(this.PROVISIONAL_SIGNUP_KEY); } catch {}
  }

  // Complete Signup display is determined upstream; no additional checks here.

  // Expose any stored password setup token for components that need it (not required in new flow)
  public getStoredPasswordSetupToken(): string | null { 
    return this.getStoredItem(this.PASSWORD_SET_TOKEN_KEY);
  }

  // Completes signup by setting a password. Backend expects a token IN THE BODY.
  // Prefer a dedicated password/reset token if present; fall back to JWT.
  setPassword(newPassword: string, tokenOverride?: string): Observable<any> {
    const jwt = this.getStoredItem(this.TOKEN_KEY);
    const resetToken = tokenOverride || this.getStoredItem(this.PASSWORD_SET_TOKEN_KEY) || jwt;
    if (!resetToken) return throwError(() => new Error('Not authenticated'));
    const body = { token: resetToken, password: newPassword } as any;
    return this.http.post<any>(`${this.apiUrl}/set-password`, body, {
      headers: jwt ? { 'Authorization': `Bearer ${jwt}` } : undefined
    }).pipe(
      tap(() => { try { this.removeStoredItem(this.PASSWORD_SET_TOKEN_KEY); } catch {} }),
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

  verifyEmail(token: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/verify-email`, {
      params: { token }
    }).pipe(
      tap(() => {
        const current = this.currentUserSubject.value;
        if (current) {
          const updatedUser = { ...current.user, verified: true };
          this.currentUserSubject.next({ ...current, user: updatedUser });
        }
        this.setStoredItem(this.VERIFIED_KEY, 'true');
        this.isAuthenticatedSubject.next(true);
      }),
      catchError(this.handleError)
    );
  }

  resendVerification(): Observable<any> {
    const token = this.getStoredItem(this.TOKEN_KEY);
    if (!token) return throwError(() => new Error('You must be signed in to resend verification.'));
    return this.http.post<any>(`${this.apiUrl}/resend-verification`, {}, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).pipe(
      tap(() => {}),
      catchError(this.handleError)
    );
  }

  private handleSuccessfulAuth(response: LoginResponse): void {
  const safeRole = this.normalizeRole(response.user.role);
  const isVerified = (response.user as any)?.verified === true;
  const previousUserId = this.getStoredItem(this.USER_ID_KEY) || this.currentUserSubject.value?.user?.id || '';
  const nextUserId = response.user?.id || '';
  if (previousUserId && nextUserId && previousUserId !== nextUserId) {
    this.clearUserScopedStorage();
  }

  this.setStoredItem(this.TOKEN_KEY, response.token);
  this.setStoredItem(this.EMAIL_KEY, response.user.email);
  this.setStoredItem(this.ROLE_KEY, safeRole);
  if (response.user.name) this.setStoredItem(this.NAME_KEY, response.user.name);
  if (response.user.picture) this.setStoredItem(this.PICTURE_KEY, response.user.picture); 
  this.setStoredItem(this.VERIFIED_KEY, isVerified ? 'true' : 'false');
  if (nextUserId) this.setStoredItem(this.USER_ID_KEY, nextUserId);
  if (!this.useSessionStorage && response.refreshToken) this.setStoredItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
  else if (this.useSessionStorage) this.removeStoredItem(this.REFRESH_TOKEN_KEY);
  // Capture any password-set token and completion flag from backend if provided
  let profileCompleted = true;
  try {
    const anyRes: any = response as any;
    const pwdToken = anyRes?.passwordResetToken || anyRes?.resetToken || anyRes?.passwordToken || anyRes?.verificationToken;
    if (pwdToken) this.setStoredItem(this.PASSWORD_SET_TOKEN_KEY, pwdToken);
    if (typeof anyRes?.profileCompleted === 'boolean') profileCompleted = !!anyRes.profileCompleted;
  } catch {}
  // Sync theme preference from backend if provided
  try { this.applyThemePreference((response.user as any)?.themePreference); } catch {}

  const authUser: AuthUser = {
    token: response.token,
    user: { ...response.user, role: safeRole, verified: isVerified },
    refreshToken: response.refreshToken
  };

  this.currentUserSubject.next(authUser);
  this.isAuthenticatedSubject.next(isVerified);
  if (!this.useSessionStorage) this.setupTokenRefreshTimer();

  // Route based on verification and profile completion
  if (!isVerified) {
    this.ngZone.run(() => this.router.navigate(['/verify-email'], { queryParams: { email: response.user.email } }));
    this.redirectUrl = null;
    return;
  }

  const hasSetupToken = !!this.getStoredItem(this.PASSWORD_SET_TOKEN_KEY);
  let fallback = '/home';
  if (!profileCompleted && hasSetupToken) fallback = '/complete-signup';
  else if (!profileCompleted && !hasSetupToken) fallback = '/login';
  const target = this.redirectUrl ?? fallback;
  this.ngZone.run(() => this.router.navigate([target]));
  this.redirectUrl = null;
}


  logout(): void {
    this.revokeRefreshToken();
    this.clearAuthData();
    this.redirectUrl = null;
    this.navigateToLogin();
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
    const raw = this.getStoredItem(this.ROLE_KEY);
    return raw ? this.normalizeRole(raw) : null;
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
    if (this.useSessionStorage) {
      return throwError(() => new Error('Session-based sign-in does not use refresh tokens.'));
    }
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
  const alwaysClearKeys = [
    this.TOKEN_KEY,
    this.REFRESH_TOKEN_KEY,
    this.ACCESS_TOKEN_KEY,
    this.EMAIL_KEY,
    this.ROLE_KEY,
    this.NAME_KEY,
    this.PICTURE_KEY,
    this.VERIFIED_KEY,
    this.PROVISIONAL_SIGNUP_KEY,
    this.PASSWORD_SET_TOKEN_KEY,
    this.PASSWORD_RESET_COOLDOWN_KEY,
    this.USER_ID_KEY,
    this.ADMIN_NOTIFICATION_PREFS_KEY
  ];
  alwaysClearKeys.forEach(key => this.removeStoredItem(key));
  this.clearUserScopedStorage();
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

  private clearUserScopedStorage(): void {
    try { this.removeKeysByPrefix(localStorage, this.USER_SCOPED_PREFIXES); } catch {}
    try { this.removeKeysByPrefix(sessionStorage, this.USER_SCOPED_PREFIXES); } catch {}
  }

  private removeKeysByPrefix(store: Storage, prefixes: string[]): void {
    const keys: string[] = [];
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (!key) continue;
      if (prefixes.some(prefix => key.startsWith(prefix))) keys.push(key);
    }
    keys.forEach(key => {
      try { store.removeItem(key); } catch {}
    });
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
    if (this.useSessionStorage) return;
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
    if (this.useSessionStorage) return;
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

  private navigateToLogin(): void {
    this.ngZone.run(() => {
      try {
        this.router.navigate(['/login'], { replaceUrl: true });
      } catch {
        // Fallback in case router navigation fails outside angular zone
        this.router.navigate(['/login']);
      }
    });
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
  const role = this.getUserRole();
  return role === 'ADMIN'; 
}
isUser(): boolean {
  const role = this.getUserRole();
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
        const previousUserId = this.getStoredItem(this.USER_ID_KEY) || this.currentUserSubject.value?.user?.id || '';
        if (previousUserId && user?.id && previousUserId !== user.id) {
          this.clearUserScopedStorage();
        }
        const normalizedRole = this.normalizeRole(user.role);
        // Persist latest profile bits
        this.setStoredItem(this.EMAIL_KEY, user.email);
        this.setStoredItem(this.ROLE_KEY, normalizedRole);
        if (user.id) this.setStoredItem(this.USER_ID_KEY, user.id);
        if (user.name) this.setStoredItem(this.NAME_KEY, user.name); else this.removeStoredItem(this.NAME_KEY);
        if (user.picture) this.setStoredItem(this.PICTURE_KEY, user.picture); else this.removeStoredItem(this.PICTURE_KEY);
        this.setStoredItem(this.VERIFIED_KEY, (user as any)?.verified ? 'true' : 'false');
        const currentAuthUser = this.currentUserSubject.value;
        if (currentAuthUser) {
          currentAuthUser.user = { ...user, role: normalizedRole, verified: (user as any)?.verified };
          this.currentUserSubject.next(currentAuthUser);
        }
        try { this.applyThemePreference((user as any)?.themePreference); } catch {}
      }),
      catchError(err => {
        // If /me fails, force logout and redirect to login
        try {
          this.logout();
          this.ngZone.run(() => this.router.navigate(['/login']));
        } catch {}
        return throwError(() => err);
      })
    );
  }

  updateCurrentUser(updatedUser: User): void {
  const currentAuthUser = this.currentUserValue;
  
  if (currentAuthUser) {
    const updatedAuthUser = {
      ...currentAuthUser,
      user: { ...updatedUser, role: this.normalizeRole(updatedUser.role), verified: (updatedUser as any)?.verified }
    };
    
    this.currentUserSubject.next(updatedAuthUser);
    
    this.setStoredItem(this.EMAIL_KEY, updatedUser.email);
    this.setStoredItem(this.ROLE_KEY, this.normalizeRole(updatedUser.role));
    
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
    this.setStoredItem(this.VERIFIED_KEY, (updatedUser as any)?.verified ? 'true' : 'false');
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

  // Normalize any incoming role value to one of the two allowed roles
  private normalizeRole(role: string | null | undefined): 'USER' | 'ADMIN' {
    const r = (role || '').toString().trim().toUpperCase();
    return r === 'ADMIN' ? 'ADMIN' : 'USER';
  }

  // Best-effort server-side revocation of refresh token
  private revokeRefreshToken(): void {
    const refreshToken = this.getStoredItem(this.REFRESH_TOKEN_KEY);
    if (!refreshToken) return;
    const accessToken = this.getStoredItem(this.TOKEN_KEY);
    try {
      this.http.post(`${this.apiUrl}/logout`, { refreshToken }, {
        headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : undefined
      }).subscribe({
        next: () => {},
        error: () => {}
      });
    } catch {}
  }

}
