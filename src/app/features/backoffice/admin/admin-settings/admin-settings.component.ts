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
    { key: 'system', label: 'adminSettings.notifications.toggles.system.label', hint: 'adminSettings.notifications.toggles.system.hint', enabled: true },
    { key: 'posts', label: 'adminSettings.notifications.toggles.posts.label', hint: 'adminSettings.notifications.toggles.posts.hint', enabled: true },
    { key: 'courses', label: 'adminSettings.notifications.toggles.courses.label', hint: 'adminSettings.notifications.toggles.courses.hint', enabled: true },
    { key: 'users', label: 'adminSettings.notifications.toggles.users.label', hint: 'adminSettings.notifications.toggles.users.hint', enabled: true }
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
  notificationsCollapsed = true;
  twoFactorCollapsed = true;
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
      this.prefsMessage = 'adminSettings.notifications.saved';
    } catch {
      this.prefsError = 'adminSettings.notifications.saveError';
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
      this.settingsMessage = 'adminSettings.operations.saved';
    } catch {
      this.settingsError = 'adminSettings.operations.saveError';
    }
  }

  fetchNewsNow(): void {
    this.fetchNowMessage = 'adminSettings.operations.fetchRequested';
    setTimeout(() => this.fetchNowMessage = '', 2500);
  }

  changePassword(): void {
    this.pwMessage = '';
    this.pwError = '';
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.pwError = 'adminSettings.security.password.errors.missingFields';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.pwError = 'adminSettings.security.password.errors.mismatch';
      return;
    }
    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.pwMessage = 'adminSettings.security.password.success';
        this.currentPassword = this.newPassword = this.confirmPassword = '';
      },
      error: err => {
        this.pwError = err?.message || 'adminSettings.security.password.errors.failed';
      }
    });
  }

  changeEmail(): void {
    this.emailMessage = '';
    this.emailError = '';
    if (!this.newEmail || !this.confirmEmail || !this.emailPassword) {
      this.emailError = 'adminSettings.security.email.errors.missingFields';
      return;
    }
    if (this.newEmail !== this.confirmEmail) {
      this.emailError = 'adminSettings.security.email.errors.mismatch';
      return;
    }
    this.auth.changeEmail(this.newEmail, this.emailPassword).subscribe({
      next: () => {
        this.emailMessage = 'adminSettings.security.email.success';
        this.newEmail = '';
        this.confirmEmail = '';
        this.emailPassword = '';
      },
      error: err => {
        this.emailError = err?.message || 'adminSettings.security.email.errors.failed';
      }
    });
  }

  updateTwoFactor(): void {
    this.twoFactorMessage = '';
    this.twoFactorError = '';
    if (!this.twoFactorPassword) {
      this.twoFactorError = 'adminSettings.security.twoFactor.errors.missingPassword';
      return;
    }
    // Stub: pending backend endpoint
    this.twoFactorMessage = this.twoFactorEnabled
      ? 'adminSettings.security.twoFactor.enabled'
      : 'adminSettings.security.twoFactor.disabled';
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
