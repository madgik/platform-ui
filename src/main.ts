import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { appRoutes } from "./app/app.routes";
import { provideEchartsCore } from 'ngx-echarts';
import { withCredentialsInterceptor } from './app/services/auth.interceptor';


bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(appRoutes),
    provideHttpClient(
      withInterceptors([withCredentialsInterceptor]),
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' })
    ),
    provideEchartsCore({ echarts: () => import('echarts') })
  ]
}).catch(err => console.error(err));
