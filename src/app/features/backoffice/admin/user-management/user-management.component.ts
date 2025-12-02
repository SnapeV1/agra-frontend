import { Component, OnInit } from '@angular/core';
import { User } from 'src/app/core/models/user.model';
import { UsersService } from '../services/users.service';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  searchTerm = '';
  selectedUser: User | null = null;
  showEditModal = false;
  loading = true;
  isCountryDropdownOpen = false;
  countryCodes = [
    { code: '+1', country: 'US', name: 'United States' },
    { code: '+44', country: 'GB', name: 'United Kingdom' },
    { code: '+33', country: 'FR', name: 'France' },
    { code: '+49', country: 'DE', name: 'Germany' },
    { code: '+91', country: 'IN', name: 'India' },
    { code: '+966', country: 'SA', name: 'Saudi Arabia' },
    { code: '+971', country: 'AE', name: 'United Arab Emirates' },
    { code: '+61', country: 'AU', name: 'Australia' },
    { code: '+81', country: 'JP', name: 'Japan' },
    { code: '+86', country: 'CN', name: 'China' }
  ];

  constructor(private usersService: UsersService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.usersService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
      }
    });
  }

  get filteredUsers(): User[] {
    if (!this.searchTerm) {
      return this.users;
    }

    const searchLower = this.searchTerm.toLowerCase();
    return this.users.filter(user =>
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.country?.toLowerCase().includes(searchLower) ?? false) ||
      (user.language?.toLowerCase().includes(searchLower) ?? false) ||
      user.role.toLowerCase().includes(searchLower) ||
      (user.domain?.toLowerCase().includes(searchLower) ?? false)
    );
  }

  get activeUsersCount(): number {
    return this.filteredUsers.filter(user => !user.archived).length;
  }

  get archivedUsersCount(): number {
    return this.filteredUsers.filter(user => user.archived).length;
  }

  openEditModal(user: User): void {
    // Create a deep copy to avoid direct mutation
    const countryCodeMatch = (user.phone || '').match(/^(\+\d{1,4})\s+(.*)$/);
    this.selectedUser = {
      ...user,
      phoneCountryCode: countryCodeMatch ? countryCodeMatch[1] : (this.getSelectedCountry().code),
      phone: countryCodeMatch ? countryCodeMatch[2] : (user.phone || '')
    } as any;
    this.isCountryDropdownOpen = false;
    this.showEditModal = true;
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedUser = null;
    // Restore body scroll
    document.body.style.overflow = 'auto';
  }

  saveUser(): void {
    if (this.selectedUser) {
      const pending = { ...this.selectedUser } as any;
      if (pending.phone) {
        const code = pending.phoneCountryCode || this.getSelectedCountry().code;
        pending.phone = `${code} ${pending.phone}`.trim();
      }
      // Prevent duplicate emails (case-insensitive, excluding the edited user)
      const exists = this.users.some(u => u.id !== pending.id && (u.email || '').toLowerCase() === (pending.email || '').toLowerCase());
      if (exists) {
        alert('Another user already has this email address. Please use a unique email.');
        return;
      }
      // Optimistically update local list to reflect changes
      const index = this.users.findIndex(u => u.id === pending.id);
      if (index !== -1) {
        this.users[index] = { ...pending };
      }
      // Persist to backend using UsersService (aligned with current User model)
      this.usersService.updateUser(pending).subscribe({
        next: (updated) => {
          const i = this.users.findIndex(u => u.id === updated.id);
          if (i !== -1) {
            this.users[i] = { ...updated };
          }
          this.closeEditModal();
        },
        error: () => {
          // On failure, revert optimistic change by reloading users
          this.loadUsers();
          this.closeEditModal();
        }
      });
    }
  }

  // Handle escape key to close modal
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.showEditModal) {
      this.closeEditModal();
    }
  }

  toggleArchiveUser() {
  if (this.selectedUser) {
    this.selectedUser.archived = !this.selectedUser.archived;
  }
}

  toggleCountryDropdown(): void {
    this.isCountryDropdownOpen = !this.isCountryDropdownOpen;
  }

  selectCountry(country: { code: string; country: string; name: string }): void {
    if (this.selectedUser) {
      (this.selectedUser as any).phoneCountryCode = country.code;
    }
    this.isCountryDropdownOpen = false;
  }

  getSelectedCountry(): { code: string; country: string; name: string } {
    const code = (this.selectedUser as any)?.phoneCountryCode;
    const found = this.countryCodes.find(c => c.code === code);
    return found || this.countryCodes[0];
  }
}
