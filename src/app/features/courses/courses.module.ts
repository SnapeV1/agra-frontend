import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CoursesRoutingModule } from './courses-routing.module';
import { CoursesComponent } from './components/courses/courses.component';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AppModule } from 'src/app/app.module';
import { SharedModule } from "src/app/features/shared/shared.module";


@NgModule({
  declarations: [
    CoursesComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    CoursesRoutingModule,
    SharedModule
]
})
export class CoursesModule { }
