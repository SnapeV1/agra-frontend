import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

const LANGUAGE_STORAGE_KEY = 'preferredLanguage';
const SUPPORTED_LANGS = ['en', 'fr'];

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private languageSubject: BehaviorSubject<string>;
  language$;

  constructor(private translate: TranslateService) {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const browser = (navigator?.language || 'en').split('-')[0].toLowerCase();
    const initial = this.normalizeLang(stored) || this.normalizeLang(browser) || 'en';
    this.languageSubject = new BehaviorSubject<string>(initial);
    this.language$ = this.languageSubject.asObservable();

    this.translate.addLangs(SUPPORTED_LANGS);
    this.translate.setDefaultLang('en');
    this.translate.use(initial);
  }

  get current(): string {
    return this.languageSubject.getValue();
  }

  setLanguage(lang: string): void {
    const normalized = this.normalizeLang(lang) || 'en';
    this.languageSubject.next(normalized);
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized); } catch {}
    this.translate.use(normalized);
  }

  private normalizeLang(lang?: string | null): string | null {
    if (!lang) return null;
    const short = lang.toLowerCase().split('-')[0];
    if (SUPPORTED_LANGS.includes(short)) return short;
    return null;
  }
}
