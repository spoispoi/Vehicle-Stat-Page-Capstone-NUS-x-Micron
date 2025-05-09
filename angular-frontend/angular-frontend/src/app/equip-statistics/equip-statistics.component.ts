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
  CommonModule,
  isPlatformBrowser,
  ViewportScroller,
} from '@angular/common';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { Color, ScaleType, LegendPosition } from '@swimlane/ngx-charts';
import { curveMonotoneX } from 'd3-shape';

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
  series: { name: string; value: number }[];
}

@Component({
  selector: 'app-equip-statistics',
  templateUrl: './equip-statistics.component.html',
  styleUrls: ['./equip-statistics.component.css'],
  standalone: true,
  imports: [RouterOutlet, NgxChartsModule, CommonModule],
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
    const equipIdParam = this.route.snapshot.paramMap.get('equip_id');
    if (equipIdParam) {
      this.equipId = equipIdParam;
      this.fetchStatistics(this.equipId);
      this.fetchEquipEntries(this.equipId);
      this.fetchStatisticsGraph(this.equipId);
    }
  }

 ngAfterViewInit(): void {
  if (this.isBrowser) {
    setTimeout(() => {
      requestAnimationFrame(() => {
        const body = document.body;

        console.log('[Scroll Fix] body.scrollTop before:', body.scrollTop);
        body.scrollTo({ top: 0, behavior: 'smooth' });

        setTimeout(() => {
          console.log('[Scroll Fix] body.scrollTop after:', body.scrollTop);
        }, 500);
      });
    }, 100); // small delay to wait for charts/data load
  }
}

  fetchStatistics(equipId: string): void {
    this.statisticsService.getStatistics(equipId).subscribe(
      (data) => {
        this.statistics = data;
        this.populateStatistics();
      },
      (error) => {
        console.error('Error fetching statistics:', error);
      }
    );
  }

  populateStatistics(): void {
    if (this.isBrowser) {
      document.getElementById('most-common-event-code')!.textContent =
        this.statistics.most_common_event_code;
      document.getElementById('most-common-error-name')!.textContent =
        this.statistics.most_common_error_name;
      document.getElementById('latest-error-date')!.textContent =
        this.statistics.latest_error_date;
    }
  }

  fetchEquipEntries(equipId: string): void {
    this.http
      .get<Entry[]>(`/api/tools/?equip_id=${equipId}`)
      .subscribe((data) => {
        this.pmEntries = data.filter((e) => e.error_name === 'Unknown');
        this.pmCount = this.pmEntries.length;
        this.entries = data.filter((e) => e.error_name !== 'Unknown');

        this.filteredEntries = [...this.entries].sort(
          (a, b) =>
            new Date(b.state_in_date).getTime() -
            new Date(a.state_in_date).getTime()
        );

        this.renderEquipEntries();
        this.prepareErrorByEquipData();
      });
  }

  renderEquipEntries(): void {
    if (this.isBrowser) {
      const container = document.getElementById('equip-entries-container');
      if (container) {
        container.innerHTML = '';
        this.filteredEntries.sort(
          (a, b) =>
            new Date(b.state_in_date).getTime() -
            new Date(a.state_in_date).getTime()
        );

        this.filteredEntries.forEach((entry) => {
          const div = document.createElement('div');
          div.classList.add('equip-entry');
          div.innerHTML = `
            <strong>State In Date:</strong> ${this.formatDate(entry.state_in_date)} <br>
            <strong>Event Code:</strong> ${entry.event_code} <br>
            <strong>Error Name:</strong> ${entry.error_name} <br>
            <strong>Error Description:</strong> ${entry.error_description} <br>
            <hr>
          `;
          container.appendChild(div);
        });
      }
    }
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
    if (!data.error_frequency || data.error_frequency.length === 0) return;

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

    this.errorNotesData = Object.keys(data.error_notes || {})
      .filter((key) => key !== 'Unknown')
      .map((key) => ({
        name: key,
        value: data.error_notes[key].length,
      }));

    this.heatmapData = Object.entries(dailyTotals).map(([date, count]) => ({
      date,
      count,
    }));
  }

  getMonthYearLabel(month: number, year: number): string {
    const date = new Date(year, month, 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  }

  formatDate(dateString: string | null): string {
    if (dateString) {
      const date = new Date(dateString);
      return date.toLocaleString();
    }
    return '';
  }

  onErrorSelect(event: any) {
    this.selectedErrorName = event.name;
    this.filteredEntries = this.entries.filter(
      (entry) => entry.error_name === event.name
    );
    this.renderEquipEntries();

    if (this.entriesSection?.nativeElement) {
      this.entriesSection.nativeElement.scrollIntoView({ behavior: 'smooth' });
    }
  }

  clearErrorFilter(): void {
    this.selectedErrorName = null;
    this.filteredEntries = [...this.entries];
    this.renderEquipEntries();

    this.viewportScroller.scrollToPosition([0, 0]);
  }

  onMonthSelect(event: any): void {
    const [month, year] = event.series?.split(' ') ?? [];
    const monthIndex = new Date(Date.parse(`${month} 1, 2000`)).getMonth();

    this.filteredEntries = this.entries.filter((entry) => {
      const date = new Date(entry.state_in_date);
      return (
        date.getFullYear() === parseInt(year) && date.getMonth() === monthIndex
      );
    });

    this.selectedErrorName = `${month} ${year}`;
    this.renderEquipEntries();

    this.entriesSection?.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  onTrendSelect(event: any): void {
    const [month, year] = event.name?.split(' ') ?? [];
    const monthIndex = new Date(Date.parse(`${month} 1, 2000`)).getMonth();

    this.filteredEntries = this.entries.filter((entry) => {
      const date = new Date(entry.state_in_date);
      return (
        date.getFullYear() === parseInt(year) && date.getMonth() === monthIndex
      );
    });

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
