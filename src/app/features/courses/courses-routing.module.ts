import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CoursesComponent } from './components/courses/courses.component';
import { CourseDetailsComponent } from './components/course-details/course-details.component';
import { CourseEnrolledComponent } from './components/course-enrolled/course-enrolled.component';

const routes: Routes = [
  {
    path: '',  
    component: CoursesComponent
  },
  { path: 'course-details/:id', component: CourseDetailsComponent },
  { path: 'course-enrolled/:id', component: CourseEnrolledComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CoursesRoutingModule { }
