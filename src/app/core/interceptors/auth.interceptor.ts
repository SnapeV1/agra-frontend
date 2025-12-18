import { Injectable, Injector } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { LoadingService } from '../services/loading.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  private redirecting = false;

  constructor(
    private injector: Injector,
    private loading: LoadingService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.loading.start();

    const auth = this.injector.get(AuthService); // 👈 lazy
    let headersReq = req;

    const token = auth.getToken?.();
    if (token && !req.headers.has('Authorization')) {
      headersReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(headersReq).pipe(
      catchError((err: HttpErrorResponse) => {
        const serverMessage =
          typeof err.error?.message === 'string' ? err.error.message : '';

        let message = serverMessage || 'An unexpected error occurred.';
        if (err.status === 0 && !serverMessage) {
          message = 'Network error. Please check your connection.';
        }

        if ((err.status === 401 || err.status === 403) && !this.redirecting) {
          const url = err.url || req.url || '';
          const isAuthEndpoint = /\/api\/auth\//.test(url);

          if (!isAuthEndpoint) {
            this.redirecting = true;
            try { auth.logout(); } catch {}
            try { this.router.navigate(['/login']); } catch {}
            setTimeout(() => (this.redirecting = false), 500);
          }
        }

        return throwError(() => ({ ...err, message }));
      }),
      finalize(() => this.loading.stop())
    );
  }
}
