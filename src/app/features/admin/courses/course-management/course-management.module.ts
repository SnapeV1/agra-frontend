
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // for ngModel support
import { CourseManagementComponent } from './course-management.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [CourseManagementComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([
      { path: '', component: CourseManagementComponent }
    ])
  ],
  exports: [CourseManagementComponent]
})
export class CourseManagementModule { }
