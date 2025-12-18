import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared/shared.module';
import { SettingsComponent } from './settings.component';
import { SettingsRoutingModule } from './settings-routing.module';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [SettingsComponent],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    SettingsRoutingModule,
    TranslateModule
  ],
  exports: [SettingsComponent]
})
export class SettingsModule {}
