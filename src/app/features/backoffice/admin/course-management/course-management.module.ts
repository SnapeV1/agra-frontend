
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // for ngModel support
import { RouterModule } from '@angular/router';
import { LucideAngularModule, ChevronUp, ChevronDown, ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-angular';

import { CourseManagementComponent } from './course/course-management.component';
import { SharedModule } from '../shared/shared.module';
import { AdminCourseDetailsComponent } from './course-details/course-details.component';


@NgModule({
  declarations: [CourseManagementComponent, AdminCourseDetailsComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild([
        { path: '', component: CourseManagementComponent }
    ]),
    SharedModule,
    LucideAngularModule.pick({ ChevronUp, ChevronDown, ArrowUp, ArrowDown, Trash2, Plus })
],
  exports: [CourseManagementComponent]
})
export class CourseManagementModule { }
