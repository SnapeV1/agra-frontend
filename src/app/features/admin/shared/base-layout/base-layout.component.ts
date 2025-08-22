import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-base-layout',
  templateUrl: './base-layout.component.html',
  styleUrls: ['./base-layout.component.css']
})
export class BaseLayoutComponent implements OnInit, OnDestroy {
  isSidebarCollapsed = false;
  private subscription: Subscription = new Subscription();

  constructor(private sidebarService: SidebarService) {}

  ngOnInit() {
    this.subscription.add(
      this.sidebarService.isCollapsed$.subscribe(collapsed => {
        this.isSidebarCollapsed = collapsed;
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
