import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CourseManagementComponent } from './courses/course-management/course-management.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: 'courses', component: CourseManagementComponent },
      { path: '', redirectTo: 'courses', pathMatch: 'full' } 
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {}
