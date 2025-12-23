import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CourseManagementComponent } from './course-management/course/course-management.component';
import { DashboardAdminComponent } from './dashboard-admin/dashboard-admin.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { AdminPostsComponent } from './admin-posts/admin-posts.component';
import { AdminCourseDetailsComponent } from './course-management/course-details/course-details.component';
import { TicketManagementComponent } from './ticket-management/ticket-management.component';
import { CertificatesManagementComponent } from './certificates-management/certificates-management.component';
import { AdminSettingsComponent } from './admin-settings/admin-settings.component';
import { ActivityLogsComponent } from '../activity-logs/activity-logs.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: 'posts', component: AdminPostsComponent }, 
      { path: 'courses', component: CourseManagementComponent },
      { path: 'activity-logs', component: ActivityLogsComponent },
      { path: 'dashboard', component: DashboardAdminComponent },
      { path: 'users', component: UserManagementComponent },
      { path: 'tickets', component: TicketManagementComponent },
      { path: 'certificates', component: CertificatesManagementComponent },
      { path: 'settings', component: AdminSettingsComponent },
      { path: 'coursedetails/:id', component: AdminCourseDetailsComponent },
      
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' } 
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {}
