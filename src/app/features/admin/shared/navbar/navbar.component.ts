import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { SidebarService } from '../../services/sidebar.service';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

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
  @Input() userName: string = 'John Doe';
  @Input() userInitials: string = 'JD';
  @Input() userRole: string = 'Administrator';
  @Input() notificationCount: number = 3;
  @Input() isUserOnline: boolean = true;
  @Input() pageTitle: string = 'Dashboard';
  @Input() breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', route: '/dashboard' },
    { label: 'Dashboard' }
  ];

  @Output() search = new EventEmitter<string>();
  @Output() notificationClick = new EventEmitter<void>();
  @Output() profileClick = new EventEmitter<void>();
  @Output() settingsClick = new EventEmitter<void>();

  searchQuery: string = '';
  private routerSubscription: Subscription = new Subscription();

  constructor(
    private sidebarService: SidebarService,
    private router: Router
  ) {}

  ngOnInit() {
    this.routerSubscription = this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd)
      )
      .subscribe((event) => {
        this.updatePageInfo(event.url);
      });
  }

  ngOnDestroy() {
    this.routerSubscription.unsubscribe();
  }

  onToggleSidebar() {
    this.sidebarService.toggle();
  }

  onSearch() {
    if (this.searchQuery.trim()) {
      this.search.emit(this.searchQuery);
      console.log('Searching for:', this.searchQuery);
    }
  }

  onNotificationClick() {
    this.notificationClick.emit();
  }

  onProfileClick() {
    this.profileClick.emit();
  }

  onSettingsClick() {
    this.settingsClick.emit();
  }

  private updatePageInfo(url: string) {
    const routeTitleMap: { [key: string]: { title: string, breadcrumbs: BreadcrumbItem[] } } = {
      '/dashboard': {
        title: 'Dashboard',
        breadcrumbs: [{ label: 'Home', route: '/dashboard' }, { label: 'Dashboard' }]
      },
      '/users': {
        title: 'Users',
        breadcrumbs: [{ label: 'Home', route: '/dashboard' }, { label: 'Users' }]
      },
      '/orders': {
        title: 'Orders',
        breadcrumbs: [{ label: 'Home', route: '/dashboard' }, { label: 'Orders' }]
      },
      '/products': {
        title: 'Products',
        breadcrumbs: [{ label: 'Home', route: '/dashboard' }, { label: 'Products' }]
      },
      '/analytics': {
        title: 'Analytics',
        breadcrumbs: [{ label: 'Home', route: '/dashboard' }, { label: 'Analytics' }]
      },
      '/settings': {
        title: 'Settings',
        breadcrumbs: [{ label: 'Home', route: '/dashboard' }, { label: 'Settings' }]
      }
    };

    const routeInfo = routeTitleMap[url] || { title: 'Dashboard', breadcrumbs: [] };
    this.pageTitle = routeInfo.title;
    this.breadcrumbs = routeInfo.breadcrumbs;
  }
}