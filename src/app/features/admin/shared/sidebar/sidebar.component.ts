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
  isMobileOpen = false;
  activeMenuItem = 'dashboard';
  private subscription: Subscription = new Subscription();

  constructor(public sidebarService: SidebarService, private elementRef: ElementRef) {}

  ngOnInit() {
    this.subscription.add(
      this.sidebarService.isCollapsed$.subscribe(collapsed => {
        this.isCollapsed = !collapsed;
      })
    );

    this.subscription.add(
      this.sidebarService.isMobileOpen$.subscribe(mobileOpen => {
        this.isMobileOpen = mobileOpen;
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
    const toggleButton = document.querySelector('.mobile-sidebar-toggle');
    
    // Close mobile sidebar if clicking outside and not on toggle button
    if (this.isMobileOpen && sidebarElement && !sidebarElement.contains(clickedElement) && 
        toggleButton && !toggleButton.contains(clickedElement)) {
      this.sidebarService.closeMobile();
    }
  }

  onSidebarClick(event: MouseEvent): void {
    event.stopPropagation(); // Prevents document click when clicking inside sidebar
  }
}