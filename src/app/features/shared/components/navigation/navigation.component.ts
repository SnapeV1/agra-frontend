import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthUser } from 'src/app/core/models/auth-user.model';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { NotificationItem, NotificationType } from 'src/app/core/models/notification.model';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent implements OnInit, OnDestroy {
  isScrolled = false;
  isLoggedIn = false;
  activeSection = 'overview';
  isDropdownOpen = false;
  isMobileMenuOpen = false;
  isNotificationOpen = false;
  user: AuthUser | null = null;
  notifications: NotificationItem[] = [];
  unread = 0;
  readonly fallbackAvatar = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><rect width='80' height='80' fill='%23f3f4f6'/><circle cx='40' cy='32' r='18' fill='%23cbd5e1'/><path d='M12 72c4-14 16-22 28-22s24 8 28 22' fill='%23cbd5e1'/></svg>";

  private destroy$ = new Subject<void>();

  constructor(
    public router: Router,
    public authService: AuthService,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.subscribeToAuthState();
    this.checkTokenExpiration();
    // Initialize notifications only when authenticated
    if (this.authService.isAuthenticated()) {
      this.notificationService.fetchAll();
      this.notificationService.connect();
    }
    this.notificationService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => this.notifications = list);
    this.notificationService.unreadCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe(c => this.unread = c);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.pageYOffset > 20;
    this.updateActiveSection();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.user-menu');
    const notif = target.closest('.notif-menu');
    const mobileToggle = target.closest('.mobile-toggle');
    const mobileMenu = target.closest('.nav-menu');
    
    if (!dropdown && this.isDropdownOpen) {
      this.closeDropdown();
    }
    if (!notif && this.isNotificationOpen) {
      this.closeNotification();
    }
    
    if (!mobileToggle && !mobileMenu && this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  private subscribeToAuthState(): void {
    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuthenticated => {
        this.isLoggedIn = isAuthenticated;
        if (!isAuthenticated) this.user = null;
        // Connect or disconnect notifications based on auth state
        if (isAuthenticated) {
          this.notificationService.fetchAll();
          this.notificationService.connect();
        } else {
          this.notificationService.disconnect();
        }
      });

    this.authService.currentUser
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.user = user;
      });

    this.isLoggedIn = this.authService.isAuthenticated();
    this.user = this.authService.currentUserValue;
  }

  private checkTokenExpiration(): void {
    if (this.authService.isTokenExpiringSoon()) {
      
    }
  }

  getUserDisplayName(): string {
    if (this.user?.user?.name) {
      return this.user.user.name;
    }
    const email = this.getUserEmail();
    return email ? email.split('@')[0] : 'User';
  }

  getUserEmail(): string {
    return this.user?.user?.email || this.authService.getUserEmail() || '';
  }

  getUserRole(): string {
    return this.user?.user?.role || this.authService.getUserRole() || '';
  }

  getUserAvatar(): string {
    return this.user?.user?.picture || this.fallbackAvatar;
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'ADMIN';
  }

  isUser(): boolean {
    return this.getUserRole() === 'USER';
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) this.isNotificationOpen = false;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  toggleNotification(): void {
    this.isNotificationOpen = !this.isNotificationOpen;
    if (this.isNotificationOpen) this.isDropdownOpen = false;
  }

  closeNotification(): void {
    this.isNotificationOpen = false;
  }

  markAllNotificationsAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  openNotification(n: NotificationItem): void {
    this.notificationService.markAsRead(n.id);
    this.closeNotification();
    this.navigateForNotification(n);
  }

  clearAllNotifications(): void {
    this.notificationService.deleteAll();
    this.closeNotification();
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

  private navigateForNotification(notification: NotificationItem): void {
    if (!notification) return;

    const normalizedType = (typeof notification.type === 'string'
      ? notification.type.toUpperCase()
      : notification.type) as NotificationType;

    let commands: any[] = [];
    let extras: NavigationExtras | undefined;

    switch (normalizedType) {
      case NotificationType.TICKET:
        if (this.isAdmin()) {
          commands = ['/admin/tickets'];
        } else {
          commands = ['/settings'];
          extras = { fragment: 'tickets' };
        }
        break;
      case NotificationType.COURSE:
        commands = ['/courses'];
        break;
      case NotificationType.POST:
        commands = ['/feed'];
        break;
      case NotificationType.SESSION:
        commands = this.isAdmin() ? ['/admin/dashboard'] : ['/home'];
        break;
      case NotificationType.SYSTEM:
      default:
        commands = ['/home'];
        break;
    }

    if (commands.length) {
      this.router.navigate(commands, extras);
    }
  }

  navigateToProfile(): void {
    this.closeDropdown();
    this.router.navigate(['/user/profile']);
  }

  navigateToSettings(): void {
    this.closeDropdown();
    this.router.navigate(['/settings']);
  }

  navigateToDashboard(): void {
    this.closeDropdown();
    if (this.isAdmin()) {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/user/dashboard']);
    }
  }

  // New method for admin view navigation
  navigateToAdminView(): void {
    this.router.navigate(['/admin']);
  }

  login(): void {
    this.router.navigate(['/login']);
  }

  signOut(): void {
    this.closeDropdown();
    this.authService.logout();
  }

  onAvatarError(evt: Event): void {
    const img = evt?.target as HTMLImageElement;
    if (img) {
      if (img.src !== this.fallbackAvatar) {
        img.src = this.fallbackAvatar;
      }
      img.onerror = null;
    }
  }

  private updateActiveSection(): void {
    const sections = ['overview', 'features', 'technical', 'pricing', 'timeline'];
    const scrollPosition = window.pageYOffset + 100;

    for (const section of sections) {
      const element = document.getElementById(section);
      if (element) {
        const offsetTop = element.offsetTop;
        const offsetHeight = element.offsetHeight;

        if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
          this.activeSection = section;
          break;
        }
      }
    }
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -70;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;

      window.scrollTo({
        top: y,
        behavior: 'smooth'
      });
    }
    
    // Close mobile menu after navigation
    this.closeMobileMenu();
  }

  onNavLinkClick(): void {
    // Close mobile menu when any navigation link is clicked
    this.closeMobileMenu();
  }

  isSectionActive(sectionId: string): boolean {
    return this.activeSection === sectionId;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    const mobileMenu = document.querySelector('.nav-menu');
    const mobileToggle = document.querySelector('.mobile-toggle');
    const body = document.body;
    
    if (mobileMenu && mobileToggle) {
      mobileMenu.classList.toggle('mobile-active', this.isMobileMenuOpen);
      mobileToggle.classList.toggle('active', this.isMobileMenuOpen);
    }
    
    // Prevent body scroll when mobile menu is open
    if (this.isMobileMenuOpen) {
      body.classList.add('mobile-menu-open');
    } else {
      body.classList.remove('mobile-menu-open');
    }
    
    // Close dropdown if open
    if (this.isMobileMenuOpen && this.isDropdownOpen) {
      this.closeDropdown();
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    const mobileMenu = document.querySelector('.nav-menu');
    const mobileToggle = document.querySelector('.mobile-toggle');
    const body = document.body;
    
    if (mobileMenu && mobileToggle) {
      mobileMenu.classList.remove('mobile-active');
      mobileToggle.classList.remove('active');
    }
    
    // Remove body scroll prevention
    body.classList.remove('mobile-menu-open');
  }
}
