import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from './core/services/auth/auth.service';
import { PresenceService } from './core/services/presence.service';
import { LanguageService } from './core/services/language.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'agra-frontend';
  private routerSubscription: Subscription = new Subscription();
  isAdminRoute$!: Observable<boolean>;

  constructor(
    private router: Router,
    private authService: AuthService,
    private presenceService: PresenceService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    // Initialize language from storage so admin routes honor refreshes.
    this.languageService.setLanguage(this.languageService.current || 'en');
    this.isAdminRoute$ = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url.startsWith('/admin')),
      startWith(this.router.url.startsWith('/admin'))
    );

    // Apply persisted theme preference early
    try {
      const theme = localStorage.getItem('pref_theme');
      const root = document.documentElement;
      if (theme === 'dark') root.setAttribute('data-theme', 'dark');
      else if (theme === 'auto') {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) root.setAttribute('data-theme', 'dark');
        else root.removeAttribute('data-theme');
      } else {
        root.removeAttribute('data-theme');
      }
    } catch {}

    // Subscribe to router events and scroll to top on navigation end
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        // Scroll to top of the page
        window.scrollTo(0, 0);
        // Alternative method for better browser compatibility
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
      });

    // Start presence heartbeats when authenticated (no-op if logged out)
    this.presenceService.start();
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    this.presenceService.stop();
  }

  // Removed logout on beforeunload to avoid clearing auth on refresh.
}
