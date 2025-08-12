import { Component, OnInit } from '@angular/core';
import { User } from '../../user/models/user.model';
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

  constructor(private usersService: UsersService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.usersService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
      },
      error: (err) => {
        console.error('Error fetching users:', err);
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
      // Find the original user and update it
      const index = this.users.findIndex(u => u.id === this.selectedUser!.id);
      if (index !== -1) {
        this.users[index] = { ...this.selectedUser };
      }

      // Optionally call service to update on backend
      // this.usersService.updateUser(this.selectedUser).subscribe({
      //   next: () => {
      //     console.log('User updated successfully');
      //     this.closeEditModal();
      //   },
      //   error: (err) => {
      //     console.error('Error updating user:', err);
      //     // Handle error (show toast, etc.)
      //   }
      // });

      this.closeEditModal();
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