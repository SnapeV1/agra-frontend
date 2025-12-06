import { Injectable } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SessionService } from './session.service';

export interface LaunchResult {
  targetUrl: string;
  opened: boolean;
  blocked: boolean;
  usedNewTab: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LiveSessionLauncherService {
  private debugPrefix = '[LiveSessionLauncher]';

  constructor(private sessionService: SessionService) {}

  launch(sessionId: string, opts?: { openInNewTab?: boolean }): Observable<LaunchResult> {
    if (!sessionId) {
      return throwError(() => new Error('Missing session id'));
    }
    const openInNewTab = opts?.openInNewTab !== false;

    return this.sessionService.join(sessionId).pipe(
      map((join) => {
        const domainInfo = this.normalizeDomain(join?.domain || environment.jitsiDomain);
        const roomName = join?.roomName || sessionId;

        if (!roomName) {
          throw new Error('Missing room name from join response');
        }

        const targetUrl = this.buildJoinUrl(domainInfo, roomName, join?.jwt, join?.displayName, join?.avatarUrl);
        console.log(`${this.debugPrefix} launch`, { sessionId, domainInfo, targetUrl });

        if (!openInNewTab) {
          return { targetUrl, opened: false, blocked: false, usedNewTab: false };
        }

        const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
        const opened = !!win && !win.closed;
        if (opened) {
          win.focus?.();
        }
        return { targetUrl, opened, blocked: !opened, usedNewTab: true };
      })
    );
  }

  private normalizeDomain(raw: string): { scriptOrigin: string; apiHost: string; protocol: 'http' | 'https' } {
    const fallback = environment.jitsiDomain || 'https://meet.jitsi:8443';
    const input = (raw || fallback || '').trim();
    const preferredProtocol = 'https';
    const preferredPort = '8443';
    const withProtocol = input.match(/^https?:\/\//i) ? input : `${preferredProtocol}://${input}`;

    try {
      const url = new URL(withProtocol);
      // Force https and port 8443 to match docker setup
      url.protocol = 'https:';
      if (!url.port || url.port !== preferredPort) {
        url.port = preferredPort;
      }
      const scriptOrigin = `${url.protocol}//${url.host}`;
      return {
        scriptOrigin,
        apiHost: url.host,
        protocol: 'https'
      };
    } catch (err) {
      console.error(`${this.debugPrefix} normalizeDomain failed, falling back`, err);
      const fallbackUrl = new URL(fallback.startsWith('http') ? fallback : `https://${fallback}`);
      fallbackUrl.protocol = 'https:';
      if (!fallbackUrl.port || fallbackUrl.port !== preferredPort) {
        fallbackUrl.port = preferredPort;
      }
      const scriptOrigin = `${fallbackUrl.protocol}//${fallbackUrl.host}`;
      return {
        scriptOrigin,
        apiHost: fallbackUrl.host,
        protocol: 'https'
      };
    }
  }

  private buildJoinUrl(
    domainInfo: { scriptOrigin: string; apiHost: string; protocol: 'http' | 'https' },
    roomName: string,
    jwt?: string,
    displayName?: string,
    avatarUrl?: string
  ): string {
    const base = domainInfo.scriptOrigin || `${domainInfo.protocol}://${domainInfo.apiHost}`;
    const url = `${base.replace(/\/+$/, '')}/${roomName}`;
    const query = jwt ? `?jwt=${encodeURIComponent(jwt)}` : '';
    const wsScheme = domainInfo.protocol === 'https' ? 'wss' : 'ws';
    const wsUrl = `${wsScheme}://${domainInfo.apiHost}/xmpp-websocket`;
    const hashParts: string[] = [];
    hashParts.push(`config=${encodeURIComponent(JSON.stringify({ websocket: wsUrl, serviceUrl: wsUrl }))}`);

    const userInfo: Record<string, string> = {};
    if (displayName) userInfo['displayName'] = displayName;
    if (avatarUrl) userInfo['avatarUrl'] = avatarUrl;
    if (Object.keys(userInfo).length) {
      hashParts.push(`userInfo=${encodeURIComponent(JSON.stringify(userInfo))}`);
    }
    const hash = hashParts.length ? `#${hashParts.join('&')}` : '';
    console.log(`${this.debugPrefix} buildJoinUrl parts`, { base, url, query, hashParts });
    return `${url}${query}${hash}`;
  }
}
