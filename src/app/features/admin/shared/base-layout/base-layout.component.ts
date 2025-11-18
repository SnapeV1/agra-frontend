import { Component } from '@angular/core';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-base-layout',
  templateUrl: './base-layout.component.html',
  styleUrls: ['./base-layout.component.css']
})
export class BaseLayoutComponent {
  constructor(public sidebarService: SidebarService) {}

  onMainClick(): void {
    try {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        this.sidebarService.closeMobile();
      } else {
        this.sidebarService.collapse();
      }
    } catch {
      // no-op
    }
  }
}
