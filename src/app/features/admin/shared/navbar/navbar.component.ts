import { Component, Input } from '@angular/core';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  @Input() userName: string = 'John Doe';
  @Input() userInitials: string = 'JD';
  @Input() notificationCount: number = 3;
  
  searchQuery: string = '';

  constructor(private sidebarService: SidebarService) {}

  onToggleSidebar() {
    this.sidebarService.toggle();
  }

  onSearch() {
    if (this.searchQuery.trim()) {
      console.log('Searching for:', this.searchQuery);
    }
  }

  onNotificationClick() {
    console.log('Opening notifications');
  }

  onProfileClick() {
    console.log('Opening profile menu');
  }
}