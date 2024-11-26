import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {DataModelFormComponent} from "./data-model-form/data-model-form.component";

const routes: Routes = [
  {
    path: 'add',
    component: DataModelFormComponent,
    data: { isUpdate: false },
  },
  {
    path: 'update',
    component: DataModelFormComponent,
    data: { isUpdate: true },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DataModelsPageRoutingModule {}
