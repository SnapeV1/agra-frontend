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

  toggleArchive(user: User): void {
    user.archived = !user.archived;
    
    // Optionally call service to update on backend
    // this.usersService.updateUser(user).subscribe({
    //   next: () => console.log('User updated successfully'),
    //   error: (err) => console.error('Error updating user:', err)
    // });
  }

  deleteUser(userId: string): void {
    const confirmed = confirm('Are you sure you want to delete this user? This action cannot be undone.');
    
    if (confirmed) {
      this.users = this.users.filter(u => u.id !== userId);
      
      // Optionally call service to delete on backend
      // this.usersService.deleteUser(userId).subscribe({
      //   next: () => console.log('User deleted successfully'),
      //   error: (err) => console.error('Error deleting user:', err)
      // });
    }
  }
}