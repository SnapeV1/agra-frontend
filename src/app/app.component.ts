import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/services/auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'agra-frontend';
  private routerSubscription: Subscription = new Subscription();

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
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
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  // Removed logout on beforeunload to avoid clearing auth on refresh.
}
