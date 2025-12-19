import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { LanguageService } from 'src/app/core/services/language.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit, OnDestroy {
  year = new Date().getFullYear();
  showScrollTop = false;
  currentLang = 'en';
  readonly languages = ['en', 'fr', 'ar'];
  isGuest = true;

  private authSub?: Subscription;

  constructor(
    private authService: AuthService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.currentLang = this.languageService.current;
    this.authSub = this.authService.isAuthenticated$.subscribe(isAuth => {
      this.isGuest = !isAuth;
    });
    this.updateScrollTopVisibility();
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
  }

  setLanguage(lang: string): void {
    this.currentLang = lang;
    this.languageService.setLanguage(lang);
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.updateScrollTopVisibility();
  }

  scrollTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private updateScrollTopVisibility(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const scrollPosition =
      window.pageYOffset ||
      (document.documentElement?.scrollTop ?? 0) ||
      (document.body?.scrollTop ?? 0) ||
      0;

    this.showScrollTop = scrollPosition > 120;
  }
}
