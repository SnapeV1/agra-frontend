import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CoursesComponent } from './components/courses/courses.component';
import { CourseDetailsComponent } from './components/course-details/course-details.component';
import { CourseEnrolledComponent } from './components/course-enrolled/course-enrolled.component';
import { CertificateComponent } from './components/certificate/certificate.component';
import { JitsiComponent } from './components/jitsi/jitsi.component';

const routes: Routes = [
  {
    path: '',  
    component: CoursesComponent
  },
  { path: 'course-details/:id', component: CourseDetailsComponent },
  { path: 'course-enrolled/:id', component: CourseEnrolledComponent },
  { path: 'certificate/:id', component: CertificateComponent },
  { path: 'live-session/:roomName', component: JitsiComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CoursesRoutingModule { }
