import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { AuthService } from '../services/auth/auth.service';
import { LoadingService } from '../services/loading.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private redirecting = false;
  constructor(private auth: AuthService, private loading: LoadingService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.loading.start();

    let headersReq = req;
    const token = this.auth.getToken?.();
    if (token && !req.headers.has('Authorization')) {
      headersReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }

    return next.handle(headersReq).pipe(
      catchError((err: HttpErrorResponse) => {
        // Normalize common errors
        let message = 'An unexpected error occurred.';
        if (err.status === 0) message = 'Network error. Please check your connection.';
        else if (err.status === 401) message = 'Authentication required. Please log in again.';
        else if (err.status === 403) message = 'You do not have permission to perform this action.';

        // If token expired or forbidden while in protected areas, force logout and redirect
        if ((err.status === 401 || err.status === 403) && !this.redirecting) {
          // Avoid loops; don't trigger for auth endpoints
          const url = err.url || req.url || '';
          const isAuthEndpoint = /\/api\/auth\//.test(url);
          if (!isAuthEndpoint) {
            this.redirecting = true;
            try { this.auth.logout(); } catch {}
            try { this.router.navigate(['/login']); } catch {}
            // Reset flag after a short tick
            setTimeout(() => { this.redirecting = false; }, 500);
          }
        }
        else if (err.status === 404) message = 'The requested resource was not found.';
        else if (err.error?.message) message = err.error.message;

        // Re-throw with normalized message
        return throwError(() => ({ ...err, message }));
      }),
      finalize(() => this.loading.stop())
    );
  }
}
