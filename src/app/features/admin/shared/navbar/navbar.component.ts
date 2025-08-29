import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  HostListener,
  ElementRef
} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthUser } from 'src/app/features/auth/models/auth-user.model';
import { AuthService } from 'src/app/services/auth/auth.service';

export interface BreadcrumbItem {
  label: string;
  route?: string;
}

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  user: AuthUser | null = null;
  notificationCount: number = 3;
  pageTitle: string = 'Dashboard';
  breadcrumbs: BreadcrumbItem[] = [];
  searchQuery: string = '';
  isDropdownOpen = false;

  @Output() search = new EventEmitter<string>();
  @Output() notificationClick = new EventEmitter<void>();
  @Output() profileClick = new EventEmitter<void>();
  @Output() settingsClick = new EventEmitter<void>();

  private routerSubscription!: Subscription;
  private userSubscription!: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private eRef: ElementRef
  ) {}

  ngOnInit() {
    // Subscribe to user updates
    this.userSubscription = this.authService.currentUser.subscribe((user) => {
      this.user = user;
    });

    // Update breadcrumbs on navigation
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.updatePageInfo(event.url));
    
    // Initialize page info for current route
    this.updatePageInfo(this.router.url);
  }

  ngOnDestroy() {
    if (this.routerSubscription) this.routerSubscription.unsubscribe();
    if (this.userSubscription) this.userSubscription.unsubscribe();
  }

  /** Get user's name */
  get userName(): string {
    return this.user?.user?.name || 'Guest';
  }

  /** Get user's email */
  get userEmail(): string {
    return this.user?.user?.email || '';
  }

  /** Get user's role */
  get userRole(): string {
    return this.user?.user?.role || 'User';
  }

  /** Generate initials for avatar */
  get userInitials(): string {
    const name = this.user?.user?.name || '';
    if (!name.trim()) return 'G';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  /** Handle search input */
  onSearch() {
    if (this.searchQuery.trim()) {
      this.search.emit(this.searchQuery);
    }
  }

  /** Handle search on Enter key */
  onSearchKeyup(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.onSearch();
    }
  }

  /** Toggle dropdown menu */
  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  /** Handle notifications click */
  onNotificationClick() {
    this.notificationClick.emit();
  }

  /** Handle settings click */
  onSettingsClick() {
    this.settingsClick.emit();
  }

  /** Handle profile click */
  onProfileClick() {
    this.profileClick.emit();
    this.toggleDropdown();
  }

  /** Navigate to home/user view */
  navigateToHome() {
    this.router.navigate(['/home']);
  }

  /** Logout user */
  logout() {
    this.authService.logout();
    this.isDropdownOpen = false;
  }

  /** Update breadcrumbs dynamically */
  private updatePageInfo(url: string) {
    const parts = url.split('/').filter(Boolean);
    this.pageTitle =
      parts.length > 0
        ? parts[parts.length - 1].replace(/-/g, ' ').toUpperCase()
        : 'Dashboard';
    this.breadcrumbs = parts.map((part, index) => ({
      label: part.charAt(0).toUpperCase() + part.slice(1),
      route: '/' + parts.slice(0, index + 1).join('/')
    }));
  }

  /** Handle clicks outside dropdown to close it */
  @HostListener('document:click', ['$event'])
  clickOutside(event: MouseEvent) {
    if (this.isDropdownOpen && !this.eRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }
}