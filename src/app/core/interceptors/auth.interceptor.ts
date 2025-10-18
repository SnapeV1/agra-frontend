import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { AuthService } from '../services/auth/auth.service';
import { LoadingService } from '../services/loading.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService, private loading: LoadingService) {}

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
        else if (err.status === 404) message = 'The requested resource was not found.';
        else if (err.error?.message) message = err.error.message;

        // Re-throw with normalized message
        return throwError(() => ({ ...err, message }));
      }),
      finalize(() => this.loading.stop())
    );
  }
}

