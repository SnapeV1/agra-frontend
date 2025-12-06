import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LiveSessionLauncherService } from 'src/app/core/services/live-session-launcher.service';

@Component({
  selector: 'app-live-session-player',
  templateUrl: './live-session-player.component.html',
  styleUrls: ['./live-session-player.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LiveSessionPlayerComponent implements OnInit {
  courseId!: string;
  sessionId!: string;
  loading = true;
  error = '';
  info = '';
  joinUrl: string | null = null;
  private debugPrefix = '[LiveSessionPlayer]';

  constructor(
    private route: ActivatedRoute,
    private liveSessionLauncher: LiveSessionLauncherService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('id') || '';
    this.sessionId = this.route.snapshot.paramMap.get('sid') || '';
    if (!this.sessionId) {
      this.error = 'Missing session id';
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    this.liveSessionLauncher.launch(this.sessionId).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.blocked) {
          this.error = 'Popup was blocked. Click the button below to open the live session.';
          this.joinUrl = res.targetUrl;
        } else {
          this.info = 'Live session opened in a new tab. If not, use the button below.';
          this.joinUrl = res?.targetUrl || null;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error(`${this.debugPrefix} join failed`, err);
        this.error = err?.message || 'Failed to join session';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  openJoinUrl(): void {
    if (!this.joinUrl) return;
    window.open(this.joinUrl, '_blank', 'noopener,noreferrer');
  }
}
