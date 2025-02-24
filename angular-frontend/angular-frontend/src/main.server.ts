import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';
import { provideServerRendering } from '@angular/platform-server';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

const bootstrap = () =>
  bootstrapApplication(AppComponent, {
    providers: [
      provideServerRendering(), // Adds server-side utilities
      provideHttpClient(withInterceptorsFromDi()), // Configures HttpClient for SSR
      ...config.providers, // Includes server-specific configurations
    ],
  });

export default bootstrap;
