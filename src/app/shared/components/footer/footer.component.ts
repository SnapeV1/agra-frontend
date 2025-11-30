import { Component, HostListener, OnInit } from '@angular/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {
  year = new Date().getFullYear();
  showScrollTop = false;

  ngOnInit(): void {
    this.updateScrollTopVisibility();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.updateScrollTopVisibility();
  }

  scrollTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private updateScrollTopVisibility(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const scrollPosition =
      window.pageYOffset ||
      (document.documentElement?.scrollTop ?? 0) ||
      (document.body?.scrollTop ?? 0) ||
      0;

    this.showScrollTop = scrollPosition > 120;
  }
}
