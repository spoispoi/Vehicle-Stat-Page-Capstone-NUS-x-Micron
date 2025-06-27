
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
  @Input() earliestDate: string = '';
  @Output() dateRangeChange = new EventEmitter<DateRange>();
  @Output() filterCleared = new EventEmitter<void>();
  
  maxDate: string = '';
  private _isFilterApplied: boolean = false;
  activeQuickRange: string = 'all'; // Track active quick range
  
  ngOnInit() {
    const today = new Date();
    this.maxDate = today.toISOString().split('T')[0];
    this.updateFilterApplied();
    this.detectActiveQuickRange(); // Detect which range is currently active
  }
  
  get isFilterApplied(): boolean {
    return this._isFilterApplied;
  }
  
  private updateFilterApplied(): void {
    this._isFilterApplied = !!(this.startDate || this.endDate);
  }
  
  private detectActiveQuickRange(): void {
    if (!this.startDate && !this.endDate) {
      this.activeQuickRange = 'all';
      return;
    }
    
    const today = new Date();
    const startDateObj = this.startDate ? new Date(this.startDate) : null;
    const endDateObj = this.endDate ? new Date(this.endDate) : null;
    const todayStr = today.toISOString().split('T')[0];
    
    // Check if current dates match any quick range
    if (endDateObj && endDateObj.toISOString().split('T')[0] === todayStr) {
      if (startDateObj) {
        const daysDiff = Math.floor((today.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 7) {
          this.activeQuickRange = 'week';
        } else if (daysDiff >= 28 && daysDiff <= 31) {
          this.activeQuickRange = 'month';
        } else if (daysDiff >= 89 && daysDiff <= 92) {
          this.activeQuickRange = 'quarter';
        } else if (daysDiff >= 364 && daysDiff <= 366) {
          this.activeQuickRange = 'year';
        } else {
          this.activeQuickRange = 'custom';
        }
      } else {
        this.activeQuickRange = 'custom';
      }
    } else {
      this.activeQuickRange = 'custom';
    }
  }
  
  onStartDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.startDate = target.value;
    this.activeQuickRange = 'custom'; // Set to custom when manually changed
    this.onDateChange();
  }
  
  onEndDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.endDate = target.value;
    this.activeQuickRange = 'custom'; // Set to custom when manually changed
    this.onDateChange();
  }
  
  onDateChange(): void {
    this.updateFilterApplied();
  }
  
  hasValidDates(): boolean {
    // If no dates are set (All Time), this is valid
    if (!this.startDate && !this.endDate) return true;
    
    // If both dates are set, check if start <= end
    if (this.startDate && this.endDate) {
      return new Date(this.startDate) <= new Date(this.endDate);
    }
    
    // If only one date is set, it's valid
    return true;
  }
  
  applyFilter(): void {
    if (this.hasValidDates()) {
      this.emitDateRangeChange();
    }
  }
  
  clearFilter(): void {
    this.startDate = '';
    this.endDate = '';
    this.activeQuickRange = 'all'; // Set to 'all' when cleared
    this.updateFilterApplied();
    this.filterCleared.emit();
  }

  setQuickRange(range: string): void {
    console.log(`setQuickRange called with: ${range}`);
    this.activeQuickRange = range; // Set active range immediately
    
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();
  
    switch (range) {
      case 'all':
        this.startDate = '';
        this.endDate = '';
        console.log('All time selected - clearing dates');
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
  
    console.log(`After setting range ${range}:`, { 
      startDate: this.startDate, 
      endDate: this.endDate,
      activeQuickRange: this.activeQuickRange 
    });
    
    // Update filter applied status
    this.updateFilterApplied();
    
    // Always emit the change, even for 'all' case
    this.emitDateRangeChange();
  }
  
  private emitDateRangeChange() {
    console.log('emitDateRangeChange called:', {
      startDate: this.startDate,
      endDate: this.endDate,
      isFilterApplied: this.isFilterApplied
    });
    
    this.updateFilterApplied();
    this.dateRangeChange.emit({
      startDate: this.startDate,
      endDate: this.endDate
    });
  }
  
  getFilterDescription(): string {
    // If "All Time" is selected (no dates set), don't show this section
    // Let the "No date filter applied" section handle it
    if (!this.startDate && !this.endDate) {
      return '';
    }
    
    if (this.startDate && this.endDate) {
      return `Showing data from ${this.formatDate(this.startDate)} to ${this.formatDate(this.endDate)}`;
    } else if (this.startDate) {
      return `Showing data from ${this.formatDate(this.startDate)} onwards`;
    } else if (this.endDate) {
      return `Showing data up to ${this.formatDate(this.endDate)}`;
    }
    
    return '';
  }
  
  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
}