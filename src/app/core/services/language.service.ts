import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

const LANGUAGE_STORAGE_KEY = 'preferredLanguage';
const LEGACY_LANGUAGE_KEY = 'pref_lang';
const SUPPORTED_LANGS = ['en', 'fr', 'ar'];

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private languageSubject: BehaviorSubject<string>;
  language$;

  constructor(private translate: TranslateService) {
    const stored = this.readStoredLanguage();
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
    try { localStorage.removeItem(LEGACY_LANGUAGE_KEY); } catch {}
    this.translate.use(normalized);
  }

  private normalizeLang(lang?: string | null): string | null {
    if (!lang) return null;
    const short = lang.toLowerCase().split('-')[0];
    if (SUPPORTED_LANGS.includes(short)) return short;
    return null;
  }

  private readStoredLanguage(): string | null {
    try {
      const current = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (current) return current;
    } catch {}
    try {
      const legacy = localStorage.getItem(LEGACY_LANGUAGE_KEY);
      if (legacy) {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, legacy);
        localStorage.removeItem(LEGACY_LANGUAGE_KEY);
        return legacy;
      }
    } catch {}
    return null;
  }
}
