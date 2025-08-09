
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // for ngModel support
import { CourseManagementComponent } from './course-management.component';
import { RouterModule } from '@angular/router';
import { SharedModule } from "../../shared/shared.module";

@NgModule({
  declarations: [CourseManagementComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([
        { path: '', component: CourseManagementComponent }
    ]),
    SharedModule
],
  exports: [CourseManagementComponent]
})
export class CourseManagementModule { }
