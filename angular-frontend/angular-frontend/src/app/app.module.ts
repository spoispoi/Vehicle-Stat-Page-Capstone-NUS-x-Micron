import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ToolListComponent } from './tool-list/tool-list.component';
import { ToolDetailComponent } from './tool-detail/tool-detail.component';
import { CommonModule } from '@angular/common'; // Import CommonModule
//import { NgChartsModule } from 'ng2-charts';


@NgModule({
  declarations: [
    AppComponent,
    ToolListComponent,
    ToolDetailComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    CommonModule,
    
  ],
  providers: [
    provideHttpClient() // Ensures HttpClient is provided
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
