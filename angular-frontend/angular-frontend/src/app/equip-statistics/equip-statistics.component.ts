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
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
        // Set default values when there's an error
        this.statistics = {
          most_common_event_code: 'N/A',
          most_common_error_name: 'N/A',
          latest_error_date: 'N/A',
          error_frequency: [],
          error_notes: {}
        };
        this.transformData(this.statistics);
        this.loadToolEntries();
        this.isLoading = false;
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

  processToolEntries(tools: any[]): void {
    // Convert tools to entries format
    const allEntries: Entry[] = tools.map(tool => ({
      state_in_date: tool.state_in_date,
      event_code: tool.event_code,
      error_name: tool.error_name,
      error_description: tool.error_description
    }));

    // Separate error entries from PM entries
    this.entries = allEntries.filter((e) => e.error_name !== 'Unknown');
    this.filteredEntries = this.sortEntries(this.entries);
    
    // Set PM entries (entries with 'Unknown' error name)
    this.pmEntries = this.sortEntries(allEntries.filter((e) => e.error_name === 'Unknown'));
    this.pmCount = this.pmEntries.length;

    console.log('Processed entries:', {
      totalEntries: allEntries.length,
      errorEntries: this.entries.length,
      pmEntries: this.pmEntries.length,
      filteredEntries: this.filteredEntries.length
    });
  }

  // populateStatistics method removed - data is now displayed directly in template

  onDateRangeChange(dateRange: DateRange): void {
    this.startDate = dateRange.startDate;
    this.endDate = dateRange.endDate;
    this.loadStatistics();
  }

  onFilterCleared(): void {
    this.startDate = '';
    this.endDate = '';
    this.loadStatistics();
  }

  // setDateRange method removed - functionality now in date filter component

  sortEntries(entries: Entry[]): Entry[] {
    return [...entries].sort(
      (a, b) => new Date(b.state_in_date).getTime() - new Date(a.state_in_date).getTime()
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

    const allDates = data.error_frequency.map((item: any) => new Date(item.date));
    const minYear = Math.min(...allDates.map((d: Date) => d.getFullYear()));
    const maxYear = Math.max(...allDates.map((d: Date) => d.getFullYear()));

    const dateRange: string[] = [];
    for (let year = minYear; year <= maxYear; year++) {
      for (let month = 0; month < 12; month++) {
        const date = new Date(year, month, 1);
        dateRange.push(date.toISOString().split('T')[0]);
      }
    }

    const errorFrequencyDict: { [key: string]: { [error: string]: number } } = {};
    const monthlyTotals: { [key: string]: number } = {};
    const dailyTotals: { [key: string]: number } = {};

    dateRange.forEach((d) => (errorFrequencyDict[d] = {}));

    for (const item of data.error_frequency) {
      if (item.error_name === 'Unknown') continue;

      const fullDate = item.date.split('T')[0];
      const date = new Date(item.date);
      const monthStart = new Date(
        date.getFullYear(),
        date.getMonth(),
        1
      ).toISOString().split('T')[0];

      if (!errorFrequencyDict[monthStart][item.error_name]) {
        errorFrequencyDict[monthStart][item.error_name] = 0;
      }

      errorFrequencyDict[monthStart][item.error_name] += item.count;
      monthlyTotals[monthStart] = (monthlyTotals[monthStart] || 0) + item.count;
      dailyTotals[fullDate] = (dailyTotals[fullDate] || 0) + item.count;
    }

    this.errorFrequencyData = dateRange.map((dateKey, i) => ({
      name: this.getMonthYearLabel(i, minYear),
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
          name: this.getMonthYearLabel(i, minYear),
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
          value: data.error_notes[key].length,
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
    const date = new Date(year, month, 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      // Format as YYYY-MM-DD HH:MM:SS
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'N/A';
    }
  }

  onErrorSelect(event: any) {
    this.selectedErrorName = event.name;
    this.filteredEntries = this.sortEntries(
      this.entries.filter((entry) => entry.error_name === event.name)
    );
    this.entriesSection?.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  clearErrorFilter(): void {
    this.selectedErrorName = null;
    this.filteredEntries = this.sortEntries(this.entries);
  }

  onMonthSelect(event: any): void {
    const [month, year] = event.series?.split(' ') ?? [];
    const monthIndex = new Date(Date.parse(`${month} 1, 2000`)).getMonth();

    this.filteredEntries = this.sortEntries(
      this.entries.filter((entry) => {
        const date = new Date(entry.state_in_date);
        return (
          date.getFullYear() === parseInt(year) && date.getMonth() === monthIndex
        );
      })
    );

    this.selectedErrorName = `${month} ${year}`;
    this.renderEquipEntries();

    this.entriesSection?.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  onTrendSelect(event: any): void {
    const [month, year] = event.name?.split(' ') ?? [];
    const monthIndex = new Date(Date.parse(`${month} 1, 2000`)).getMonth();

    this.filteredEntries = this.sortEntries(
      this.entries.filter((entry) => {
        const date = new Date(entry.state_in_date);
        return (
          date.getFullYear() === parseInt(year) && date.getMonth() === monthIndex
        );
      })
    );

    this.selectedErrorName = `${month} ${year}`;
    this.renderEquipEntries();

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
    if (!val.includes('-')) return val;
    const [year, month] = val.split('-').map(Number);
    const date = new Date(year, month - 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  };
}
