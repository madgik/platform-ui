import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

import { FooterComponent } from './shared/footer/footer.component';
import { HeaderComponent } from './shared/header/header.component';

@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    HeaderComponent,
    FooterComponent,
    RouterModule.forRoot([])
  ],
  bootstrap: []
})
export class AppModule {}
