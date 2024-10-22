import { AccountPageComponent } from './account-page.component';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // If you have routing

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', component: AccountPageComponent }
    ])
  ]
})
export class AccountPageModule {}
