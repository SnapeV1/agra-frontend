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
import { NotificationService } from 'src/app/core/services/notification.service';
import { CourseService } from 'src/app/core/services/course/course.service';
import { NotificationItem, NotificationType } from 'src/app/core/models/notification.model';
import { filter } from 'rxjs/operators';
import { AuthUser } from 'src/app/core/models/auth-user.model';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { SidebarService } from '../../services/sidebar.service';

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
  notificationCount: number = 0;
  notifications: NotificationItem[] = [];
  isNotifOpen = false;
  pageTitle: string = 'Dashboard';
  breadcrumbs: BreadcrumbItem[] = [];
  searchQuery: string = '';
  isDropdownOpen = false;
  isSearchOpen = false;
  searchItems: { label: string; route: string; icon?: string }[] = [
    { label: 'Dashboard', route: '/admin/dashboard', icon: 'dashboard' },
    { label: 'Users', route: '/admin/users', icon: 'group' },
    { label: 'Posts', route: '/admin/posts', icon: 'article' },
    { label: 'Courses', route: '/admin/courses', icon: 'school' },
    { label: 'Tickets', route: '/admin/tickets', icon: 'confirmation_number' },
    { label: 'Certificates', route: '/admin/certificates', icon: 'verified' },
    { label: 'Settings', route: '/admin/settings', icon: 'settings' },
  ];
  filteredSearch: { label: string; route: string; icon?: string }[] = [];
  activeSearchIndex = 0;

  @Output() search = new EventEmitter<string>();
  @Output() notificationClick = new EventEmitter<void>();
  @Output() profileClick = new EventEmitter<void>();
  @Output() settingsClick = new EventEmitter<void>();

  private routerSubscription!: Subscription;
  private userSubscription!: Subscription;
  private notifSubs: Subscription[] = [];

  constructor(
    private router: Router,
    private authService: AuthService,
    private eRef: ElementRef,
    private notificationService: NotificationService,
    private courseService: CourseService,
    public sidebarService: SidebarService
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

    // Initialize notifications: fetch unseen from DB and connect to WS
    this.notificationService.fetchAll();
    this.notificationService.connect();
    this.notifSubs.push(
      this.notificationService.getAll().subscribe(list => (this.notifications = list))
    );
    this.notifSubs.push(
      this.notificationService.unreadCount().subscribe(count => (this.notificationCount = count))
    );

    this.filteredSearch = [...this.searchItems];
  }

  ngOnDestroy() {
    if (this.routerSubscription) this.routerSubscription.unsubscribe();
    if (this.userSubscription) this.userSubscription.unsubscribe();
    this.notifSubs.forEach(s => s.unsubscribe());
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

  /** Get user's avatar picture */
  get userAvatar(): string | null {
    const pic = this.user?.user?.picture;
    return pic && pic.trim().length ? pic : null;
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
    if (!this.searchQuery.trim()) return;
    const item = this.filteredSearch[this.activeSearchIndex] || this.filteredSearch[0];
    if (item) {
      this.router.navigate([item.route]);
    }
    this.search.emit(this.searchQuery);
    this.closeSearch();
  }

  /** Handle search on Enter key */
  onSearchKeyup(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.onSearch();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeSearchIndex = Math.min(this.activeSearchIndex + 1, Math.max(this.filteredSearch.length - 1, 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeSearchIndex = Math.max(this.activeSearchIndex - 1, 0);
    } else if (event.key === 'Escape') {
      this.closeSearch();
    } else {
      this.updateSearch();
    }
  }

  onSearchFocus(): void {
    this.isSearchOpen = true;
    this.updateSearch();
  }

  onSearchBlur(): void {
    setTimeout(() => this.closeSearch(), 120);
  }

  updateSearch(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredSearch = [...this.searchItems];
      this.activeSearchIndex = 0;
      return;
    }
    this.filteredSearch = this.searchItems.filter(item =>
      item.label.toLowerCase().includes(q) || item.route.toLowerCase().includes(q)
    );
    this.activeSearchIndex = 0;
  }

  selectSearch(item: { label: string; route: string }): void {
    this.router.navigate([item.route]);
    this.search.emit(item.label);
    this.closeSearch();
  }

  private closeSearch(): void {
    this.isSearchOpen = false;
  }

  /** Toggle dropdown menu */
  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  /** Toggle mobile sidebar */
  toggleMobileSidebar(): void {
    this.sidebarService.toggleMobile();
  }

  /** Handle notifications click */
  onNotificationClick() {
    this.notificationClick.emit();
  }

  /** Toggle notifications dropdown */
  toggleNotif(): void {
    this.isNotifOpen = !this.isNotifOpen;
    if (this.isNotifOpen) this.isDropdownOpen = false;
  }

  /** Close notifications dropdown */
  closeNotif(): void {
    this.isNotifOpen = false;
  }

  /** Mark all notifications as read */
  markAllNotificationsAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  /** Open a notification: mark it read */
  openNotification(n: NotificationItem): void {
    this.notificationService.markAsRead(n.id);
    this.closeNotif();
  }

  /** Delete all notifications */
  deleteAllNotifications(): void {
    this.notificationService.deleteAll();
    this.closeNotif();
  }

  formatNotificationType(type?: NotificationType | string | null): string {
    if (!type) return 'General';
    const normalized = typeof type === 'string'
      ? type.toUpperCase()
      : type;
    switch (normalized) {
      case NotificationType.TICKET:
        return 'Ticket';
      case NotificationType.COURSE:
        return 'Course';
      case NotificationType.POST:
        return 'Social';
      case NotificationType.SESSION:
        return 'Session';
      case NotificationType.SYSTEM:
        return 'System';
      default:
        return normalized.charAt(0) + normalized.slice(1).toLowerCase();
    }
  }

  /** Handle settings click */
  onSettingsClick() {
    this.navigateToSettings();
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

  /** Navigate to settings */
  navigateToSettings() {
    this.router.navigate(['/admin/settings']);
  }

  /** Logout user */
  logout() {
    this.authService.logout();
    this.isDropdownOpen = false;
  }

  /** Update breadcrumbs dynamically */
  private updatePageInfo(url: string) {
    const parts = url.split('/').filter(Boolean);

    // Default title
    this.pageTitle = parts.length > 0
      ? parts[parts.length - 1].replace(/-/g, ' ').toUpperCase()
      : 'Dashboard';

    // Special handling for Admin section breadcrumbs
    if (parts[0] === 'admin') {
      // Handle course details route: /admin/coursedetails/:id
      if (parts[1] === 'coursedetails' && parts.length >= 3) {
        const courseId = parts[2];
        // Build breadcrumbs: Admin -> Courses -> <Course Title>
        this.breadcrumbs = [
          { label: 'Admin', route: '/admin/dashboard' },
          { label: 'Courses', route: '/admin/courses' },
          { label: courseId } // Placeholder replaced after fetch
        ];

        // Try to fetch course title for last crumb + page title
        this.courseService.getCourseById(courseId).subscribe({
          next: (course) => {
            const title = course?.title?.trim();
            if (title) {
              this.breadcrumbs[this.breadcrumbs.length - 1] = { label: title };
              this.pageTitle = title.toUpperCase();
            }
          },
          error: () => {
            // Leave ID as fallback label
          }
        });
        return;
      }

      // Generic admin crumbs: first points to dashboard
      const crumbs: BreadcrumbItem[] = [{ label: 'Admin', route: '/admin/dashboard' }];
      // Append the rest segments in order, mapping names/links sensibly
      for (let i = 1; i < parts.length; i++) {
        const seg = parts[i];
        if (seg === 'courses') {
          crumbs.push({ label: 'Courses', route: '/admin/courses' });
        } else {
          const label = seg.charAt(0).toUpperCase() + seg.slice(1);
          crumbs.push({ label, route: '/' + parts.slice(0, i + 1).join('/') });
        }
      }
      this.breadcrumbs = crumbs;
      // Adjust title for known segments
      const last = parts[parts.length - 1];
      if (last === 'courses') this.pageTitle = 'COURSES';
      return;
    }

    // Fallback: non-admin pages default behavior
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
    if (this.isNotifOpen && !this.eRef.nativeElement.contains(event.target)) {
      this.isNotifOpen = false;
    }
  }
}

