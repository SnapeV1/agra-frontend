import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { environment } from 'src/environments/environment';

declare const google: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  isLoading = false;
  email = '';
  password = '';
  showPassword = false;
  errorMessage: string | null = null;

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.initGoogleButton();
  }

  private initGoogleButton() {
    this.isLoading = true;
    this.loadGoogleScript()
      .then(() => {
        if (!environment.googleClientId) {
          alert('Missing Google Client ID.');
          this.isLoading = false;
          return;
        }
        google.accounts.id.initialize({
          client_id: environment.googleClientId,
          // Avoid auto-using FedCM prompt; only on explicit user action
          use_fedcm_for_prompt: false,
          callback: (response: any) => {
            const idToken = response?.credential;
            if (!idToken) {
              this.isLoading = false;
              alert('No credential returned by Google.');
              return;
            }
            try {
              const claims = this.decodeJwt(idToken);
              if (claims) {
                const { sub, email, name, picture } = claims as any;
                console.log('[Google][Login] ID token claims', { sub, email, name, picture });
              }
            } catch {}
            this.authService.loginWithGoogleIdToken(idToken);
            this.isLoading = false;
          }
        });

        const btnContainer = document.getElementById('gsi-button');
        if (btnContainer && btnContainer.childElementCount === 0) {
          google.accounts.id.renderButton(btnContainer, {
            type: 'standard',
            theme: 'white',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            logo_alignment: 'left',
            width: 360
          });
        }
        this.isLoading = false;
      })
      .catch(() => {
        this.isLoading = false;
      });
  }

  onGooglePrompt() {
    try {
      google.accounts.id.prompt((notification: any) => {
        // Gracefully handle cases where prompt is not shown or skipped
        const notDisplayed = notification?.isNotDisplayed?.() ?? false;
        const skipped = notification?.isSkippedMoment?.() ?? false;
        if (notDisplayed || skipped) {
          const reason = notification?.getNotDisplayedReason?.() || notification?.getSkippedReason?.() || 'unknown';
          console.info('[Google][Login] Prompt not shown/skipped:', { notDisplayed, skipped, reason });
        }
      });
    } catch {
      // Swallow errors to avoid noisy console when environment blocks FedCM
    }
  }

  onLogin() {
    if (this.isLoading) return;
    this.errorMessage = null;
    const email = (this.email || '').trim();
    const password = this.password || '';
    if (!email || !password) {
      this.errorMessage = 'Email and password are required.';
      return;
    }

    this.isLoading = true;
    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Invalid email or password.';
      }
    });
  }

  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).google && (window as any).google.accounts) {
        resolve();
        return;
      }
      const id = 'google-identity-services';
      const existing = document.getElementById(id) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject());
        return;
      }
      const script = document.createElement('script');
      script.id = id;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.head.appendChild(script);
    });
  }

  private decodeJwt(token: string): any | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }
}
