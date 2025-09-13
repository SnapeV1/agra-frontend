import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CoursesRoutingModule } from './courses-routing.module';
import { CoursesComponent } from './components/courses/courses.component';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { SharedModule } from "src/app/features/shared/shared.module";
import { LucideAngularModule, AlertTriangle, RefreshCw, Search, X, BookOpen, Globe, Users, Clock, Eye, Plus } from 'lucide-angular';
import { CourseDetailsComponent } from './components/course-details/course-details.component';


@NgModule({
  declarations: [
    CoursesComponent,
    CourseDetailsComponent  
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    CoursesRoutingModule,
    SharedModule,
       LucideAngularModule.pick({
      AlertTriangle,
      RefreshCw,
      Search,
      X,
      BookOpen,
      Globe,
      Users,
      Clock,
      Eye,
      Plus
    })
]
})
export class CoursesModule { }
