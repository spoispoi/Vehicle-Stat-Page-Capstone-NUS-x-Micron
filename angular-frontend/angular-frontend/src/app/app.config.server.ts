import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app-routing.module';
import { provideHttpClient, withInterceptorsFromDi, withFetch } from '@angular/common/http';

export const config: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptorsFromDi(),
      withFetch() // Enable fetch API for HttpClient in SSR
    ),
  ],
};
