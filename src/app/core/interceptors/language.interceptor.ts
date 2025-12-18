import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class LanguageInterceptor implements HttpInterceptor {
  private getLang(): string {
    try {
      const stored = localStorage.getItem('preferredLanguage');
      if (stored) return stored;
    } catch {}
    try {
      const browser = (navigator?.language || 'en').split('-')[0].toLowerCase();
      return browser || 'en';
    } catch {
      return 'en';
    }
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const lang = this.getLang() || 'en';
    const reqWithLang = req.clone({
      setHeaders: {
        'Accept-Language': lang
      }
    });

    return next.handle(reqWithLang);
  }
}
