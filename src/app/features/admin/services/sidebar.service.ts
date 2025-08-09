import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private isCollapsedSubject = new BehaviorSubject<boolean>(false);
  public isCollapsed$: Observable<boolean> = this.isCollapsedSubject.asObservable();

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

  getCurrentState(): boolean {
    return this.isCollapsedSubject.value;
  }

  private checkScreenSize(): void {
    const shouldCollapse = window.innerWidth <= 768;
    if (shouldCollapse !== this.isCollapsedSubject.value) {
      this.isCollapsedSubject.next(shouldCollapse);
    }
  }
}