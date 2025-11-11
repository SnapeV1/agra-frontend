import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  // Start collapsed by default
  private isCollapsedSubject = new BehaviorSubject<boolean>(true);
  private isMobileOpenSubject = new BehaviorSubject<boolean>(false);
  
  public isCollapsed$: Observable<boolean> = this.isCollapsedSubject.asObservable();
  public isMobileOpen$: Observable<boolean> = this.isMobileOpenSubject.asObservable();

  constructor() {
    // Check initial screen size
    this.checkScreenSize();
    // Listen for window resize
    window.addEventListener('resize', () => this.checkScreenSize());
  }

  toggle(): void {
    this.isCollapsedSubject.next(!this.isCollapsedSubject.value);
  }

  collapse(): void {
    this.isCollapsedSubject.next(true);
  }

  expand(): void {
    this.isCollapsedSubject.next(false);
  }

  toggleMobile(): void {
    this.isMobileOpenSubject.next(!this.isMobileOpenSubject.value);
  }

  closeMobile(): void {
    this.isMobileOpenSubject.next(false);
  }

  openMobile(): void {
    this.isMobileOpenSubject.next(true);
  }

  getCurrentState(): boolean {
    return this.isCollapsedSubject.value;
  }

  getMobileState(): boolean {
    return this.isMobileOpenSubject.value;
  }

  private checkScreenSize(): void {
    const isMobile = window.innerWidth <= 768;
    // Close mobile sidebar when switching to desktop
    if (!isMobile && this.isMobileOpenSubject.value) {
      this.isMobileOpenSubject.next(false);
    }
  }
}
