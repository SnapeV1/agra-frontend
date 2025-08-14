import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  isCollapsed = false;
  activeMenuItem = 'dashboard';
  private subscription: Subscription = new Subscription();

  menuItems = [
    { id: 'dashboard', icon: 'fas fa-home', text: 'Dashboard', route: '/dashboard' },
    { id: 'users', icon: 'fas fa-users', text: 'Users', route: '/users' },
    { id: 'orders', icon: 'fas fa-shopping-cart', text: 'Orders', route: '/orders' },
    { id: 'products', icon: 'fas fa-box', text: 'Products', route: '/products' },
    { id: 'analytics', icon: 'fas fa-chart-bar', text: 'Analytics', route: '/analytics' },
    { id: 'settings', icon: 'fas fa-cog', text: 'Settings', route: '/settings' }
  ];

  constructor(private sidebarService: SidebarService,private elementRef: ElementRef) {}

  ngOnInit() {
    this.subscription.add(
      this.sidebarService.isCollapsed$.subscribe(collapsed => {
        this.isCollapsed = !collapsed;
      })
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
  @HostListener('document:click', ['$event'])
onDocumentClick(event: MouseEvent): void {
  const clickedElement = event.target as HTMLElement;
  const sidebarElement = this.elementRef.nativeElement.querySelector('.sidebar');
  
  // Only collapse if sidebar is expanded and click is outside
  if (!this.isCollapsed && sidebarElement && !sidebarElement.contains(clickedElement)) {
    this.isCollapsed = true;
  }
}
onSidebarClick(event: MouseEvent): void {
  event.stopPropagation(); // Prevents document click when clicking inside sidebar
}
}