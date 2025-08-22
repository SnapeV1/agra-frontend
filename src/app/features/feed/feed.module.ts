import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from "../shared/shared.module";
import { FormsModule } from '@angular/forms';
import { FeedComponent } from './feed.component';



@NgModule({
  declarations: [
    FeedComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule
    
]
})
export class FeedModule { }
