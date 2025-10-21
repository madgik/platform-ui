import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { appRoutes } from "./app/app.routes";
import { provideEchartsCore } from 'ngx-echarts';


bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(appRoutes),
    provideHttpClient(),
    provideEchartsCore({ echarts: () => import('echarts') })
  ]
}).catch(err => console.error(err));
