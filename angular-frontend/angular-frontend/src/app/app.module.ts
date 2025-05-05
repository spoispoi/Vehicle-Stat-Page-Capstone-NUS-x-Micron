import { NgModule } from '@angular/core';
//import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ToolListComponent } from './tool-list/tool-list.component';
import { ToolDetailComponent } from './tool-detail/tool-detail.component';
import { CommonModule } from '@angular/common'; // Import CommonModule
//import { NgChartsModule } from 'ng2-charts';
// import {NgxChartsModule } from '@swimlane/ngx-charts';
// import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideAnimations } from '@angular/platform-browser/animations';
import { StatisticsService } from './services/statistics.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { importProvidersFrom } from '@angular/core';

@NgModule({
  declarations: [
    AppComponent,
    ToolListComponent,
    ToolDetailComponent
  ],
  imports: [
   // BrowserModule,
    AppRoutingModule,
    FormsModule,
    CommonModule,
    BrowserAnimationsModule,
    // NgxChartsModule, // Import NgxChartsModule
    
  ],
  providers: [
    provideHttpClient(), // Ensures HttpClient is provided
    provideAnimations() // Enables animations
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
