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
  error_location?: string;
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

interface ErrorLocation {
  name: string;
  value: number;
  equipment: string;
}

interface ErrorLocationByEquipment {
  name: string;
  series: { name: string; value: number }[];
}

interface ErrorLocationDetail {
  location: string;
  errorName: string;
  count: number;
  percentage: number;
  equipment: string;
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

  // Error location properties
  errorLocationData: ErrorLocation[] = [];
  errorLocationByEquipmentData: ErrorLocationByEquipment[] = [];
  errorLocationDetails: ErrorLocationDetail[] = [];
  totalErrorLocations: number = 0;
  uniqueErrorLocations: number = 0;
  mostCommonErrorLocation: string = 'N/A';
  mostCommonErrorLocationErrors: { name: string; count: number }[] = [];

  // Unfiltered error location properties (for summary card)
  unfilteredMostCommonErrorLocation: string = 'N/A';
  unfilteredUniqueErrorLocations: number = 0;
  unfilteredMostCommonErrorLocationErrors: { name: string; count: number }[] = [];

  // Date filter properties
  startDate: string = '';
  endDate: string = '';
  isLoading: boolean = false;
  isDateFilterLoading: boolean = false;

  @ViewChild('entriesSection') entriesSection!: ElementRef;
  @ViewChild('errorLocationSection') errorLocationSection!: ElementRef;
  @ViewChild('dateFilter') dateFilter!: DateFilterComponent;

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

  showAllErrorLocationDetails: boolean = false;
  showAllErrorEntries: boolean = false;

  activeErrorNameFilter: string | null = null;
  activeMonthFilter: { month: number, year: number } | null = null;

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
    // Test error location extraction
    this.testErrorLocationExtraction();
    
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
        // Process error locations after all data is loaded
        this.processErrorLocations();
        this.isLoading = false;
        // Stop the date filter loading state
        if (this.dateFilter) {
          this.dateFilter.stopLoading();
        }
        this.isDateFilterLoading = false;
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
        // Process error locations even on error
        this.processErrorLocations();
        this.isLoading = false;
        // Stop the date filter loading state
        if (this.dateFilter) {
          this.dateFilter.stopLoading();
        }
        this.isDateFilterLoading = false;
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


  // loadToolEntries(): void {
  //   // Load actual tool entries for the equipment
  //   let url = `http://127.0.0.1:8000/api/tools/?equip_id=${this.equipId}`;
  //   const params: string[] = [];
    
  //   if (this.startDate) {
  //     params.push(`start_date=${this.startDate}`);
  //   }
  //   if (this.endDate) {
  //     params.push(`end_date=${this.endDate}`);
  //   }
    
  //   if (params.length > 0) {
  //     url += '&' + params.join('&');
  //   }
    
  //   console.log('Loading tool entries from URL:', url);
    
  //   this.http.get<any[]>(url).subscribe({
  //     next: (tools) => {
  //       console.log('Tool entries received:', tools);
  //       this.processToolEntries(tools);
  //       this.applyDateFilters();
  //       this.processErrorLocations();
  //       this.processUnfilteredErrorLocations();
  //       this.renderEquipEntries();
  //       this.prepareErrorByEquipData();
  //       this.fetchStatisticsGraph(this.equipId);
  //       this.loadMostRecentEntry();
  //     },
  //     error: (error) => {
  //       console.error('Error loading tool entries:', error);
  //       this.processToolEntries([]);
  //     }
  //   });
  // }
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
        this.applyDateFilters();
        this.processErrorLocations();
        this.processUnfilteredErrorLocations();
        this.renderEquipEntries();
        this.prepareErrorByEquipData();
        this.loadMostRecentEntry();
      },
      error: (error) => {
        console.error('Error loading tool entries:', error);
        this.processToolEntries([]);
      }
    });
  }

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
    
    // Process error locations for the filtered data
    this.processErrorLocations();
    
    console.log('Filtered entries processed:', this.entries.length);
    console.log('Filtered entries for display:', this.filteredEntries.length);
  }
  
  private applyDateFilters(): void {
    if (this.startDate || this.endDate) {
      this.filteredEntries = this.sortEntries(
        this.entries.filter((entry) => {
          const entryDate = entry.state_in_date.split('T')[0];
          const isAfterStart = !this.startDate || entryDate >= this.startDate;
          const isBeforeEnd = !this.endDate || entryDate <= this.endDate;
          return isAfterStart && isBeforeEnd && entry.error_name !== 'Unknown';
        })
      );
    } else {
      this.filteredEntries = this.sortEntries(this.entries.filter((e) => e.error_name !== 'Unknown'));
    }
    this.processErrorLocations();
    this.processUnfilteredErrorLocations();
  }
  
  onDateRangeChange(dateRange: DateRange): void {
    console.log('Date range changed:', dateRange);
    this.startDate = dateRange.startDate;
    this.endDate = dateRange.endDate;
    this.isDateFilterLoading = true;
    this.loadStatistics();
  }
  
  onFilterCleared(): void {
    console.log('Date filter cleared');
    this.startDate = '';
    this.endDate = '';
    this.isDateFilterLoading = true;
    this.loadStatistics();
  }

  onDateFilterLoadingStarted(): void {
    this.isDateFilterLoading = true;
  }

  onDateFilterLoadingEnded(): void {
    this.isDateFilterLoading = false;
  }

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

  // transformData(data: any) {
  //   console.log('Transforming data:', data);
    
  //   // Initialize default values
  //   this.errorFrequencyData = [];
  //   this.lineChartData = [];
  //   this.errorNotesData = [];
  //   this.heatmapData = [];

  //   // Check if we have error frequency data
  //   if (!data.error_frequency || data.error_frequency.length === 0) {
  //     console.log('No error frequency data found');
  //     return;
  //   }

  //   // Parse dates without timezone conversion
  //   const allDates = data.error_frequency.map((item: any) => {
  //     const dateStr = item.date.split('T')[0]; // Get YYYY-MM-DD part
  //     const [year, month, day] = dateStr.split('-').map(Number);
  //     return { year, month: month - 1, day }; // month is 0-indexed in JS
  //   });
    
  //   const minYear = Math.min(...allDates.map((d: any) => d.year));
  //   const maxYear = Math.max(...allDates.map((d: any) => d.year));

  //   const dateRange: string[] = [];
  //   for (let year = minYear; year <= maxYear; year++) {
  //     for (let month = 0; month < 12; month++) {
  //       const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  //       dateRange.push(dateStr);
  //     }
  //   }

  //   const errorFrequencyDict: { [key: string]: { [error: string]: number } } = {};
  //   const monthlyTotals: { [key: string]: number } = {};
  //   const dailyTotals: { [key: string]: number } = {};

  //   dateRange.forEach((d) => (errorFrequencyDict[d] = {}));

  //   for (const item of data.error_frequency) {
  //     if (item.error_name === 'Unknown') continue;

  //     const fullDate = item.date.split('T')[0];
  //     const [year, month, day] = fullDate.split('-').map(Number);
  //     const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;

  //     if (!errorFrequencyDict[monthStart][item.error_name]) {
  //       errorFrequencyDict[monthStart][item.error_name] = 0;
  //     }

  //     errorFrequencyDict[monthStart][item.error_name] += item.count;
  //     monthlyTotals[monthStart] = (monthlyTotals[monthStart] || 0) + item.count;
  //     dailyTotals[fullDate] = (dailyTotals[fullDate] || 0) + item.count;
  //   }

  //   this.errorFrequencyData = dateRange.map((dateKey, i) => ({
  //     name: this.getMonthYearLabel(i % 12, minYear + Math.floor(i / 12)),
  //     extra: { date: dateKey },
  //     series: Object.entries(errorFrequencyDict[dateKey]).map(
  //       ([error, count]) => ({
  //         name: error,
  //         value: count,
  //       })
  //     ),
  //   }));

  //   this.lineChartData = [
  //     {
  //       name: 'Total Errors',
  //       series: dateRange.map((dateKey, i) => ({
  //         name: this.getMonthYearLabel(i % 12, minYear + Math.floor(i / 12)),
  //         value: monthlyTotals[dateKey] || 0,
  //       })),
  //     },
  //   ];

  //   // Handle error notes data
  //   if (data.error_notes) {
  //     this.errorNotesData = Object.keys(data.error_notes)
  //       .filter((key) => key !== 'Unknown')
  //       .map((key) => ({
  //         name: key,
  //         value: data.error_notes[key].count,
  //       }));
  //   }

  //   this.heatmapData = Object.entries(dailyTotals).map(([date, count]) => ({
  //     date,
  //     count,
  //   }));

  //   console.log('Transformed data:', {
  //     errorFrequencyData: this.errorFrequencyData,
  //     lineChartData: this.lineChartData,
  //     errorNotesData: this.errorNotesData
  //   });
  // }

  transformData(data: any) {
    console.log('Transforming data with date filters:', data, { startDate: this.startDate, endDate: this.endDate });
    
    // Initialize default values
    this.errorFrequencyData = [];
    this.lineChartData = [];
    this.errorNotesData = [];
    this.heatmapData = [];
  
    // Handle error notes data for pie chart (this should respect date filters)
    if (data.error_notes) {
      this.errorNotesData = Object.keys(data.error_notes)
        .filter((key) => key !== 'Unknown')
        .map((key) => ({
          name: key,
          value: data.error_notes[key].count,
        }));
      
      console.log('Error notes data for pie chart (filtered):', this.errorNotesData);
    }
  
    // Check if we have error frequency data for trend charts
    if (!data.error_frequency || data.error_frequency.length === 0) {
      console.log('No error frequency data found for trend charts');
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
  
    // Process error frequency data for trend charts (unfiltered for complete view)
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
    this.activeErrorNameFilter = event.name;
    this.filteredEntries = this.sortEntries(
      this.entries.filter((entry) => entry.error_name === event.name && entry.error_name !== 'Unknown')
    );
    this.processErrorLocations(); // Recalculate error location data for this error name
    this.errorLocationSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Add a small delay and scroll up a bit more to show the filter alert
    setTimeout(() => {
      window.scrollBy({ top: -120, behavior: 'smooth' });
    }, 100);
  }

  onMonthSelect(event: any): void {
    // A legend click event in ngx-charts often returns the series name as a string
    if (typeof event === 'string') {
      // This handles a legend click, filtering by the error name.
      this.selectedErrorName = event;
      this.activeErrorNameFilter = event;
      this.activeMonthFilter = null;
      this.filteredEntries = this.sortEntries(
        this.entries.filter((entry) => entry.error_name === this.selectedErrorName && entry.error_name !== 'Unknown')
      );
      this.processErrorLocations();
    } 
    // A bar click event returns an object with details
    else if (event.series) {
      // This handles a bar click, filtering by the month.
      const [month, year] = event.series?.split(' ') ?? [];
      if (!month || !year) return; // Exit if parsing fails

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = monthNames.indexOf(month);
      this.activeMonthFilter = { month: monthIndex, year: parseInt(year) };
      this.selectedErrorName = `Month: ${event.series}`;
      this.activeErrorNameFilter = null;
      this.filteredEntries = this.sortEntries(
        this.entries.filter((entry) => {
          const dateStr = entry.state_in_date.split('T')[0];
          const [entryYear, entryMonth] = dateStr.split('-').map(Number);
          return entryYear === parseInt(year) && (entryMonth - 1) === monthIndex && entry.error_name !== 'Unknown';
        })
      );
      this.processErrorLocations();
    }
    this.errorLocationSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Add a small delay and scroll up a bit more to show the filter alert
    setTimeout(() => {
      window.scrollBy({ top: -120, behavior: 'smooth' });
    }, 100);
  }

  onTrendSelect(event: any): void {
    const [month, year] = event.name?.split(' ') ?? [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = monthNames.indexOf(month);
    this.activeMonthFilter = { month: monthIndex, year: parseInt(year) };
    this.selectedErrorName = `${month} ${year}`;
    this.activeErrorNameFilter = null;
    this.filteredEntries = this.sortEntries(
      this.entries.filter((entry) => {
        const dateStr = entry.state_in_date.split('T')[0];
        const [entryYear, entryMonth] = dateStr.split('-').map(Number);
        return entryYear === parseInt(year) && (entryMonth - 1) === monthIndex && entry.error_name !== 'Unknown';
      })
    );
    this.processErrorLocations();
    this.errorLocationSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Add a small delay and scroll up a bit more to show the filter alert
    setTimeout(() => {
      window.scrollBy({ top: -120, behavior: 'smooth' });
    }, 100);
  }

  onErrorLocationSelect(event: any): void {
    // Handle pie chart selection for error locations
    if (event && event.name) {
      this.selectedErrorName = `Location: ${event.name}`;
      this.filteredEntries = this.sortEntries(
        this.entries.filter((entry) => {
          const location = this.extractErrorLocation(entry.error_description);
          return location === event.name && entry.error_name !== 'Unknown';
        })
      );
      this.errorLocationSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Add a small delay and scroll up a bit more to show the filter alert
      setTimeout(() => {
        window.scrollBy({ top: -120, behavior: 'smooth' });
      }, 100);
    }
  }

  onErrorLocationBarSelect(event: any): void {
    // For stacked bar, event.series is the error location
    if (event && event.series) {
      this.selectedErrorName = `Location: ${event.series}`;
      this.filteredEntries = this.sortEntries(
        this.entries.filter((entry) =>
          entry.error_location === event.series && entry.error_name !== 'Unknown'
        )
      );
      this.errorLocationSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Add a small delay and scroll up a bit more to show the filter alert
      setTimeout(() => {
        window.scrollBy({ top: -120, behavior: 'smooth' });
      }, 100);
    }
  }

  filterByLocationAndError(location: string, errorName: string): void {
    this.selectedErrorName = `${location} - ${errorName}`;
    this.filteredEntries = this.sortEntries(
      this.entries.filter((entry) => {
        const extractedLocation = this.extractErrorLocation(entry.error_description);
        return extractedLocation === location && 
               entry.error_name === errorName && 
               entry.error_name !== 'Unknown';
      })
    );
    this.errorLocationSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Add a small delay and scroll up a bit more to show the filter alert
    setTimeout(() => {
      window.scrollBy({ top: -120, behavior: 'smooth' });
    }, 100);
  }

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

  extractErrorLocation(description: string): string {
    if (!description || description.trim() === '') {
      return 'Unknown';
    }

    // Pattern 1: Standard format with error code and location
    // Example: "856120: 20824 MUTBAPCCBP V286 AlarmSet 074 MOHTA00001 856120"
    const pattern1 = /^\d+:\s+\d+\s+([A-Z0-9]+)\s+V\d+/;
    const match1 = description.match(pattern1);
    if (match1) {
      return match1[1];
    }

    // Pattern 2: Format with error code and location in middle
    // Example: "854123: 03341 TAVLAC58P4 V286 AlarmSet 006 MOHTA00001"
    const pattern2 = /^\d+:\s+\d+\s+([A-Z0-9]+)\s+V\d+/;
    const match2 = description.match(pattern2);
    if (match2) {
      return match2[1];
    }

    // Pattern 3: Template format with error location
    // Example: "854265: 13703 SORTAY03P1 V143 AlarmSet 003 MOHTA00001 R_VEHICLE ERROR Template:..."
    const pattern3 = /^\d+:\s+\d+\s+([A-Z0-9]+)\s+V\d+/;
    const match3 = description.match(pattern3);
    if (match3) {
      return match3[1];
    }

    // Pattern 4: Template format without standard structure
    // Example: "R_VEHICLE ERROR Template: <Start> <Error State>: 854674: 20790 EB3XAPJDP3 V143 AlarmSet 074 MOHTA00001..."
    const pattern4 = /(\d+:\s+\d+\s+[A-Z0-9]+\s+V\d+)/;
    const match4 = description.match(pattern4);
    if (match4) {
      const locationMatch = match4[1].match(/\d+:\s+\d+\s+([A-Z0-9]+)\s+V\d+/);
      if (locationMatch) {
        return locationMatch[1];
      }
    }

    // Pattern 5: Look for any sequence of uppercase letters and numbers that might be a location
    // This is a fallback for non-standard formats
    const pattern5 = /\b([A-Z0-9]{6,12})\b/g;
    const matches = [...description.matchAll(pattern5)];
    
    // Filter out common non-location patterns
    const excludePatterns = [
      /^MOHTA/, // Equipment IDs
      /^V\d+$/, // Version numbers
      /^ALARM/, // Alarm related
      /^ERROR/, // Error related
      /^TEMPLATE/, // Template related
      /^START/, // Start/End markers
      /^END$/, // End markers
      /^RECOVERY/, // Recovery related
      /^TROUBLESHOOT/, // Troubleshoot related
      /^POSSIBLE/, // Possible cause related
    ];

    for (const match of matches) {
      const candidate = match[1];
      const isExcluded = excludePatterns.some(pattern => pattern.test(candidate));
      if (!isExcluded && candidate.length >= 6) {
        return candidate;
      }
    }

    return 'Unknown';
  }

  processErrorLocations(): void {
    // Use only filtered entries for summary and pie chart
    const locationCounts: { [location: string]: number } = {};
    const locationByEquipment: { [location: string]: { [equip: string]: number } } = {};
    const locationErrorDetails: { [location: string]: { [errorName: string]: number } } = {};

    // Filter by error name and/or month if set
    let entriesToUse = this.entries;
    if (this.activeErrorNameFilter) {
      entriesToUse = entriesToUse.filter(e => e.error_name === this.activeErrorNameFilter);
    }
    if (this.activeMonthFilter) {
      entriesToUse = entriesToUse.filter(e => {
        const dateStr = e.state_in_date.split('T')[0];
        const [entryYear, entryMonth] = dateStr.split('-').map(Number);
        return entryYear === this.activeMonthFilter!.year && (entryMonth - 1) === this.activeMonthFilter!.month;
      });
    }

    entriesToUse.forEach(entry => {
      if (entry.error_name !== 'Unknown') {
        const location = this.extractErrorLocation(entry.error_description);
        if (location.startsWith('8')) return; // Exclude all locations starting with '8'
        entry.error_location = location;
        // Count locations
        locationCounts[location] = (locationCounts[location] || 0) + 1;
        // Count by equipment
        if (!locationByEquipment[location]) {
          locationByEquipment[location] = {};
        }
        locationByEquipment[location][this.equipId] = (locationByEquipment[location][this.equipId] || 0) + 1;
        // Count by error name for each location
        if (!locationErrorDetails[location]) {
          locationErrorDetails[location] = {};
        }
        locationErrorDetails[location][entry.error_name] = (locationErrorDetails[location][entry.error_name] || 0) + 1;
      }
    });

    // Only use filtered entries for errorLocationData and summary
    this.errorLocationData = Object.entries(locationCounts)
      .filter(([location]) => location !== 'Unknown' && !location.startsWith('8'))
      .map(([location, count]) => ({
        name: location,
        value: count,
        equipment: this.equipId
      }))
      .sort((a, b) => b.value - a.value);

    // Convert to equipment-specific format
    this.errorLocationByEquipmentData = Object.entries(locationByEquipment)
      .filter(([location]) => location !== 'Unknown' && !location.startsWith('8'))
      .map(([location, equipmentCounts]) => ({
        name: location,
        series: Object.entries(equipmentCounts).map(([equip, count]) => ({
          name: equip,
          value: count
        }))
      }))
      .sort((a, b) => {
        const aTotal = a.series.reduce((sum, s) => sum + s.value, 0);
        const bTotal = b.series.reduce((sum, s) => sum + s.value, 0);
        return bTotal - aTotal;
      });

    // Generate detailed error location data for table
    this.errorLocationDetails = [];
    Object.entries(locationErrorDetails)
      .filter(([location]) => location !== 'Unknown' && !location.startsWith('8'))
      .forEach(([location, errorCounts]) => {
        Object.entries(errorCounts).forEach(([errorName, count]) => {
          this.errorLocationDetails.push({
            location: location,
            errorName: errorName,
            count: count,
            percentage: 0, // Keep for interface compatibility but not used
            equipment: this.equipId
          });
        });
      });

    // Sort by count descending, then by location, then by error name
    this.errorLocationDetails.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.location !== b.location) return a.location.localeCompare(b.location);
      return a.errorName.localeCompare(b.errorName);
    });

    // Calculate statistics
    this.totalErrorLocations = this.errorLocationData.reduce((sum, loc) => sum + loc.value, 0);
    this.uniqueErrorLocations = this.errorLocationData.length;
    this.mostCommonErrorLocation = this.errorLocationData.length > 0 ? this.errorLocationData[0].name : 'N/A';

    // Find all error names and counts for the most common error location
    if (this.mostCommonErrorLocation !== 'N/A') {
      const errorMap: { [name: string]: number } = {};
      this.entries.forEach(entry => {
        if (entry.error_location === this.mostCommonErrorLocation && entry.error_name !== 'Unknown') {
          errorMap[entry.error_name] = (errorMap[entry.error_name] || 0) + 1;
        }
      });
      this.mostCommonErrorLocationErrors = Object.entries(errorMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    } else {
      this.mostCommonErrorLocationErrors = [];
    }

    console.log('Error locations processed:', {
      totalLocations: this.totalErrorLocations,
      uniqueLocations: this.uniqueErrorLocations,
      mostCommon: this.mostCommonErrorLocation,
      locationData: this.errorLocationData,
      byEquipment: this.errorLocationByEquipmentData,
      details: this.errorLocationDetails
    });
  }

  processUnfilteredErrorLocations(): void {
    // Calculate unfiltered error location statistics for the summary card
    const locationCounts: { [location: string]: number } = {};
    const locationErrorDetails: { [location: string]: { [errorName: string]: number } } = {};

    // Use all entries without any filters
    this.entries.forEach(entry => {
      if (entry.error_name !== 'Unknown') {
        const location = this.extractErrorLocation(entry.error_description);
        if (location.startsWith('8')) return; // Exclude all locations starting with '8'
        entry.error_location = location;
        // Count locations
        locationCounts[location] = (locationCounts[location] || 0) + 1;
        // Count by error name for each location
        if (!locationErrorDetails[location]) {
          locationErrorDetails[location] = {};
        }
        locationErrorDetails[location][entry.error_name] = (locationErrorDetails[location][entry.error_name] || 0) + 1;
      }
    });

    // Calculate unfiltered statistics
    const unfilteredLocationData = Object.entries(locationCounts)
      .filter(([location]) => location !== 'Unknown' && !location.startsWith('8'))
      .map(([location, count]) => ({
        name: location,
        value: count
      }))
      .sort((a, b) => b.value - a.value);

    this.unfilteredUniqueErrorLocations = unfilteredLocationData.length;
    this.unfilteredMostCommonErrorLocation = unfilteredLocationData.length > 0 ? unfilteredLocationData[0].name : 'N/A';

    // Find all error names and counts for the unfiltered most common error location
    if (this.unfilteredMostCommonErrorLocation !== 'N/A') {
      const errorMap: { [name: string]: number } = {};
      this.entries.forEach(entry => {
        if (entry.error_location === this.unfilteredMostCommonErrorLocation && entry.error_name !== 'Unknown') {
          errorMap[entry.error_name] = (errorMap[entry.error_name] || 0) + 1;
        }
      });
      this.unfilteredMostCommonErrorLocationErrors = Object.entries(errorMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    } else {
      this.unfilteredMostCommonErrorLocationErrors = [];
    }

    console.log('Unfiltered error locations processed:', {
      uniqueLocations: this.unfilteredUniqueErrorLocations,
      mostCommon: this.unfilteredMostCommonErrorLocation,
      errors: this.unfilteredMostCommonErrorLocationErrors
    });
  }

  // Test method for error location extraction
  testErrorLocationExtraction(): void {
    const testCases = [
      {
        description: "856120: 20824 MUTBAPCCBP V286 AlarmSet 074 MOHTA00001 856120",
        expected: "MUTBAPCCBP"
      },
      {
        description: "854123: 03341 TAVLAC58P4 V286 AlarmSet 006 MOHTA00001",
        expected: "TAVLAC58P4"
      },
      {
        description: "854265: 13703 SORTAY03P1 V143 AlarmSet 003 MOHTA00001 R_VEHICLE ERROR Template: <Start> <Error State>: 854265: 13703 SORTAY03P1 V143 AlarmSet 003 MOHTA00001 Veh pick up foup and hoist up half way. Able to clear alarm and HP. Pening follow up <Recovery>: <Troubleshoot procedure>: <Possible Cause>: <End>. GUCHENYI",
        expected: "SORTAY03P1"
      },
      {
        description: "R_VEHICLE ERROR Template: <Start> <Error State>: 854674: 20790 EB3XAPJDP3 V143 AlarmSet 074 MOHTA00001. Veh encounter E84 error in pickup job. Hand unit hoisted up halfway until the length near to the RFID reader. <Recovery>: When executed 2091, the hand unit hoisted up at the speed of 2022. Veh got prev history for the same error. <Troubleshoot procedure>: Need MIT team help to T/S. <Possible Cause>: <End>. ACHINNASAMY",
        expected: "EB3XAPJDP3"
      }
    ];

    console.log('Testing error location extraction:');
    testCases.forEach((testCase, index) => {
      const result = this.extractErrorLocation(testCase.description);
      const success = result === testCase.expected;
      console.log(`Test ${index + 1}: ${success ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`  Input: ${testCase.description.substring(0, 50)}...`);
      console.log(`  Expected: ${testCase.expected}`);
      console.log(`  Got: ${result}`);
      console.log('');
    });
  }

  clearErrorFilter(): void {
    this.selectedErrorName = null;
    this.activeErrorNameFilter = null;
    this.activeMonthFilter = null;
    this.filteredEntries = this.sortEntries(this.entries.filter((e) => e.error_name !== 'Unknown'));
    this.processErrorLocations();
    this.processUnfilteredErrorLocations();
  }
}
