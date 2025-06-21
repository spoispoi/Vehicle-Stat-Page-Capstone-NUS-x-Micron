import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DateRange {
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'app-date-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './date-filter.component.html',
  styleUrls: ['./date-filter.component.css']
})
export class DateFilterComponent implements OnInit {
  @Input() startDate: string = '';
  @Input() endDate: string = '';
  @Input() earliestDate: string = ''; // Add input for earliest date
  @Output() dateRangeChange = new EventEmitter<DateRange>();
  @Output() filterCleared = new EventEmitter<void>();
  
  maxDate: string = '';
  private _isFilterApplied: boolean = false;
  
  ngOnInit() {
    // Set max date to today
    this.maxDate = new Date().toISOString().split('T')[0];
    this.updateFilterApplied();
  }
  
  get isFilterApplied(): boolean {
    return this._isFilterApplied;
  }
  
  private updateFilterApplied(): void {
    this._isFilterApplied = !!(this.startDate || this.endDate);
  }
  
  onStartDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.startDate = target.value;
    this.updateFilterApplied();
    this.emitDateRangeChange();
  }
  
  onEndDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.endDate = target.value;
    this.updateFilterApplied();
    this.emitDateRangeChange();
  }
  
  onDateChange(): void {
    this.updateFilterApplied();
  }
  
  hasValidDates(): boolean {
    if (!this.startDate && !this.endDate) return true;
    if (this.startDate && this.endDate) {
      return new Date(this.startDate) <= new Date(this.endDate);
    }
    return true;
  }
  
  applyFilter(): void {
    if (this.hasValidDates()) {
      this.updateFilterApplied();
      this.emitDateRangeChange();
    }
  }
  
  clearFilter(): void {
    this.startDate = '';
    this.endDate = '';
    this._isFilterApplied = false;
    this.filterCleared.emit();
  }

  setQuickRange(range: string): void {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (range) {
      case 'all':
        this.startDate = '';
        this.endDate = '';
        break;
      case 'week':
        startDate.setDate(today.getDate() - 7);
        this.startDate = startDate.toISOString().split('T')[0];
        this.endDate = today.toISOString().split('T')[0];
        break;
      case 'month':
        startDate.setMonth(today.getMonth() - 1);
        this.startDate = startDate.toISOString().split('T')[0];
        this.endDate = today.toISOString().split('T')[0];
        break;
      case 'quarter':
        startDate.setMonth(today.getMonth() - 3);
        this.startDate = startDate.toISOString().split('T')[0];
        this.endDate = today.toISOString().split('T')[0];
        break;
      case 'year':
        startDate.setFullYear(today.getFullYear() - 1);
        this.startDate = startDate.toISOString().split('T')[0];
        this.endDate = today.toISOString().split('T')[0];
        break;
      default:
        this.startDate = '';
        this.endDate = '';
    }

    console.log(`Setting quick date range: ${range}`, { startDate: this.startDate, endDate: this.endDate });
    this.applyFilter();
  }
  
  private emitDateRangeChange() {
    this.dateRangeChange.emit({
      startDate: this.startDate,
      endDate: this.endDate
    });
  }
  
  getFilterDescription(): string {
    if (!this.isFilterApplied) {
      return 'Showing all data (no date filter applied)';
    }
    
    if (this.startDate && this.endDate) {
      return `Showing data from ${this.formatDate(this.startDate)} to ${this.formatDate(this.endDate)}`;
    } else if (this.startDate) {
      return `Showing data from ${this.formatDate(this.startDate)} onwards`;
    } else if (this.endDate) {
      return `Showing data up to ${this.formatDate(this.endDate)}`;
    }
    
    return 'Showing all data';
  }
  
  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }
} 