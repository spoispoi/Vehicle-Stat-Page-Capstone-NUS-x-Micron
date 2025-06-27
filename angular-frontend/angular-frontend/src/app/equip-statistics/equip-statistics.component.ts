import {
  Component,
  OnInit,
  AfterViewInit,
  Inject,
  PLATFORM_ID,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { StatisticsService } from '../services/statistics.service';
import {
  isPlatformBrowser,
  ViewportScroller,
} from '@angular/common';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { Color, ScaleType, LegendPosition } from '@swimlane/ngx-charts';
import { curveMonotoneX } from 'd3-shape';
import { DateFilterComponent, DateRange } from '../components/date-filter/date-filter.component';

interface Entry {
  state_in_date: string;
  event_code: string;
  error_name: string;
  error_description: string;
}

interface ErrorNote {
  name: string;
  value: number;
}

interface ErrorFrequency {
  name: string;
  extra: { date: string };
  series: { name: string; value: number }[];
}

@Component({
  selector: 'app-equip-statistics',
  templateUrl: './equip-statistics.component.html',
  styleUrls: ['./equip-statistics.component.css'],
  standalone: true,
  imports: [RouterOutlet, NgxChartsModule, DateFilterComponent],
})
export class EquipStatisticsComponent implements OnInit, AfterViewInit {
  equipId: string = '';
  statistics: any = null;
  equipEntries: Entry[] = [];
  isBrowser: boolean;
  errorFrequencyData: ErrorFrequency[] = [];
  errorNotesData: ErrorNote[] = [];
  entries: Entry[] = [];
  filteredEntries: Entry[] = [];
  completeEntries: Entry[] = []; // Complete dataset without date filters for Most Recent Activity card
  legendPosition: LegendPosition = LegendPosition.Right;
  lineChartData: {
    name: string;
    series: { name: string; value: number }[];
  }[] = [];
  curve = curveMonotoneX;
  selectedErrorName: string | null = null;
  heatmapData: { date: string; count: number }[] = [];
  errorByEquipData: { name: string; series: { name: string; value: number }[] }[] = [];
  pmEntries: Entry[] = [];
  pmCount: number = 0;
  latestPmDate: string | null = null;
  mostRecentEntry: Entry | null = null;

  // Date filter properties
  startDate: string = '';
  endDate: string = '';
  isLoading: boolean = false;

  @ViewChild('entriesSection') entriesSection!: ElementRef;

  colorScheme: Color = {
    name: 'techTransparent',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: [
      'rgba(52, 152, 219, 0.6)',
      'rgba(155, 89, 182, 0.6)',
      'rgba(231, 76, 60, 0.6)',
      'rgba(46, 204, 113, 0.6)',
      'rgba(241, 196, 15, 0.6)',
      'rgba(230, 126, 34, 0.6)',
      'rgba(149, 165, 166, 0.6)',
      'rgba(26, 188, 156, 0.6)',
      'rgba(127, 140, 141, 0.6)',
      'rgba(44, 62, 80, 0.6)',
    ],
  };

  constructor(
    private route: ActivatedRoute,
    private statisticsService: StatisticsService,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private viewportScroller: ViewportScroller
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      // The route is configured as 'statistics/:equip_id'
      this.equipId = params['equip_id'];
      console.log('Route params:', params);
      console.log('Equipment ID:', this.equipId);
      
      if (this.equipId) {
        this.loadStatistics();
      } else {
        console.error('No equipment ID found in route parameters');
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.viewportScroller.scrollToPosition([0, 0]);
    }
  }

  loadStatistics(): void {
    this.isLoading = true;
    console.log('Loading statistics for equipment:', this.equipId);
    
    this.statisticsService.getStatistics(this.equipId, this.startDate, this.endDate).subscribe({
      next: (data) => {
        console.log('Statistics data received:', data);
        this.statistics = data;
        this.transformData(data);
        this.loadToolEntries();
        // Load complete entries for cards that should be independent of date filters
        this.loadCompleteEntries();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
        // Set default values
        this.statistics = {
          total_errors: 0,
          most_common_error_name: 'N/A',
          error_notes: []
        };
        this.transformData(this.statistics);
        this.loadToolEntries();
        // Load complete entries even on error
        this.loadCompleteEntries();
        this.isLoading = false;
      }
    });
  }
  
  loadCompleteEntries(): void {
    // Load the complete dataset without date filters for cards that should be independent
    const url = `http://127.0.0.1:8000/api/tools/?equip_id=${this.equipId}`;
    console.log('Loading complete entries from URL:', url);
    
    this.http.get<any[]>(url).subscribe({
      next: (tools) => {
        console.log('Complete entries received:', tools);
        // Process the complete dataset
        const allEntries: Entry[] = tools.map(tool => ({
          state_in_date: tool.state_in_date,
          event_code: tool.event_code,
          error_name: tool.error_name,
          error_description: tool.error_description
        }));
        
        // Store complete error entries (excluding PM) for "Days Since Last Error" calculation
        this.completeEntries = this.sortEntries(allEntries.filter((e) => e.error_name !== 'Unknown'));
        
        // Filter out PM entries from complete dataset (independent of date filters)
        this.pmEntries = this.sortEntries(allEntries.filter((e) => e.error_name === 'Unknown'));
        this.pmCount = this.pmEntries.length;
        this.latestPmDate = this.pmEntries.length > 0 ? this.pmEntries[0].state_in_date : null;
        
        // Update the most recent entry
        this.loadMostRecentEntry();
        
        console.log('Complete entries processed:', this.completeEntries.length);
        console.log('PM entries (unfiltered):', this.pmEntries.length);
      },
      error: (error) => {
        console.error('Error loading complete entries:', error);
        this.completeEntries = [];
        this.pmEntries = [];
        this.pmCount = 0;
        this.latestPmDate = null;
        this.mostRecentEntry = null;
      }
    });
  }


  loadToolEntries(): void {
    // Load actual tool entries for the equipment
    let url = `http://127.0.0.1:8000/api/tools/?equip_id=${this.equipId}`;
    const params: string[] = [];
    
    if (this.startDate) {
      params.push(`start_date=${this.startDate}`);
    }
    if (this.endDate) {
      params.push(`end_date=${this.endDate}`);
    }
    
    if (params.length > 0) {
      url += '&' + params.join('&');
    }
    
    console.log('Loading tool entries from URL:', url);
    
    this.http.get<any[]>(url).subscribe({
      next: (tools) => {
        console.log('Tool entries received:', tools);
        this.processToolEntries(tools);
      },
      error: (error) => {
        console.error('Error loading tool entries:', error);
        this.processToolEntries([]);
      }
    });
  }

  // processToolEntries(tools: any[]): void {
  //   console.log('Raw tools data from backend:', tools);
    
  //   // Convert tools to entries format
  //   const allEntries: Entry[] = tools.map(tool => {
  //     console.log('Processing tool:', tool);
  //     console.log('Raw state_in_date:', tool.state_in_date);
  //     return {
  //       state_in_date: tool.state_in_date,
  //       event_code: tool.event_code,
  //       error_name: tool.error_name,
  //       error_description: tool.error_description
  //     };
  //   });

  //   console.log('Processed entries:', allEntries);

  //   // Separate error entries from PM entries and sort by date (most recent first)
  //   this.entries = this.sortEntries(allEntries.filter((e) => e.error_name !== 'Unknown'));
  //   this.filteredEntries = this.entries; // Initially show all error entries
    
  //   // Set PM entries (entries with 'Unknown' error name)
  //   this.pmEntries = this.sortEntries(allEntries.filter((e) => e.error_name === 'Unknown'));

  //   // Update PM count and latest date
  //   this.pmCount = this.pmEntries.length;
  //   this.latestPmDate = this.pmEntries.length > 0 ? this.pmEntries[0].state_in_date : null;

  //   console.log('Final processed entries:', {
  //     totalEntries: allEntries.length,
  //     errorEntries: this.entries.length,
  //     pmEntries: this.pmEntries.length,
  //     filteredEntries: this.filteredEntries.length,
  //     sampleEntry: this.entries[0],
  //     mostRecentEntry: this.mostRecentEntry
  //   });
  // }

  // // populateStatistics method removed - data is now displayed directly in template

  // onDateRangeChange(dateRange: DateRange): void {
  //   this.startDate = dateRange.startDate;
  //   this.endDate = dateRange.endDate;
  //   this.loadStatistics();
  // }

  // onFilterCleared(): void {
  //   this.startDate = '';
  //   this.endDate = '';
  //   this.loadStatistics();
  // }

  processToolEntries(tools: any[]): void {
    console.log('Processing filtered tool entries:', tools.length);
    
    // Process filtered entries for the entries table display
    const allEntries: Entry[] = tools.map(tool => ({
      state_in_date: tool.state_in_date,
      event_code: tool.event_code,
      error_name: tool.error_name,
      error_description: tool.error_description
    }));
  
    // Store all filtered entries
    this.entries = this.sortEntries(allEntries);
    
    // Apply additional filters for the entries table display
    this.applyDateFilters();
    
    console.log('Filtered entries processed:', this.entries.length);
    console.log('Filtered entries for display:', this.filteredEntries.length);
  }
  
  private applyDateFilters(): void {
    // Start with all entries (which are already date-filtered from the API)
    let filtered = [...this.entries];
    
    // Filter out PM entries from the main entries table
    this.filteredEntries = this.sortEntries(filtered.filter((e) => e.error_name !== 'Unknown'));
    
    // Apply error name filter if selected
    if (this.selectedErrorName) {
      this.filteredEntries = this.filteredEntries.filter(entry => 
        entry.error_name === this.selectedErrorName
      );
    }
  }
  
  onDateRangeChange(dateRange: DateRange): void {
    console.log('Date range changed:', dateRange);
    this.startDate = dateRange.startDate;
    this.endDate = dateRange.endDate;
    
    // Reload statistics with date filters (affects statistics cards and charts)
    this.loadStatistics();
    // Note: loadCompleteEntries() is called within loadStatistics() and is not affected by date filters
  }
  
  onFilterCleared(): void {
    this.startDate = '';
    this.endDate = '';
    
    // Reload statistics without date filters
    this.loadStatistics();
    // Note: loadCompleteEntries() is called within loadStatistics() and will reload complete data
  }
  // setDateRange method removed - functionality now in date filter component

  sortEntries(entries: Entry[]): Entry[] {
    return [...entries].sort(
      (a, b) => {
        // Compare date strings directly to avoid timezone conversion
        if (a.state_in_date && b.state_in_date) {
          return b.state_in_date.localeCompare(a.state_in_date);
        }
        return 0;
      }
    );
  }

  renderEquipEntries(): void {
    // This method is no longer needed as we're using processToolEntries
    // Keeping it for backward compatibility but it's not used
  }

  prepareErrorByEquipData(): void {
    const grouped: { [equip: string]: { [errorName: string]: number } } = {};

    for (const entry of this.entries) {
      const equip = this.equipId;
      if (!grouped[equip]) grouped[equip] = {};
      if (!grouped[equip][entry.error_name]) grouped[equip][entry.error_name] = 0;
      grouped[equip][entry.error_name]++;
    }

    this.errorByEquipData = Object.entries(grouped).map(([equip, errors]) => ({
      name: equip,
      series: Object.entries(errors).map(([errorName, count]) => ({
        name: errorName,
        value: count,
      })),
    }));
  }

  fetchStatisticsGraph(equipId: string): void {
    this.statisticsService.getStatistics(equipId).subscribe((data: any) => {
      this.transformData(data);
    });
  }

  transformData(data: any) {
    console.log('Transforming data:', data);
    
    // Initialize default values
    this.errorFrequencyData = [];
    this.lineChartData = [];
    this.errorNotesData = [];
    this.heatmapData = [];

    // Check if we have error frequency data
    if (!data.error_frequency || data.error_frequency.length === 0) {
      console.log('No error frequency data found');
      return;
    }

    // Parse dates without timezone conversion
    const allDates = data.error_frequency.map((item: any) => {
      const dateStr = item.date.split('T')[0]; // Get YYYY-MM-DD part
      const [year, month, day] = dateStr.split('-').map(Number);
      return { year, month: month - 1, day }; // month is 0-indexed in JS
    });
    
    const minYear = Math.min(...allDates.map((d: any) => d.year));
    const maxYear = Math.max(...allDates.map((d: any) => d.year));

    const dateRange: string[] = [];
    for (let year = minYear; year <= maxYear; year++) {
      for (let month = 0; month < 12; month++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        dateRange.push(dateStr);
      }
    }

    const errorFrequencyDict: { [key: string]: { [error: string]: number } } = {};
    const monthlyTotals: { [key: string]: number } = {};
    const dailyTotals: { [key: string]: number } = {};

    dateRange.forEach((d) => (errorFrequencyDict[d] = {}));

    for (const item of data.error_frequency) {
      if (item.error_name === 'Unknown') continue;

      const fullDate = item.date.split('T')[0];
      const [year, month, day] = fullDate.split('-').map(Number);
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;

      if (!errorFrequencyDict[monthStart][item.error_name]) {
        errorFrequencyDict[monthStart][item.error_name] = 0;
      }

      errorFrequencyDict[monthStart][item.error_name] += item.count;
      monthlyTotals[monthStart] = (monthlyTotals[monthStart] || 0) + item.count;
      dailyTotals[fullDate] = (dailyTotals[fullDate] || 0) + item.count;
    }

    this.errorFrequencyData = dateRange.map((dateKey, i) => ({
      name: this.getMonthYearLabel(i % 12, minYear + Math.floor(i / 12)),
      extra: { date: dateKey },
      series: Object.entries(errorFrequencyDict[dateKey]).map(
        ([error, count]) => ({
          name: error,
          value: count,
        })
      ),
    }));

    this.lineChartData = [
      {
        name: 'Total Errors',
        series: dateRange.map((dateKey, i) => ({
          name: this.getMonthYearLabel(i % 12, minYear + Math.floor(i / 12)),
          value: monthlyTotals[dateKey] || 0,
        })),
      },
    ];

    // Handle error notes data
    if (data.error_notes) {
      this.errorNotesData = Object.keys(data.error_notes)
        .filter((key) => key !== 'Unknown')
        .map((key) => ({
          name: key,
          value: data.error_notes[key].count,
        }));
    }

    this.heatmapData = Object.entries(dailyTotals).map(([date, count]) => ({
      date,
      count,
    }));

    console.log('Transformed data:', {
      errorFrequencyData: this.errorFrequencyData,
      lineChartData: this.lineChartData,
      errorNotesData: this.errorNotesData
    });
  }

  getMonthYearLabel(month: number, year: number): string {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[month]} ${year}`;
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      // Format as YYYY-MM-DD HH:MM:SS in Singapore timezone
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Singapore'
      });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'N/A';
    }
  }

  onErrorSelect(event: any) {
    this.selectedErrorName = event.name;
    this.filteredEntries = this.sortEntries(
      this.entries.filter((entry) => entry.error_name === event.name && entry.error_name !== 'Unknown')
    );
    this.entriesSection?.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  clearErrorFilter(): void {
    this.selectedErrorName = null;
    this.filteredEntries = this.sortEntries(this.entries.filter((e) => e.error_name !== 'Unknown'));
  }

  onMonthSelect(event: any): void {
    // A legend click event in ngx-charts often returns the series name as a string
    if (typeof event === 'string') {
      // This handles a legend click, filtering by the error name.
      this.selectedErrorName = event;
      this.filteredEntries = this.sortEntries(
        this.entries.filter((entry) => entry.error_name === this.selectedErrorName && entry.error_name !== 'Unknown')
      );
    } 
    // A bar click event returns an object with details
    else if (event.series) {
      // This handles a bar click, filtering by the month.
      const [month, year] = event.series?.split(' ') ?? [];
      if (!month || !year) return; // Exit if parsing fails

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = monthNames.indexOf(month);

      this.filteredEntries = this.sortEntries(
        this.entries.filter((entry) => {
          // Parse date string directly to avoid timezone conversion
          const dateStr = entry.state_in_date.split('T')[0];
          const [entryYear, entryMonth] = dateStr.split('-').map(Number);
          return entryYear === parseInt(year) && (entryMonth - 1) === monthIndex && entry.error_name !== 'Unknown';
        })
      );
      // Set the filter description to the selected month
      this.selectedErrorName = `Month: ${event.series}`;
    }

    // After filtering, scroll to the entries table for immediate feedback
    this.entriesSection?.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  onTrendSelect(event: any): void {
    const [month, year] = event.name?.split(' ') ?? [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = monthNames.indexOf(month);

    this.filteredEntries = this.sortEntries(
      this.entries.filter((entry) => {
        // Parse date string directly to avoid timezone conversion
        const dateStr = entry.state_in_date.split('T')[0];
        const [entryYear, entryMonth] = dateStr.split('-').map(Number);
        return entryYear === parseInt(year) && (entryMonth - 1) === monthIndex && entry.error_name !== 'Unknown';
      })
    );

    this.selectedErrorName = `${month} ${year}`;

    this.entriesSection?.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  // darkMode: boolean = false;

  // toggleDarkMode() {
  //   this.darkMode = !this.darkMode;
  //   const body = document.body;
  //   const html = document.documentElement;

  //   if (this.darkMode) {
  //     body.classList.add('dark-mode-body');
  //     html.classList.add('dark-mode-body');
  //   } else {
  //     body.classList.remove('dark-mode-body');
  //     html.classList.remove('dark-mode-body');
  //   }
  // }

  formatXAxisTick = (val: string): string => {
    return val;
  };

  getDaysSinceLastError(): number {
    // Use complete dataset instead of filtered data to be independent of date filter
    if (!this.completeEntries || this.completeEntries.length === 0) return -1;
    
    // Sort entries by date to get the most recent error
    const sortedEntries = this.sortEntries([...this.completeEntries]);
    const lastErrorDate = new Date(sortedEntries[0].state_in_date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastErrorDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  getErrorCount(errorName: string): number {
    if (!this.statistics?.error_notes || !errorName) return 0;
    return this.statistics.error_notes[errorName]?.count || 0;
  }

  loadMostRecentEntry(): void {
    // Use the complete dataset (without date filters) for the Most Recent Activity card
    if (this.completeEntries && this.completeEntries.length > 0) {
      this.mostRecentEntry = this.completeEntries[0];
      console.log('Most recent entry from complete dataset:', this.mostRecentEntry);
    } else {
      console.log('No complete entries available for most recent entry');
      this.mostRecentEntry = null;
    }
  }

  // loadCompleteEntries(): void {
  //   // Load the complete dataset without date filters for the Most Recent Activity card
  //   const url = `http://127.0.0.1:8000/api/tools/?equip_id=${this.equipId}`;
  //   console.log('Loading complete entries from URL:', url);
    
  //   this.http.get<any[]>(url).subscribe({
  //     next: (tools) => {
  //       console.log('Complete entries received:', tools);
  //       // Process the complete dataset
  //       const allEntries: Entry[] = tools.map(tool => ({
  //         state_in_date: tool.state_in_date,
  //         event_code: tool.event_code,
  //         error_name: tool.error_name,
  //         error_description: tool.error_description
  //       }));
        
  //       // Filter out PM entries and sort by date (most recent first)
  //       this.completeEntries = this.sortEntries(allEntries.filter((e) => e.error_name !== 'Unknown'));
  //       console.log('Complete entries processed:', this.completeEntries.length);
        
  //       // Update the most recent entry
  //       this.loadMostRecentEntry();
  //     },
  //     error: (error) => {
  //       console.error('Error loading complete entries:', error);
  //       this.completeEntries = [];
  //       this.mostRecentEntry = null;
  //     }
  //   });
  // }
}
