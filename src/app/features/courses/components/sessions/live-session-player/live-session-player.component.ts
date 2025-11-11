import { Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { SessionService } from 'src/app/core/services/session.service';
import { environment } from 'src/environments/environment';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

@Component({
  selector: 'app-live-session-player',
  templateUrl: './live-session-player.component.html',
  styleUrls: ['./live-session-player.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LiveSessionPlayerComponent implements OnInit, OnDestroy {
  @ViewChild('playerContainer', { static: true }) container!: ElementRef<HTMLDivElement>;

  courseId!: string;
  sessionId!: string;
  loading = true;
  error = '';
  private apiInstance: any;
  private statsSub?: Subscription;
  private secondsWatched = 0;
  private debugPrefix = '[LiveSessionPlayer]';

  constructor(
    private route: ActivatedRoute,
    private sessionService: SessionService,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('id') || '';
    this.sessionId = this.route.snapshot.paramMap.get('sid') || '';
    if (!this.sessionId) {
      this.error = 'Missing session id';
      this.loading = false;
      return;
    }

    // Ensure the container fits the viewport height from its position downwards
    this.resizeToViewport();

    this.sessionService.join(this.sessionId).subscribe({
      next: async (join) => {
        const domain = join.domain || environment.jitsiDomain;
        try {
          // Debug join response quickly without printing full JWT
          

          if (join?.jwt) {
            const payload = this.safeDecodeJwt(join.jwt);
            
            // Explicitly log the JWT for debugging (sensitive; remove in production)
            
            try { (window as any).jitsiMeetingToken = join.jwt; } catch {}
          } else {
            
          }

          await this.ensureJitsiScript(domain);
          this.initPlayer(domain, join.roomName, join.jwt, join.displayName, join.avatarUrl);
        } catch (e) {
          
          this.error = 'Failed to initialize player';
          this.loading = false;
          return;
        }
        this.loading = false;
        this.startStats();
      },
      error: () => {
        this.error = 'Failed to join session';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.stopStats();
    if (this.sessionId) {
      // Optional LEAVE event
      this.sessionService.event(this.sessionId, 'LEAVE').subscribe({ next: () => {}, error: () => {} });
    }
    if (this.apiInstance) {
      try { this.apiInstance.dispose?.(); } catch {}
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.resizeToViewport();
  }

  private resizeToViewport(): void {
    // Fill the viewport from the container's top edge to the bottom of the window
    try {
      if (!this.container) return;
      const top = this.container.nativeElement.getBoundingClientRect().top;
      const available = Math.max(window.innerHeight - top, 320);
      this.container.nativeElement.style.height = available + 'px';
      this.container.nativeElement.style.width = '100%';
    } catch {}
  }

  private async ensureJitsiScript(domain: string): Promise<void> {
    const url = `${location.protocol}//${domain}/external_api.js`;
    if ((window as any).JitsiMeetExternalAPI) return;
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load external_api.js'));
      document.head.appendChild(s);
    });
  }

  private initPlayer(domain: string, roomName: string, jwt?: string, displayName?: string, avatarUrl?: string) {
    const options: any = {
      roomName,
      parentNode: this.container.nativeElement,
      jwt,
      userInfo: { displayName, avatarUrl },
      width: '100%',
      height: '100%',
      // Ensure role from token is respected (server config must allow this)
      configOverwrite: {
        enableUserRolesBasedOnToken: true
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone','camera','desktop','fullscreen','chat','raisehand','hangup'
        ]
      }
    };
    // Debug options without leaking full token
    
    // Ensure we run embed outside Angular to avoid change detection churn
    this.zone.runOutsideAngular(() => {
      this.apiInstance = new window.JitsiMeetExternalAPI(domain, options);
      this.attachJitsiDebugListeners();
    });
  }

  private attachJitsiDebugListeners() {
    if (!this.apiInstance) return;
    const api = this.apiInstance;
    const log = (evt: string, data?: any) => {};

    try {
      api.addEventListener('videoConferenceJoined', (e: any) => log('videoConferenceJoined', e));
      api.addEventListener('videoConferenceLeft', (e: any) => log('videoConferenceLeft', e));
      api.addEventListener('participantJoined', (e: any) => log('participantJoined', e));
      api.addEventListener('participantLeft', (e: any) => log('participantLeft', e));
      api.addEventListener('participantRoleChanged', (e: any) => log('participantRoleChanged', e));
      // Some deployments expose these:
      try { api.addEventListener('moderationStatusChanged', (e: any) => log('moderationStatusChanged', e)); } catch {}
      try { api.addEventListener('knockingParticipant', (e: any) => log('knockingParticipant', e)); } catch {}
      try { api.addEventListener('audioMuteStatusChanged', (e: any) => log('audioMuteStatusChanged', e)); } catch {}
      try { api.addEventListener('videoMuteStatusChanged', (e: any) => log('videoMuteStatusChanged', e)); } catch {}
    } catch (err) {
      
    }
  }

  private safeDecodeJwt(token: string): any | undefined {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return undefined;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
      const json = atob(padded);
      return JSON.parse(json);
    } catch (e) {
      return undefined;
    }
  }

  private startStats(): void {
    // Count seconds watched and periodically send STATS
    const tick$ = interval(1000);
    this.statsSub = tick$.subscribe(() => {
      this.secondsWatched += 1;
      if (this.secondsWatched % 30 === 0) {
        this.sessionService.event(this.sessionId, 'STATS', this.secondsWatched).subscribe({ next: () => {}, error: () => {} });
      }
    });
  }

  private stopStats(): void {
    this.statsSub?.unsubscribe();
    this.statsSub = undefined;
  }
}
