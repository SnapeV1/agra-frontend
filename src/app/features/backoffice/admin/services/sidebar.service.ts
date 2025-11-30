import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private readonly COLLAPSE_KEY = 'admin_sidebar_collapsed';
  private isCollapsedSubject: BehaviorSubject<boolean>;
  private isMobileOpenSubject = new BehaviorSubject<boolean>(false);
  
  public isCollapsed$!: Observable<boolean>;
  public isMobileOpen$!: Observable<boolean>;

  constructor() {
    const stored = this.readStoredCollapse();
    this.isCollapsedSubject = new BehaviorSubject<boolean>(stored ?? true);
    this.isCollapsed$ = this.isCollapsedSubject.asObservable();
    this.isMobileOpen$ = this.isMobileOpenSubject.asObservable();
    // Check initial screen size without forcing collapse on desktop
    this.checkScreenSize(true);
    // Listen for window resize
    window.addEventListener('resize', () => this.checkScreenSize());
  }

  toggle(): void {
    const next = !this.isCollapsedSubject.value;
    this.isCollapsedSubject.next(next);
    this.storeCollapse(next);
  }

  collapse(): void {
    this.isCollapsedSubject.next(true);
    this.storeCollapse(true);
  }

  expand(): void {
    this.isCollapsedSubject.next(false);
    this.storeCollapse(false);
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

  private checkScreenSize(initial = false): void {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile && this.isMobileOpenSubject.value) {
      this.isMobileOpenSubject.next(false);
    }
    // Do not auto-collapse/expand on init to avoid flicker
  }

  private storeCollapse(value: boolean): void {
    try {
      localStorage.setItem(this.COLLAPSE_KEY, JSON.stringify(value));
    } catch {}
  }

  private readStoredCollapse(): boolean | null {
    try {
      const raw = localStorage.getItem(this.COLLAPSE_KEY);
      if (raw === null) return null;
      return JSON.parse(raw) === true ? true : false;
    } catch {
      return null;
    }
  }
}
