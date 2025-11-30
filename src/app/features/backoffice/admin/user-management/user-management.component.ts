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
    this.selectedUser = { ...user };
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
      const pending = { ...this.selectedUser };
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
}
