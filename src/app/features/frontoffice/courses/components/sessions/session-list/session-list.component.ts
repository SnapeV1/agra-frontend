import { Component, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LiveSessionLauncherService } from 'src/app/core/services/live-session-launcher.service';
import { SessionService } from 'src/app/core/services/session.service';
import { SessionModule } from 'src/app/core/models/session.model';

@Component({
  selector: 'app-session-list',
  templateUrl: './session-list.component.html',
  styleUrls: ['./session-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SessionListComponent implements OnInit, OnDestroy {
  courseId!: string;
  loading = false;
  error = '';
  sessions: SessionModule[] = [];
  filteredSessions: SessionModule[] = [];
  filter = '';
  sort: 'startAsc' | 'startDesc' | 'title' = 'startAsc';
  private sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sessionService: SessionService,
    private liveSessionLauncher: LiveSessionLauncherService
  ) {}

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.courseId) {
      this.error = 'Missing course id';
      return;
    }
    const qp = this.route.snapshot.queryParamMap;
    this.filter = qp.get('q') || '';
    const sort = (qp.get('sort') as any) || 'startAsc';
    if (sort === 'startDesc' || sort === 'title' || sort === 'startAsc') {
      this.sort = sort;
    }
    this.fetchSessions();
  }

  fetchSessions(): void {
    this.loading = true;
    this.sub = this.sessionService.upcoming(this.courseId).subscribe({
      next: (items) => {
        this.sessions = items || [];
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load sessions';
        this.loading = false;
      }
    });
  }

  onFilterChange(value: string): void {
    this.filter = value;
    this.updateQueryParams();
    this.applyFilters();
  }

  onSortChange(value: string): void {
    if (value === 'startAsc' || value === 'startDesc' || value === 'title') {
      this.sort = value;
      this.updateQueryParams();
      this.applyFilters();
    }
  }

  private updateQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: this.filter || undefined, sort: this.sort },
      queryParamsHandling: 'merge'
    });
  }

  private applyFilters(): void {
    const term = (this.filter || '').toLowerCase();
    const base = term
      ? this.sessions.filter(s => (s.title || '').toLowerCase().includes(term) || (s.description || '').toLowerCase().includes(term))
      : [...this.sessions];
    const sorted = base.sort((a, b) => {
      if (this.sort === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      const aTime = a.startTime ? Date.parse(a.startTime) : 0;
      const bTime = b.startTime ? Date.parse(b.startTime) : 0;
      return this.sort === 'startAsc' ? aTime - bTime : bTime - aTime;
    });
    this.filteredSessions = sorted;
  }

  join(sessionId?: string): void {
    if (!sessionId) return;
    this.liveSessionLauncher.launch(sessionId).subscribe({
      next: (res) => {
        if (res?.blocked) {
          console.warn('[SessionList] popup blocked when joining session', res.targetUrl);
        }
      },
      error: (err) => console.error('[SessionList] join session failed', err)
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  trackById(index: number, item: SessionModule): string | number | undefined {
    return item.id || index;
  }
}
