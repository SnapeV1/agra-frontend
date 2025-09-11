import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CourseManagementComponent } from './course-management/course-management.component';
import { DashboardAdminComponent } from './dashboard-admin/dashboard-admin.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { AdminPostsComponent } from './admin-posts/admin-posts.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: 'posts', component: AdminPostsComponent }, 
      { path: 'courses', component: CourseManagementComponent },
      { path: 'dashboard', component: DashboardAdminComponent },
      { path: 'users', component: UserManagementComponent },
      { path: '', redirectTo: 'courses', pathMatch: 'full' } 
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {}
