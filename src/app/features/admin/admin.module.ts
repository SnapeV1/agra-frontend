import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminRoutingModule } from './admin-routing.module';
import { FormsModule } from '@angular/forms';
import { CoursesModule } from '../courses/courses.module';
import { CourseManagementModule } from './courses/course-management/course-management.module';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    AdminRoutingModule,
    FormsModule,
    CoursesModule,
    CourseManagementModule
  ]
})
export class AdminModule { }
