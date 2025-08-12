import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing.module';
import { FormsModule } from '@angular/forms';
import { CoursesModule } from '../courses/courses.module';
import { CourseManagementModule } from './courses/course-management/course-management.module';
import { SharedModule } from './shared/shared.module';
import { DashboardAdminComponent } from './dashboard-admin/dashboard-admin.component';
import { RouterModule } from '@angular/router';
import { UserManagementComponent } from './user-management/user-management.component';


@NgModule({
  declarations: [
    DashboardAdminComponent,
    UserManagementComponent,
    
  ],
  imports: [
    CommonModule,
    FormsModule,
    CoursesModule,
    CourseManagementModule,
    SharedModule,
    RouterModule,
    AdminRoutingModule

  ]
})
export class AdminModule { }
