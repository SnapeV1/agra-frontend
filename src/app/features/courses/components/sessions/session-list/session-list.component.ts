import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SessionService } from 'src/app/core/services/session.service';
import { SessionModule } from 'src/app/core/models/session.module';

@Component({
  selector: 'app-session-list',
  templateUrl: './session-list.component.html',
  styleUrls: ['./session-list.component.css']
})
export class SessionListComponent implements OnInit, OnDestroy {
  courseId!: string;
  loading = false;
  error = '';
  sessions: SessionModule[] = [];
  private sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sessionService: SessionService
  ) {}

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.courseId) {
      this.error = 'Missing course id';
      return;
    }
    this.fetchSessions();
  }

  fetchSessions(): void {
    this.loading = true;
    this.sub = this.sessionService.upcoming(this.courseId).subscribe({
      next: (items) => {
        this.sessions = items || [];
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load sessions';
        this.loading = false;
      }
    });
  }

  join(sessionId?: string): void {
    if (!sessionId) return;
    this.router.navigate(['/courses', this.courseId, 'sessions', sessionId]);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}

