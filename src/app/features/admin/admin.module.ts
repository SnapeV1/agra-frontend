import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing.module';
import { FormsModule } from '@angular/forms';
// import { CoursesModule } from '../courses/courses.module';
import { SharedModule as AdminSharedModule } from './shared/shared.module';
import { SharedModule as AppSharedModule } from '../shared/shared.module';
import { NgChartsModule } from 'ng2-charts';
import { DashboardAdminComponent } from './dashboard-admin/dashboard-admin.component';
import { RouterModule } from '@angular/router';
import { UserManagementComponent } from './user-management/user-management.component';
import { AdminPostsComponent } from './admin-posts/admin-posts.component';
import { CourseManagementModule } from './course-management/course-management.module';
import { TicketManagementComponent } from './ticket-management/ticket-management.component';
import { CertificatesManagementComponent } from './certificates-management/certificates-management.component';
import { AdminSettingsComponent } from './admin-settings/admin-settings.component';


@NgModule({
  declarations: [
    DashboardAdminComponent,
    UserManagementComponent,
    AdminPostsComponent,
    TicketManagementComponent,
    CertificatesManagementComponent,
    AdminSettingsComponent,
    
  ],
  imports: [
    CommonModule,
    FormsModule,
    // CoursesModule,
    CourseManagementModule,
    AdminSharedModule,
    AppSharedModule,
    NgChartsModule,
    RouterModule,
    AdminRoutingModule

  ]
})
export class AdminModule { }
