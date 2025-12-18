import { Component } from '@angular/core';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { ProfileService } from 'src/app/core/services/profile/profile.service';
import { LanguageService } from 'src/app/core/services/language.service';

interface TogglePref {
  key: string;
  label: string;
  hint: string;
  enabled: boolean;
}

interface AdminControlsState {
  maintenanceEnabled: boolean;
  newsSchedule: '15m' | '30m' | '60m' | '120m';
  twoFactorEnabled: boolean;
  email?: string;
}

@Component({
  selector: 'app-admin-settings',
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.css']
})
export class AdminSettingsComponent {
theme: 'light' | 'dark' = (() => {
    const stored = localStorage.getItem('pref_theme');
    if (stored === 'dark' || stored === 'light') return stored as 'light' | 'dark';
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = prefersDark ? 'dark' : 'light';
    try { localStorage.setItem('pref_theme', resolved); } catch {}
    return resolved as 'light' | 'dark';
  })();
  notificationToggles: TogglePref[] = [
    { key: 'system', label: 'System alerts', hint: 'Platform health and uptime notices', enabled: true },
    { key: 'posts', label: 'Post activity', hint: 'New reports or flagged posts', enabled: true },
    { key: 'courses', label: 'Course updates', hint: 'Course publishing and approvals', enabled: true },
    { key: 'users', label: 'User lifecycle', hint: 'Invites, deactivations, and roles', enabled: true }
  ];
  savingPrefs = false;
  prefsMessage = '';
  prefsError = '';
  maintenanceEnabled = false;
  newsSchedule: AdminControlsState['newsSchedule'] = '60m';
  twoFactorEnabled = false;
  email = '';
  password = '';
  settingsMessage = '';
  settingsError = '';
  fetchNowMessage = '';
  // Security inputs/messages
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  newEmail = '';
  confirmEmail = '';
  emailPassword = '';
  twoFactorPassword = '';
  pwMessage = '';
  pwError = '';
  emailMessage = '';
  emailError = '';
  twoFactorMessage = '';
  twoFactorError = '';
  showEmailForm = false;
  showPasswordForm = false;
  notificationsCollapsed = false;
  twoFactorCollapsed = false;
  language = localStorage.getItem('pref_lang') || 'en';

  constructor(
    private auth: AuthService,
    private profileService: ProfileService,
    private languageService: LanguageService
  ) {
 
    this.applyThemeToRoot();

    try {
      const raw = localStorage.getItem('admin_notification_prefs');
      if (raw) {
        const parsed = JSON.parse(raw) as TogglePref[];
        if (Array.isArray(parsed) && parsed.length) {
          this.notificationToggles = this.notificationToggles.map(t => parsed.find(p => p.key === t.key) || t);
        }
      }
      const controlsRaw = localStorage.getItem('admin_controls_state');
      if (controlsRaw) {
        const parsed = JSON.parse(controlsRaw) as AdminControlsState;
        this.maintenanceEnabled = !!parsed.maintenanceEnabled;
        this.newsSchedule = parsed.newsSchedule || '60m';
        this.twoFactorEnabled = !!parsed.twoFactorEnabled;
        this.email = parsed.email || '';
      }
    } catch {}
  }

  saveDisplayPrefs(): void {
    try { localStorage.setItem('pref_theme', this.theme); } catch {}
    try { localStorage.setItem('pref_lang', this.language); } catch {}
    this.applyThemeToRoot();
    this.languageService.setLanguage(this.language);
    this.profileService.updateUserProfile({ themePreference: this.theme, language: this.language }).subscribe({
      next: () => {
        const current = this.auth.currentUserValue?.user;
        if (current) {
          this.auth.updateCurrentUser({ ...current, themePreference: this.theme, language: this.language } as any);
        }
      },
      error: () => {}
    });
  }

  private applyThemeToRoot(): void {
    const root = document.documentElement;
    if (this.theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }

  saveNotificationPrefs(): void {
    this.savingPrefs = true;
    this.prefsMessage = '';
    this.prefsError = '';
    try {
      localStorage.setItem('admin_notification_prefs', JSON.stringify(this.notificationToggles));
      this.prefsMessage = 'Preferences saved';
    } catch {
      this.prefsError = 'Could not save preferences locally';
    } finally {
      this.savingPrefs = false;
    }
  }

  saveControlSettings(): void {
    this.settingsMessage = '';
    this.settingsError = '';
    try {
      const payload: AdminControlsState = {
        maintenanceEnabled: this.maintenanceEnabled,
        newsSchedule: this.newsSchedule,
        twoFactorEnabled: this.twoFactorEnabled,
        email: this.email
      };
      localStorage.setItem('admin_controls_state', JSON.stringify(payload));
      if (this.password) {
        // In a real app this would be sent to the backend; we only clear it here.
        this.password = '';
      }
      this.settingsMessage = 'Settings updated locally';
    } catch {
      this.settingsError = 'Could not save settings';
    }
  }

  fetchNewsNow(): void {
    this.fetchNowMessage = 'Fetch requested (stub)';
    setTimeout(() => this.fetchNowMessage = '', 2500);
  }

  changePassword(): void {
    this.pwMessage = '';
    this.pwError = '';
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.pwError = 'Please fill current, new, and confirmation fields.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.pwError = 'New passwords do not match.';
      return;
    }
    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.pwMessage = 'Password updated successfully';
        this.currentPassword = this.newPassword = this.confirmPassword = '';
      },
      error: err => {
        this.pwError = err?.message || 'Failed to change password';
      }
    });
  }

  changeEmail(): void {
    this.emailMessage = '';
    this.emailError = '';
    if (!this.newEmail || !this.confirmEmail || !this.emailPassword) {
      this.emailError = 'Provide new email, confirmation, and current password.';
      return;
    }
    if (this.newEmail !== this.confirmEmail) {
      this.emailError = 'Emails do not match.';
      return;
    }
    this.auth.changeEmail(this.newEmail, this.emailPassword).subscribe({
      next: () => {
        this.emailMessage = 'Email change requested';
        this.newEmail = '';
        this.confirmEmail = '';
        this.emailPassword = '';
      },
      error: err => {
        this.emailError = err?.message || 'Failed to change email';
      }
    });
  }

  updateTwoFactor(): void {
    this.twoFactorMessage = '';
    this.twoFactorError = '';
    if (!this.twoFactorPassword) {
      this.twoFactorError = 'Enter your password to update 2FA.';
      return;
    }
    // Stub: pending backend endpoint
    this.twoFactorMessage = `2FA ${this.twoFactorEnabled ? 'enabled' : 'disabled'} (pending backend)`;
    this.twoFactorPassword = '';
  }

  toggleEmailForm(): void {
    this.showEmailForm = !this.showEmailForm;
    if (!this.showEmailForm) {
      this.newEmail = '';
      this.confirmEmail = '';
      this.emailPassword = '';
      this.emailMessage = '';
      this.emailError = '';
    }
  }

  togglePasswordForm(): void {
    this.showPasswordForm = !this.showPasswordForm;
    if (!this.showPasswordForm) {
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
      this.pwMessage = '';
      this.pwError = '';
    }
  }

  toggleNotifications(): void {
    this.notificationsCollapsed = !this.notificationsCollapsed;
  }

  toggleTwoFactor(): void {
    this.twoFactorCollapsed = !this.twoFactorCollapsed;
  }
}
