import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  isCollapsed = false;
  isMobileOpen = false;
  activeMenuItem = 'dashboard';
  private subscription: Subscription = new Subscription();

  constructor(
    public sidebarService: SidebarService,
    private elementRef: ElementRef,
    private router: Router
  ) {}

  ngOnInit() {
    this.subscription.add(
      this.sidebarService.isCollapsed$.subscribe(collapsed => {
        // Reflect actual collapsed state from service (true => collapsed)
        this.isCollapsed = collapsed;
      })
    );

    this.subscription.add(
      this.sidebarService.isMobileOpen$.subscribe(mobileOpen => {
        this.isMobileOpen = mobileOpen;
      })
    );

    // Initialize active item based on current URL and keep in sync on navigation
    this.updateActiveFromUrl(this.router.url || '');
    this.subscription.add(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(evt => this.updateActiveFromUrl(evt.urlAfterRedirects || evt.url))
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  toggleSidebar() {
    this.sidebarService.toggle();
  }

  setActiveMenuItem(itemId: string) {
    this.activeMenuItem = itemId;
  }

  onHeaderToggle(): void {
    try {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) this.sidebarService.toggleMobile();
      else this.sidebarService.toggle();
    } catch {
      this.sidebarService.toggle();
    }
  }

  private updateActiveFromUrl(url: string) {
    if (!url) return;
    if (url.includes('/admin/users')) this.activeMenuItem = 'users';
    else if (url.includes('/admin/posts')) this.activeMenuItem = 'posts';
    else if (url.includes('/admin/courses')) this.activeMenuItem = 'courses';
    else if (url.includes('/admin/dashboard') || url === '/admin' || url.startsWith('/admin/')) this.activeMenuItem = 'dashboard';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const clickedElement = event.target as HTMLElement;
    const sidebarElement = this.elementRef.nativeElement.querySelector('.sidebar');
    const toggleButton = document.querySelector('.mobile-sidebar-toggle');
    
    // Close mobile sidebar if clicking outside and not on toggle button
    if (this.isMobileOpen && sidebarElement && !sidebarElement.contains(clickedElement) && 
        toggleButton && !toggleButton.contains(clickedElement)) {
      this.sidebarService.closeMobile();
    }
  }

  onSidebarClick(event: MouseEvent): void {
    // Prevent outside handlers; do not auto-toggle here to avoid
    // accidental expand/collapse during navigation
    event.stopPropagation();
  }
}
