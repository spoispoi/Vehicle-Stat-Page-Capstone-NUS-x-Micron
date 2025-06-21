import { Component, OnInit } from '@angular/core';
import { StatisticsService } from '../services/statistics.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-test-statistics',
  standalone: true,
  template: `
    <div class="container mt-4">
      <h2>API Test Page</h2>
      
      <div class="mb-3">
        <label for="equipId" class="form-label">Equipment ID:</label>
        <input type="text" id="equipId" class="form-control" [(ngModel)]="equipId" placeholder="Enter equipment ID">
      </div>
      
      <div class="mb-3">
        <button class="btn btn-primary me-2" (click)="testStatistics()">Test Statistics API</button>
        <button class="btn btn-secondary me-2" (click)="testTools()">Test Tools API</button>
        <button class="btn btn-info" (click)="testToolEntries()">Test Tool Entries</button>
      </div>
      
      <div *ngIf="loading" class="alert alert-info">
        Loading...
      </div>
      
      <div *ngIf="error" class="alert alert-danger">
        <strong>Error:</strong> {{ error }}
      </div>
      
      <div *ngIf="result" class="alert alert-success">
        <strong>Success!</strong> Data received.
        <pre>{{ result | json }}</pre>
      </div>
    </div>
  `,
  imports: [CommonModule, FormsModule]
})
export class TestStatisticsComponent implements OnInit {
  equipId: string = '';
  loading: boolean = false;
  error: string = '';
  result: any = null;

  constructor(
    private statisticsService: StatisticsService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {}

  testStatistics(): void {
    if (!this.equipId) {
      this.error = 'Please enter an equipment ID';
      return;
    }

    this.loading = true;
    this.error = '';
    this.result = null;

    console.log('Testing statistics API for equipment:', this.equipId);
    
    this.statisticsService.getStatistics(this.equipId).subscribe({
      next: (data) => {
        console.log('Statistics API response:', data);
        this.result = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Statistics API error:', err);
        this.error = `API Error: ${err.message || err.statusText || 'Unknown error'}`;
        this.loading = false;
      }
    });
  }

  testTools(): void {
    this.loading = true;
    this.error = '';
    this.result = null;

    console.log('Testing tools API');
    
    this.http.get('http://127.0.0.1:8000/api/tools/').subscribe({
      next: (data) => {
        console.log('Tools API response:', data);
        this.result = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Tools API error:', err);
        this.error = `API Error: ${err.message || err.statusText || 'Unknown error'}`;
        this.loading = false;
      }
    });
  }

  testToolEntries(): void {
    if (!this.equipId) {
      this.error = 'Please enter an equipment ID';
      return;
    }

    this.loading = true;
    this.error = '';
    this.result = null;

    const url = `http://127.0.0.1:8000/api/tools/?equip_id=${this.equipId}`;
    console.log('Testing tool entries API:', url);
    
    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        console.log('Tool entries API response:', data);
        this.result = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Tool entries API error:', err);
        this.error = `API Error: ${err.message || err.statusText || 'Unknown error'}`;
        this.loading = false;
      }
    });
  }
} 