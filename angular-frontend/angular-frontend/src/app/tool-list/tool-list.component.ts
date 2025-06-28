import { Component, OnInit, Inject, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ToolService } from '../tool.service';
import { Renderer2 } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { Color, NgxChartsModule, ScaleType, LegendPosition } from '@swimlane/ngx-charts';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { DateFilterComponent, DateRange } from '../components/date-filter/date-filter.component';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';


@Component({
  selector: 'app-tool-list',
  standalone: true,
  imports: [RouterOutlet, NgxChartsModule, CommonModule, DateFilterComponent],
  templateUrl: './tool-list.component.html',
  styleUrls: ['./tool-list.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  animations: [
    trigger('collapseAnimation', [
      state('collapsed', style({ height: '0px', overflow: 'hidden', opacity: 0 })),
      state('expanded', style({ height: '*', opacity: 1 })),
      transition('collapsed <=> expanded', animate('300ms ease-in-out')),
    ]),
    trigger('fadeSlideLeft', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(40px)' }),
        animate('300ms cubic-bezier(0.4,0,0.2,1)', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.4,0,0.2,1)', style({ opacity: 0, transform: 'translateX(-40px)' }))
      ])
    ]),
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('90ms cubic-bezier(0.4,0,0.2,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('70ms cubic-bezier(0.4,0,0.2,1)', style({ opacity: 0, transform: 'translateY(30px)' }))
      ])
    ])
  ]
})
export class ToolListComponent implements OnInit, AfterViewInit {
  tools: any[] = [];
  filteredTools: any[] = [];
  toolsRaw: any[] = [];
  searchTerm: string = '';
  errorData: any[] = [];
  errorTrendData: any[] = [];
  errorTrendMultiLineData: any[] = [];
  top10ErrorData: any[] = [];
  equipIdErrorData: any[] = [];
  allErrorTypes: string[] = [];
  selectedErrorTypes: string[] = [];
  searchErrorTerm: string = '';
  filteredErrorTypes: string[] = [];

  // Date filter properties
  startDate: string = '';
  endDate: string = '';
  earliestDate: string = '';
  isLoading: boolean = false;

  // Top 10 equipment cache
  top10EquipIds: string[] = [];

  errorToEquipMap: { [key: string]: { name: string; value: number }[] } = {};
  equipToErrorMap: { [key: string]: { name: string; value: number }[] } = {};
  monthToErrorMap: { [key: string]: { name: string; value: number }[] } = {};
  monthToErrorMapFiltered: { [key: string]: { name: string; value: number }[] } = {}; // For summary table (affected by date filter)

  errorRowLoading: { [key: string]: boolean } = {};
  equipRowLoading: { [key: string]: boolean } = {};
  monthRowLoading: { [key: string]: boolean } = {};

  expandedErrorIndex: number | null = null;
  expandedEquipIndex: number | null = null;
  expandedMonthIndex: number | null = null;

  
  top5Months: any[] = [];
  top20Equipments: any[] = [];

  // KPI Properties
  topOccurringErrorName: string = 'N/A';
  topEquipment: string = 'N/A';
  topErrorForTopEquipment: string = 'N/A';
  topLocation: string = 'N/A';
  topLocationCount: number = 0;
  topLocationPercent: number = 0;
  topLocationTopErrors: { name: string; count: number }[] = [];

  isDarkMode: boolean = false;

  showDropdown: boolean = false;

  view: [number, number] = [1600, 1000];
  
  colorScheme: Color = {
    domain: ['#5AA454', '#A10A28', '#C7B42C', '#AAAAAA'],
    group: ScaleType.Ordinal,
    selectable: true,
    name: 'vivid'
  };

  colorSchemeSingle: Color = {
    domain: ['#ff6347'], // Nude color
    group: ScaleType.Ordinal,
    selectable: true,
    name: 'single'
  };
  
  colorSchemeTopCount: Color = {
    domain: ['#ff6347', '#d4a373'], // Top count in tomato color, others in nude color
    group: ScaleType.Ordinal,
    selectable: true,
    name: 'topCount'
  };

  colorSchemeEquipTopCount: Color = {
    domain: [], //  populate this dynamically
    group: ScaleType.Ordinal,
    selectable: true,
    name: 'equipTopCount'
  };
  
  legendPosition: LegendPosition = LegendPosition.Right;
  
  showAllLeaderboard: boolean = false;

  @ViewChild('collapsedTable') collapsedTableRef!: ElementRef<HTMLTableElement>;
  collapsedTableHeight: number = 0;

  // Error location properties for leaderboard
  errorLocationData: { name: string; value: number; equipment: string }[] = [];
  errorLocationDetails: { location: string; errorName: string; count: number; percentage: number; equipment: string; topErrors: { name: string; count: number }[]; most_recent_error: string; most_recent_date: string }[] = [];
  totalErrorLocations: number = 0;
  uniqueErrorLocations: number = 0;
  mostCommonErrorLocation: string = 'N/A';
  mostCommonErrorLocationErrors: { name: string; count: number }[] = [];
  showAllErrorLocationDetails: boolean = false;

  // Top Error Locations Horizontal Bar Chart properties
  topErrorLocationsData: any[] = [];
  selectedLocationName: string | null = null;
  locationToErrorMap: { [key: string]: { name: string; value: number }[] } = {};

  colorSchemeLocationTopCount: Color = {
    domain: [], // Will be populated dynamically like colorSchemeTopCount
    group: ScaleType.Ordinal,
    selectable: true,
    name: 'locationTopCount'
  };

  // Error Location Trend Chart properties
  errorLocationTrendMultiLineData: any[] = [];
  allLocationTypes: string[] = [];
  selectedLocationTypes: string[] = [];
  searchLocationTerm: string = '';
  filteredLocationTypes: string[] = [];
  showLocationDropdown: boolean = false;
  appliedLocationFilter: string = '';

  // Add new properties for complete data
  completeTools: any[] = []; // Complete dataset without date filters for charts that should show everything

  constructor(
    private toolService: ToolService,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTools();
    // Load complete data for charts that should not be affected by date filters
    this.loadCompleteData();
    // Open the summary card for the top error by default
    setTimeout(() => {
      if (this.top10ErrorData && this.top10ErrorData.length > 0) {
        this.selectedErrorName = this.top10ErrorData[0].name;
      }
      // Open the summary card for the top location by default
      if (this.topErrorLocationsData && this.topErrorLocationsData.length > 0) {
        this.selectedLocationName = this.topErrorLocationsData[0].name;
      }
    }, 0);
  }

  ngAfterViewInit(): void {
    this.setCollapsedTableHeight();
  }

  loadTools(): void {
    this.isLoading = true;
    
    this.toolService.getTools(this.startDate, this.endDate).subscribe({
      next: (tools) => {
        this.toolsRaw = tools;
        this.processToolsData(tools);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading tools:', error);
        this.isLoading = false;
      }
    });
  }

  loadCompleteData(): void {
    // Load the complete dataset without date filters for charts that should be independent
    this.toolService.getTools('', '').subscribe({
      next: (tools) => {
        console.log('Complete data received:', tools);
        this.completeTools = tools;
        this.processCompleteData(tools);
      },
      error: (error) => {
        console.error('Error loading complete data:', error);
        this.completeTools = [];
      }
    });
  }

  private processCompleteData(tools: any[]): void {
    // Process complete data for charts that should not be affected by date filters
    
    // 1. Error Trend by Month - use complete data (unchanged by date filters)
    this.errorTrendData = this.calculateMonthlyErrorTrend(tools);
    // Note: top5Months is now calculated based on filtered data in processToolsData()

    // 2. Error Trend by Error Type - use complete data
    this.allErrorTypes = [...new Set(tools.map(t => t.error_name).filter(name => name && name !== 'Unknown'))];
    this.selectedErrorTypes = this.allErrorTypes.slice(0, 5);
    this.filteredErrorTypes = [...this.allErrorTypes];
    this.generateMultiLineChart();

    // 3. Error Location Trend by Month - use complete data
    this.allLocationTypes = [...new Set(tools.map(t => {
      const location = this.extractErrorLocation(t.error_description);
      return location;
    }).filter(location => location && location !== 'Unknown' && !location.startsWith('8') && location.length > 0))];
    
    // Select the top 5 locations by count from complete data
    const locationCounts: { [key: string]: number } = {};
    const uniqueCombinations = new Set<string>();
    
    tools.forEach(t => {
      if (t.error_name && t.error_name !== 'Unknown') {
        const location = this.extractErrorLocation(t.error_description);
        if (location.startsWith('8') || location === 'Unknown' || location.length === 0) return;
        
        const uniqueKey = `${t.state_in_date}_${location}`;
        if (!uniqueCombinations.has(uniqueKey)) {
          uniqueCombinations.add(uniqueKey);
          locationCounts[location] = (locationCounts[location] || 0) + 1;
        }
      }
    });
    
    this.selectedLocationTypes = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
    
    this.filteredLocationTypes = [...this.allLocationTypes];
    this.generateLocationMultiLineChart();

    // Process month data for the complete dataset (for Error Trend by Month chart)
    this.errorTrendData.forEach(month => {
      this.monthRowLoading[month.name] = true;
      console.log(`Loading complete data for month: ${month.name}`);
      setTimeout(() => {
        this.monthToErrorMap[month.name] = this.getTopErrorsForMonth(month.name);
        console.log(`Complete data for month ${month.name}:`, this.monthToErrorMap[month.name]);
        this.monthRowLoading[month.name] = false;
      }, 300);
    });

    console.log('Complete data processed for unfiltered charts');
  }

  private calculateTop5MonthsFromFilteredData(tools: any[]): void {
    // Calculate top 5 months based on filtered data (affected by date filter)
    const monthlyTrend = this.calculateMonthlyErrorTrend(tools);
    this.top5Months = [...monthlyTrend].sort((a, b) => b.value - a.value).slice(0, 5);
    console.log('Top 5 months calculated from filtered data:', this.top5Months);
    
    // Populate month data for summary table using filtered data
    this.top5Months.forEach(month => {
      this.monthRowLoading[month.name] = true;
      console.log(`Loading filtered data for month: ${month.name}`);
      setTimeout(() => {
        this.monthToErrorMapFiltered[month.name] = this.getTopErrorsForMonthFromFilteredData(month.name);
        console.log(`Filtered data for month ${month.name}:`, this.monthToErrorMapFiltered[month.name]);
        this.monthRowLoading[month.name] = false;
      }, 300);
    });
  }

  private calculateKpiData(tools: any[], errorCounts: { [key: string]: number }, equipIdErrorCounts: { [key: string]: number }): void {
    // Top Occurring Error
    if (Object.keys(errorCounts).length > 0) {
      this.topOccurringErrorName = Object.entries(errorCounts).sort((a, b) => b[1] - a[1])[0][0];
    } else {
      this.topOccurringErrorName = 'N/A';
    }

    // Top Occurring Equipment and its top error
    if (Object.keys(equipIdErrorCounts).length > 0) {
      this.topEquipment = Object.entries(equipIdErrorCounts).sort((a, b) => b[1] - a[1])[0][0];
      
      const topEquipmentErrors = tools.filter(t => t.equip_id === this.topEquipment && t.error_name && t.error_name !== 'Unknown');
      
      if (topEquipmentErrors.length > 0) {
        const errorCountsForTopEquip: { [key: string]: number } = {};
        topEquipmentErrors.forEach(t => {
          errorCountsForTopEquip[t.error_name] = (errorCountsForTopEquip[t.error_name] || 0) + 1;
        });
        this.topErrorForTopEquipment = Object.entries(errorCountsForTopEquip).sort((a, b) => b[1] - a[1])[0][0];
      } else {
        this.topErrorForTopEquipment = 'N/A';
      }

    } else {
      this.topEquipment = 'N/A';
      this.topErrorForTopEquipment = 'N/A';
    }
  }

  onDateRangeChange(dateRange: DateRange): void {
    this.startDate = dateRange.startDate;
    this.endDate = dateRange.endDate;
    this.loadTools();
    // Note: loadCompleteData() is not called here, so the unfiltered charts remain unchanged
  }

  onFilterCleared(): void {
    this.startDate = '';
    this.endDate = '';
    this.loadTools();
    // Note: loadCompleteData() is not called here, so the unfiltered charts remain unchanged
  }

  private processToolsData(tools: any[]): void {
    // Calculate earliest date from tools data
    if (tools.length > 0) {
      const dates = tools.map(t => new Date(t.state_in_date)).filter(d => !isNaN(d.getTime()));
      if (dates.length > 0) {
        const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
        this.earliestDate = earliest.toISOString().split('T')[0];
      }
    }

    const equipIdErrorCounts = this.calculateEquipIdErrorCounts(tools);
    const errorCounts = this.calculateErrorCounts(tools);

    this.calculateKpiData(tools, errorCounts, equipIdErrorCounts);
    this.processLocationKpi(tools);
    this.processErrorLocations(); // Process error locations for leaderboard
    
    // Calculate top 5 months based on filtered data (affected by date filter)
    this.calculateTop5MonthsFromFilteredData(tools);
    
    // Note: The following charts are now handled by processCompleteData() and use unfiltered data
    // this.errorTrendData = this.calculateMonthlyErrorTrend(tools); // Moved to processCompleteData
    // this.top5Months = [...this.errorTrendData].sort((a, b) => b.value - a.value).slice(0, 5); // Moved to processCompleteData
    
    // Calculate top 10 equipment IDs once
    this.top10EquipIds = Object.entries(equipIdErrorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([equipId]) => equipId);

    const groupedTools = this.groupToolsByEquipId(tools);
    this.tools = groupedTools;
    this.filteredTools = [...this.tools];
    this.sortByErrorCount();

    this.top10ErrorData = this.formatTop10ChartData(errorCounts);

    // Set the default summary card to the top error after data is ready
    if (!this.selectedErrorName && this.top10ErrorData.length > 0) {
      this.selectedErrorName = this.top10ErrorData[0].name;
    }

    this.colorSchemeTopCount.domain = this.top10ErrorData.map((item, index) => 
      index === 0 ? '#ff6347' : '#484848' // Top count in red color, others in nude color
    );

    this.top10ErrorData.slice(0, 5).forEach(error => {
      this.errorRowLoading[error.name] = true;
      setTimeout(() => {
        this.errorToEquipMap[error.name] = this.getEquipmentsForError(error.name);
        this.errorRowLoading[error.name] = false;
      }, 300);
    });

    // Note: errorTrendData is now handled by processCompleteData()
    // this.errorTrendData = this.calculateMonthlyErrorTrend(tools); // Moved to processCompleteData

    // Note: top5Months is now handled by processCompleteData()
    // this.top5Months = [...this.errorTrendData].sort((a, b) => b.value - a.value).slice(0, 5); // Moved to processCompleteData

    this.equipIdErrorData = this.formatEquipIdChartData(equipIdErrorCounts);

    // Limit to top 20 equipments
    this.top20Equipments = this.equipIdErrorData.slice(0, 50);

    // Set the default summary card to the top equipment after data is ready
    if (!this.selectedEquipName && this.top20Equipments.length > 0) {
      this.selectedEquipName = this.top20Equipments[0].name;
    }

    this.colorSchemeEquipTopCount.domain = this.top20Equipments.map((item, index) => 
      index === 0 ? '#ff6347' : '#484848' // Top count in red color, others in nude color
    );

    this.equipIdErrorData.slice(0, 5).forEach(equip => {
      this.equipRowLoading[equip.name] = true;
      setTimeout(() => {
        this.equipToErrorMap[equip.name] = this.getErrorsForEquip(equip.name);
        this.equipRowLoading[equip.name] = false;
      }, 300);
    });

    // Note: Month data processing is now handled by processCompleteData()
    // this.errorTrendData.forEach(month => { ... }); // Moved to processCompleteData

    // Note: Error types and multi-line chart are now handled by processCompleteData()
    // this.allErrorTypes = [...new Set(tools.map(t => t.error_name).filter(name => name && name !== 'Unknown'))]; // Moved to processCompleteData
    // this.selectedErrorTypes = this.allErrorTypes.slice(0, 5); // Moved to processCompleteData
    // this.filteredErrorTypes = [...this.allErrorTypes]; // Moved to processCompleteData
    // this.generateMultiLineChart(); // Moved to processCompleteData

    // Note: Location types and location multi-line chart are now handled by processCompleteData()
    // this.allLocationTypes = [...new Set(tools.map(t => { ... }))]; // Moved to processCompleteData
    // this.selectedLocationTypes = Object.entries(locationCounts) ... // Moved to processCompleteData
    // this.filteredLocationTypes = [...this.allLocationTypes]; // Moved to processCompleteData
    // this.generateLocationMultiLineChart(); // Moved to processCompleteData

    // Load location data for top 5 locations (similar to Top 10 Errors)
    this.topErrorLocationsData.slice(0, 5).forEach(location => {
      setTimeout(() => {
        this.locationToErrorMap[location.name] = this.getErrorsForLocation(location.name);
      }, 300);
    });

    // Set the default summary card to the top location after data is ready
    if (!this.selectedLocationName && this.topErrorLocationsData.length > 0) {
      this.selectedLocationName = this.topErrorLocationsData[0].name;
    }
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
  }

  toggleError(index: number) {
    this.expandedErrorIndex = this.expandedErrorIndex === index ? null : index;
  }

  toggleEquip(index: number) {
    this.expandedEquipIndex = this.expandedEquipIndex === index ? null : index;
  }

  toggleMonth(index: number) {
    this.expandedMonthIndex = this.expandedMonthIndex === index ? null : index;
  }

  onSearch(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.filteredTools = this.tools.filter(tool => tool.equip_id.toLowerCase().includes(searchTerm));
    this.sortByErrorCount();
    //this.renderToolList();
  }

  navigateToStatistics(equipId: string): void {
    this.router.navigate(['/statistics', equipId]);
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);
    const seconds = ('0' + date.getSeconds()).slice(-2);
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  sortByEquipId(): void {
    this.tools.sort((a, b) => a.equip_id.localeCompare(b.equip_id));
    this.filteredTools.sort((a, b) => a.equip_id.localeCompare(b.equip_id));
  }

  groupToolsByEquipId(tools: any[]): any[] {
    const grouped: { [key: string]: any[] } = {};
    tools.forEach(tool => {
      if (!grouped[tool.equip_id]) grouped[tool.equip_id] = [];
      grouped[tool.equip_id].push(tool);
    });
    return Object.keys(grouped).map(equipId => {
      const toolGroup = grouped[equipId];
      const validErrors = toolGroup.filter(t => t.error_name !== 'Unknown');
      if (validErrors.length === 0) return null;
      
      const mostRecent = validErrors.reduce((a, b) => new Date(a.state_in_date) > new Date(b.state_in_date) ? a : b);
      
      // Count unique state_in_date + error_name combinations
      const uniqueCombinations = new Set<string>();
      const countMap: { [key: string]: number } = {};
      
      validErrors.forEach(t => {
        const uniqueKey = `${t.state_in_date}_${t.error_name}`;
        if (!uniqueCombinations.has(uniqueKey)) {
          uniqueCombinations.add(uniqueKey);
          countMap[t.error_name] = (countMap[t.error_name] || 0) + 1;
        }
      });
      
      const topError = Object.entries(countMap).sort((a, b) => b[1] - a[1])[0][0];
      return {
        equip_id: equipId,
        most_recent_error: mostRecent.error_name,
        most_recent_date: this.formatDate(mostRecent.state_in_date),
        top_error: topError,
        error_count: uniqueCombinations.size
      };
    }).filter(x => x !== null);
  }

  calculateErrorCounts(tools: any[]): { [key: string]: number } {
    const counts: { [key: string]: number } = {};
    const uniqueCombinations = new Set<string>();
    
    tools.forEach(t => {
      if (t.error_name && t.error_name !== 'Unknown') {
        // Create unique key for state_in_date + error_name combination
        const uniqueKey = `${t.state_in_date}_${t.error_name}`;
        if (!uniqueCombinations.has(uniqueKey)) {
          uniqueCombinations.add(uniqueKey);
          counts[t.error_name] = (counts[t.error_name] || 0) + 1;
        }
      }
    });
    return counts;
  }

  calculateMonthlyErrorTrend(tools: any[]): any[] {
    console.log('Calculating monthly error trend from tools:', tools.length);
    console.log('Date filters applied:', { startDate: this.startDate, endDate: this.endDate });
    
    const map: { [month: string]: number } = {};
    const uniqueCombinations: { [month: string]: Set<string> } = {};
    
    // Parse date filters
    const startDateObj = this.startDate ? new Date(this.startDate) : null;
    const endDateObj = this.endDate ? new Date(this.endDate) : null;
    
    tools.forEach(t => {
      if (t.error_name !== 'Unknown') {
        const toolDate = new Date(t.state_in_date);
        
        // Apply date filtering to trend data
        if (startDateObj && toolDate < startDateObj) {
          return; // Skip data before start date
        }
        if (endDateObj && toolDate > endDateObj) {
          return; // Skip data after end date
        }
        
        const month = this.getLocalMonthKey(t.state_in_date);
        
        if (!uniqueCombinations[month]) {
          uniqueCombinations[month] = new Set<string>();
        }
        
        const uniqueKey = `${t.state_in_date}_${t.error_name}`;
        if (!uniqueCombinations[month].has(uniqueKey)) {
          uniqueCombinations[month].add(uniqueKey);
          map[month] = (map[month] || 0) + 1;
        }
      }
    });
  
    const result = Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    
    console.log('Filtered trend data:', result);
    return result;
  }

  formatTop10ChartData(counts: { [key: string]: number }): any[] {
    delete counts['Unknown'];
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }

  calculateEquipIdErrorCounts(tools: any[]): { [key: string]: number } {
    const counts: { [key: string]: number } = {};
    const uniqueCombinations: { [key: string]: Set<string> } = {};
    
    tools.forEach(t => {
      if (t.error_name && t.error_name !== 'Unknown') {
        if (!uniqueCombinations[t.equip_id]) {
          uniqueCombinations[t.equip_id] = new Set<string>();
        }
        
        // Create unique key for state_in_date + error_name combination
        const uniqueKey = `${t.state_in_date}_${t.error_name}`;
        if (!uniqueCombinations[t.equip_id].has(uniqueKey)) {
          uniqueCombinations[t.equip_id].add(uniqueKey);
          counts[t.equip_id] = (counts[t.equip_id] || 0) + 1;
        }
      }
    });
    return counts;
  }

  formatEquipIdChartData(counts: { [key: string]: number }): any[] {
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }

  getEquipmentsForError(errorName: string): any[] {
    const counts: { [key: string]: number } = {};
    const uniqueCombinations: { [key: string]: Set<string> } = {};
    
    this.toolsRaw.forEach(t => {
      if (t.error_name === errorName) {
        if (!uniqueCombinations[t.equip_id]) {
          uniqueCombinations[t.equip_id] = new Set<string>();
        }
        
        const uniqueKey = `${t.state_in_date}_${t.error_name}`;
        if (!uniqueCombinations[t.equip_id].has(uniqueKey)) {
          uniqueCombinations[t.equip_id].add(uniqueKey);
          counts[t.equip_id] = (counts[t.equip_id] || 0) + 1;
        }
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }

  getErrorsForEquip(equipId: string): any[] {
    const counts: { [key: string]: number } = {};
    const uniqueCombinations = new Set<string>();
    
    this.toolsRaw.forEach(t => {
      if (t.equip_id === equipId && t.error_name !== 'Unknown') {
        const uniqueKey = `${t.state_in_date}_${t.error_name}`;
        if (!uniqueCombinations.has(uniqueKey)) {
          uniqueCombinations.add(uniqueKey);
          counts[t.error_name] = (counts[t.error_name] || 0) + 1;
        }
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }

  getTopErrorsForMonth(month: string): any[] {
    const counts: { [key: string]: number } = {};
    const uniqueCombinations = new Set<string>();
    
    // Use complete data for Error Trend by Month chart (unchanged by date filters)
    const dataSource = this.completeTools;
    
    dataSource.forEach(t => {
      const monthKey = this.getLocalMonthKey(t.state_in_date);
      if (monthKey === month && t.error_name !== 'Unknown') {
        const uniqueKey = `${t.state_in_date}_${t.error_name}`;
        if (!uniqueCombinations.has(uniqueKey)) {
          uniqueCombinations.add(uniqueKey);
          counts[t.error_name] = (counts[t.error_name] || 0) + 1;
        }
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }

  getTopErrorsForMonthFromFilteredData(month: string): any[] {
    const counts: { [key: string]: number } = {};
    const uniqueCombinations = new Set<string>();
    
    // Use filtered data for summary table (affected by date filter)
    const dataSource = this.toolsRaw;
    
    dataSource.forEach(t => {
      const monthKey = this.getLocalMonthKey(t.state_in_date);
      if (monthKey === month && t.error_name !== 'Unknown') {
        const uniqueKey = `${t.state_in_date}_${t.error_name}`;
        if (!uniqueCombinations.has(uniqueKey)) {
          uniqueCombinations.add(uniqueKey);
          counts[t.error_name] = (counts[t.error_name] || 0) + 1;
        }
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }

  onErrorTypeToggle(error: string): void {
    const index = this.selectedErrorTypes.indexOf(error);
    if (index === -1) this.selectedErrorTypes.push(error);
    else this.selectedErrorTypes.splice(index, 1);
    this.generateMultiLineChart();
  }

  onSearchError(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.filteredErrorTypes = this.allErrorTypes.filter(error => error.toLowerCase().includes(searchTerm));
  }

  generateMultiLineChart(): void {
    console.log('generateMultiLineChart called - using complete data for lines to show full timeline trends');
    console.log('Selected errors:', this.selectedErrorTypes);
    console.log('Filtered tools count:', this.toolsRaw.length);
    console.log('Complete tools count:', this.completeTools.length);
    
    const map: { [error: string]: { [month: string]: number } } = {};
    const uniqueCombinations: { [error: string]: { [month: string]: Set<string> } } = {};
    
    this.selectedErrorTypes.forEach(e => {
      map[e] = {};
      uniqueCombinations[e] = {};
    });
  
    // Use complete data for the chart lines to show trends across entire timeline
    const dataSource = this.completeTools;
    console.log('Using complete data with', dataSource.length, 'records for chart lines to show full timeline');
  
    dataSource.forEach(t => {
      const e = t.error_name;
      if (!this.selectedErrorTypes.includes(e)) return;
      
      const monthKey = this.getLocalMonthKey(t.state_in_date);
      
      if (!uniqueCombinations[e][monthKey]) {
        uniqueCombinations[e][monthKey] = new Set<string>();
      }
      
      const uniqueKey = `${t.state_in_date}_${t.error_name}`;
      if (!uniqueCombinations[e][monthKey].has(uniqueKey)) {
        uniqueCombinations[e][monthKey].add(uniqueKey);
        map[e][monthKey] = (map[e][monthKey] || 0) + 1;
      }
    });
  
    // Always use all months from the complete dataset for the x-axis
    const allMonths = new Set<string>();
    
    // Add all months from the complete dataset (not just filtered data)
    this.completeTools.forEach(t => {
      if (t.state_in_date) {
        allMonths.add(this.getLocalMonthKey(t.state_in_date));
      }
    });
    
    const sortedMonths = Array.from(allMonths).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    console.log('Chart will show', sortedMonths.length, 'months on x-axis:', sortedMonths);
  
    this.errorTrendMultiLineData = Object.entries(map).map(([error, monthMap]) => ({
      name: error,
      series: sortedMonths.map(month => ({
        name: month,
        value: monthMap[month] || 0
      }))
    }));
    
    console.log('Generated chart data for', this.errorTrendMultiLineData.length, 'errors showing full timeline trends');
  }

  yAxisTickFormatting(value: string): string {
    return value.length > 10 ? value.slice(0, 10) + '...' : value;
  }

  clearAllErrors(): void {
    this.selectedErrorTypes = [];
    this.generateMultiLineChart();
  }
  
  selectTopErrors(): void {
    console.log('selectTopErrors called - using filtered data to determine top 5 errors');
    
    const errorCounts: { [key: string]: number } = {};
    const uniqueCombinations = new Set<string>();
    
    // Use filtered data (toolsRaw) for top 5 calculation based on current date filter
    const dataSource = this.toolsRaw;
    console.log('Using filtered data with', dataSource.length, 'records to determine top errors');
    
    dataSource.forEach(t => {
      if (t.error_name && t.error_name !== 'Unknown') {
        const uniqueKey = `${t.state_in_date}_${t.error_name}`;
        if (!uniqueCombinations.has(uniqueKey)) {
          uniqueCombinations.add(uniqueKey);
          errorCounts[t.error_name] = (errorCounts[t.error_name] || 0) + 1;
        }
      }
    });
  
    this.selectedErrorTypes = Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
    
    console.log('Selected top 5 errors from filtered data:', this.selectedErrorTypes);
  
    this.generateMultiLineChart();
  }

  formatXAxisTick = (val: string): string => {
    if (!val.includes('-')) return val;
    const [year, month] = val.split('-').map(Number);
    return new Date(year, month - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
  };
  
  

  
  private getLocalMonthKey(dateString: string): string {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2); // Add 1 to month since it's zero-indexed
    return `${year}-${month}`;
  }

  sortByErrorCount(): void {
    // Sort tools: top 10 first (by error count), then alphabetically
    this.tools.sort((a, b) => {
      const aIsTop10 = this.top10EquipIds.includes(a.equip_id);
      const bIsTop10 = this.top10EquipIds.includes(b.equip_id);
      
      if (aIsTop10 && !bIsTop10) return -1;
      if (!aIsTop10 && bIsTop10) return 1;
      
      if (aIsTop10 && bIsTop10) {
        // Both are top 10, sort by error count (descending)
        return b.error_count - a.error_count;
      }
      
      // Both are not top 10, sort alphabetically
      return a.equip_id.localeCompare(b.equip_id);
    });

    this.filteredTools.sort((a, b) => {
      const aIsTop10 = this.top10EquipIds.includes(a.equip_id);
      const bIsTop10 = this.top10EquipIds.includes(b.equip_id);
      
      if (aIsTop10 && !bIsTop10) return -1;
      if (!aIsTop10 && bIsTop10) return 1;
      
      if (aIsTop10 && bIsTop10) {
        // Both are top 10, sort by error count (descending)
        return b.error_count - a.error_count;
      }
      
      // Both are not top 10, sort alphabetically
      return a.equip_id.localeCompare(b.equip_id);
    });
  }

  isTop10Tool(equipId: string): boolean {
    return this.top10EquipIds.includes(equipId);
  }

  selectedErrorName: string | null = null;

  onBarSelect(event: any) {
    const errorName = event.name;
    if (this.selectedErrorName === errorName) {
      this.selectedErrorName = null;
    } else if (this.selectedErrorName) {
      // Animate out, then in
      const prev = this.selectedErrorName;
      this.selectedErrorName = null;
      setTimeout(() => {
        this.selectedErrorName = errorName;
        if (!this.errorToEquipMap[errorName]) {
          this.errorRowLoading[errorName] = true;
          setTimeout(() => {
            this.errorToEquipMap[errorName] = this.getEquipmentsForError(errorName);
            this.errorRowLoading[errorName] = false;
          }, 300);
        }
      }, 220); // match your :leave animation duration
    } else {
      this.selectedErrorName = errorName;
      if (!this.errorToEquipMap[errorName]) {
        this.errorRowLoading[errorName] = true;
        setTimeout(() => {
          this.errorToEquipMap[errorName] = this.getEquipmentsForError(errorName);
          this.errorRowLoading[errorName] = false;
        }, 300);
      }
    }
  }

  closeSummaryPanel() {
    this.selectedErrorName = null;
  }

  selectedEquipName: string | null = null;

  onEquipBarSelect(event: any) {
    const equipName = event.name;
    if (this.selectedEquipName === equipName) {
      this.selectedEquipName = null;
    } else if (this.selectedEquipName) {
      // Animate out, then in
      const prev = this.selectedEquipName;
      this.selectedEquipName = null;
      setTimeout(() => {
        this.selectedEquipName = equipName;
        if (!this.equipToErrorMap[equipName]) {
          this.equipRowLoading[equipName] = true;
          setTimeout(() => {
            this.equipToErrorMap[equipName] = this.getErrorsForEquip(equipName);
            this.equipRowLoading[equipName] = false;
          }, 300);
        }
      }, 220); // match your :leave animation duration
    } else {
      this.selectedEquipName = equipName;
      if (!this.equipToErrorMap[equipName]) {
        this.equipRowLoading[equipName] = true;
        setTimeout(() => {
          this.equipToErrorMap[equipName] = this.getErrorsForEquip(equipName);
          this.equipRowLoading[equipName] = false;
        }, 300);
      }
    }
  }

  closeEquipSummaryPanel() {
    this.selectedEquipName = null;
  }

  // Location bar chart methods
  onLocationBarSelect(event: any) {
    const locationName = event.name;
    if (this.selectedLocationName === locationName) {
      this.selectedLocationName = null;
    } else if (this.selectedLocationName) {
      // Animate out, then in
      const prev = this.selectedLocationName;
      this.selectedLocationName = null;
      setTimeout(() => {
        this.selectedLocationName = locationName;
        if (!this.locationToErrorMap[locationName]) {
          this.getErrorsForLocation(locationName);
        }
        // Filter the trend chart to this location
        this.selectedLocationTypes = [locationName];
        this.generateLocationMultiLineChart();
      }, 220); // match your :leave animation duration
    } else {
      this.selectedLocationName = locationName;
      if (!this.locationToErrorMap[locationName]) {
        this.getErrorsForLocation(locationName);
      }
      // Filter the trend chart to this location
      this.selectedLocationTypes = [locationName];
    }
  }

  closeLocationSummaryPanel() {
    this.selectedLocationName = null;
  }

  getErrorsForLocation(locationName: string): { name: string; value: number }[] {
    if (this.locationToErrorMap[locationName]) {
      return this.locationToErrorMap[locationName];
    }

    const locationErrors: { [errorName: string]: number } = {};
    
    this.toolsRaw.forEach(tool => {
      if (tool.error_name && tool.error_name !== 'Unknown') {
        const location = this.extractErrorLocation(tool.error_description);
        if (location === locationName) {
          locationErrors[tool.error_name] = (locationErrors[tool.error_name] || 0) + 1;
        }
      }
    });

    const errors = Object.entries(locationErrors)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    this.locationToErrorMap[locationName] = errors;
    return errors;
  }

  extractErrorLocation(description: string): string {
    if (!description || description.trim() === '') {
      return 'Unknown';
    }
    // Pattern 1: Standard format with error code and location
    const pattern1 = /^\d+:\s+\d+\s+([A-Z0-9]+)\s+V\d+/;
    const match1 = description.match(pattern1);
    if (match1) {
      return match1[1];
    }
    // Pattern 4: Template format without standard structure
    const pattern4 = /(\d+:\s+\d+\s+[A-Z0-9]+\s+V\d+)/;
    const match4 = description.match(pattern4);
    if (match4) {
      const locationMatch = match4[1].match(/\d+:\s+\d+\s+([A-Z0-9]+)\s+V\d+/);
      if (locationMatch) {
        return locationMatch[1];
      }
    }
    // Pattern 5: Look for any sequence of uppercase letters and numbers that might be a location
    const pattern5 = /\b([A-Z0-9]{6,12})\b/g;
    const matches = [...description.matchAll(pattern5)];
    const excludePatterns = [
      /^MOHTA/, /^V\d+$/, /^ALARM/, /^ERROR/, /^TEMPLATE/, /^START/, /^END$/, /^RECOVERY/, /^TROUBLESHOOT/, /^POSSIBLE/
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

  private processLocationKpi(tools: any[]): void {
    const locationCounts: { [location: string]: number } = {};
    let total = 0;
    const errorMap: { [location: string]: { [error: string]: number } } = {};
    tools.forEach(tool => {
      if (tool.error_name !== 'Unknown') {
        const location = this.extractErrorLocation(tool.error_description);
        if (location.startsWith('8')) return; // Exclude all locations starting with '8'
        if (location !== 'Unknown' && location.length > 0) {
          locationCounts[location] = (locationCounts[location] || 0) + 1;
          total++;
          if (!errorMap[location]) errorMap[location] = {};
          errorMap[location][tool.error_name] = (errorMap[location][tool.error_name] || 0) + 1;
        }
      }
    });
    const sorted = Object.entries(locationCounts)
      .filter(([location]) => location !== 'Unknown' && !location.startsWith('8'))
      .sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      this.topLocation = sorted[0][0];
      this.topLocationCount = sorted[0][1];
      this.topLocationPercent = total > 0 ? Math.round((this.topLocationCount / total) * 100) : 0;
      // Get top 3 errors for this location
      const errorCounts = errorMap[this.topLocation] || {};
      this.topLocationTopErrors = Object.entries(errorCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
    } else {
      this.topLocation = 'N/A';
      this.topLocationCount = 0;
      this.topLocationPercent = 0;
      this.topLocationTopErrors = [];
    }
  }

  showAllTools: boolean = false;

  get visibleTools(): any[] {
    // Show 14 cards by default, show all if toggled
    return this.showAllTools ? this.filteredTools : this.filteredTools.slice(0, 14);
  }

  toggleShowAllTools(): void {
    this.showAllTools = !this.showAllTools;
  }

  trackByEquipId(index: number, tool: any): string {
    return tool.equip_id;
  }

  // Process error locations for leaderboard
  processErrorLocations(): void {
    const locationCounts: { [location: string]: number } = {};
    const locationErrorDetails: { [location: string]: { [errorName: string]: number } } = {};
    const locationToolsMap: { [location: string]: any[] } = {};

    // Single pass: group tools by location
    this.toolsRaw.forEach(tool => {
      if (tool.error_name && tool.error_name !== 'Unknown') {
        const location = this.extractErrorLocation(tool.error_description);
        if (location.startsWith('8')) return; // Exclude all locations starting with '8'

        // Count locations
        locationCounts[location] = (locationCounts[location] || 0) + 1;

        // Count by error name for each location
        if (!locationErrorDetails[location]) {
          locationErrorDetails[location] = {};
        }
        locationErrorDetails[location][tool.error_name] = (locationErrorDetails[location][tool.error_name] || 0) + 1;

        // Group tools by location for fast lookup
        if (!locationToolsMap[location]) {
          locationToolsMap[location] = [];
        }
        locationToolsMap[location].push(tool);
      }
    });

    // Generate error location data for pie chart
    this.errorLocationData = Object.entries(locationCounts)
      .filter(([location]) => location !== 'Unknown' && !location.startsWith('8'))
      .map(([location, count]) => ({
        name: location,
        value: count,
        equipment: 'All Equipment'
      }))
      .sort((a, b) => b.value - a.value);

    // Generate top error locations data for horizontal bar chart (top 10)
    this.topErrorLocationsData = Object.entries(locationCounts)
      .filter(([location]) => location !== 'Unknown' && !location.startsWith('8'))
      .map(([location, count]) => ({
        name: location,
        value: count
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Set the dynamic color scheme for location chart (same as Top 10 Errors)
    this.colorSchemeLocationTopCount.domain = this.topErrorLocationsData.map((item, index) => 
      index === 0 ? '#ff6347' : '#484848' // Top location in tomato color, others in dark gray
    );

    // Calculate total count for percentage calculation
    const totalLocationCount = Object.values(locationCounts).reduce((sum, count) => sum + count, 0);

    // Generate location data for table with top 3 error names
    this.errorLocationDetails = [];
    Object.entries(locationCounts)
      .filter(([location]) => location !== 'Unknown' && !location.startsWith('8'))
      .forEach(([location, count]) => {
        // Get top 3 error names for this location
        const errorCounts = locationErrorDetails[location] || {};
        const topErrors = Object.entries(errorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([errorName, errorCount]) => ({ name: errorName, count: errorCount }));

        // Get most recent error and date for this location (fast lookup)
        let mostRecentError = 'N/A';
        let mostRecentDate = 'N/A';
        const locationTools = locationToolsMap[location] || [];
        if (locationTools.length > 0) {
          const mostRecentTool = locationTools.reduce((a, b) => new Date(a.state_in_date) > new Date(b.state_in_date) ? a : b);
          mostRecentError = mostRecentTool.error_name;
          mostRecentDate = this.formatDate(mostRecentTool.state_in_date);
        }

        this.errorLocationDetails.push({
          location: location,
          errorName: 'All Errors',
          count: count,
          percentage: totalLocationCount > 0 ? (count / totalLocationCount) * 100 : 0,
          equipment: 'All Equipment',
          topErrors: topErrors,
          most_recent_error: mostRecentError,
          most_recent_date: mostRecentDate
        });
      });

    // Sort by count descending
    this.errorLocationDetails.sort((a, b) => b.count - a.count);
    // Limit to top 100 locations for performance
    this.errorLocationDetails = this.errorLocationDetails.slice(0, 100);

    // Calculate statistics
    this.totalErrorLocations = this.errorLocationData.reduce((sum, loc) => sum + loc.value, 0);
    this.uniqueErrorLocations = this.errorLocationData.length;
    this.mostCommonErrorLocation = this.errorLocationData.length > 0 ? this.errorLocationData[0].name : 'N/A';

    // Find all error names and counts for the most common error location
    if (this.mostCommonErrorLocation !== 'N/A') {
      const errorMap: { [name: string]: number } = {};
      this.toolsRaw.forEach(tool => {
        if (tool.error_name && tool.error_name !== 'Unknown') {
          const location = this.extractErrorLocation(tool.error_description);
          if (location === this.mostCommonErrorLocation) {
            errorMap[tool.error_name] = (errorMap[tool.error_name] || 0) + 1;
          }
        }
      });
      this.mostCommonErrorLocationErrors = Object.entries(errorMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    } else {
      this.mostCommonErrorLocationErrors = [];
    }

    console.log('Error locations processed for general page:', {
      totalLocations: this.totalErrorLocations,
      uniqueLocations: this.uniqueErrorLocations,
      mostCommon: this.mostCommonErrorLocation,
      locationData: this.errorLocationData,
      details: this.errorLocationDetails
    });
  }

  toggleLeaderboard(): void {
    if (!this.showAllLeaderboard) {
      this.setCollapsedTableHeight();
      setTimeout(() => {
        this.showAllLeaderboard = true;
      });
    } else {
      this.showAllLeaderboard = false;
    }
  }

  setCollapsedTableHeight(): void {
    if (this.collapsedTableRef && this.collapsedTableRef.nativeElement) {
      this.collapsedTableHeight = this.collapsedTableRef.nativeElement.offsetHeight;
    }
  }

  // Location trend chart methods
  onLocationTypeToggle(location: string): void {
    const index = this.selectedLocationTypes.indexOf(location);
    if (index > -1) {
      this.selectedLocationTypes.splice(index, 1);
    } else {
      this.selectedLocationTypes.push(location);
    }
    this.generateLocationMultiLineChart();
  }

  onSearchLocation(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchLocationTerm = target.value.toLowerCase();
    this.filteredLocationTypes = this.allLocationTypes.filter(location =>
      location.toLowerCase().includes(this.searchLocationTerm)
    );
  }

  generateLocationMultiLineChart(): void {
    console.log('generateLocationMultiLineChart called - using complete data for lines to show full timeline trends');
    console.log('Selected locations:', this.selectedLocationTypes);
    console.log('Filtered tools count:', this.toolsRaw.length);
    console.log('Complete tools count:', this.completeTools.length);
    
    const map: { [location: string]: { [month: string]: number } } = {};
    const uniqueCombinations: { [location: string]: { [month: string]: Set<string> } } = {};
    
    this.selectedLocationTypes.forEach(l => {
      map[l] = {};
      uniqueCombinations[l] = {};
    });
  
    // Use complete data for the chart lines to show trends across entire timeline
    const dataSource = this.completeTools;
    console.log('Using complete data with', dataSource.length, 'records for chart lines to show full timeline');
  
    dataSource.forEach(t => {
      if (t.error_name === 'Unknown') return;
      
      const location = this.extractErrorLocation(t.error_description);
      if (!this.selectedLocationTypes.includes(location)) return;
      
      const monthKey = this.getLocalMonthKey(t.state_in_date);
      
      if (!uniqueCombinations[location][monthKey]) {
        uniqueCombinations[location][monthKey] = new Set<string>();
      }
      
      const uniqueKey = `${t.state_in_date}_${location}`;
      if (!uniqueCombinations[location][monthKey].has(uniqueKey)) {
        uniqueCombinations[location][monthKey].add(uniqueKey);
        map[location][monthKey] = (map[location][monthKey] || 0) + 1;
      }
    });
  
    // Always use all months from the complete dataset for the x-axis
    const allMonths = new Set<string>();
    
    // Add all months from the complete dataset (not just filtered data)
    this.completeTools.forEach(t => {
      if (t.state_in_date) {
        allMonths.add(this.getLocalMonthKey(t.state_in_date));
      }
    });
    
    const sortedMonths = Array.from(allMonths).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    console.log('Chart will show', sortedMonths.length, 'months on x-axis:', sortedMonths);
  
    this.errorLocationTrendMultiLineData = Object.entries(map).map(([location, monthMap]) => ({
      name: location,
      series: sortedMonths.map(month => ({
        name: month,
        value: monthMap[month] || 0
      }))
    }));

    console.log('Generated chart data for', this.errorLocationTrendMultiLineData.length, 'locations showing full timeline trends');

    // Update the applied filter notification
    if (this.selectedLocationTypes.length === 0) {
      this.appliedLocationFilter = 'No locations selected';
    } else if (this.selectedLocationTypes.length === 1) {
      this.appliedLocationFilter = `Showing: ${this.selectedLocationTypes[0]}`;
    } else if (this.selectedLocationTypes.length <= 3) {
      this.appliedLocationFilter = `Showing: ${this.selectedLocationTypes.join(', ')}`;
    } else {
      this.appliedLocationFilter = `Showing: ${this.selectedLocationTypes.length} locations`;
    }
  }

  clearAllLocations(): void {
    this.selectedLocationTypes = [];
    this.generateLocationMultiLineChart();
  }
  
  selectTopLocations(): void {
    console.log('selectTopLocations called - using filtered data to determine top 5 locations');
    
    const locationCounts: { [key: string]: number } = {};
    const uniqueCombinations = new Set<string>();
    
    // Use filtered data (toolsRaw) for top 5 calculation based on current date filter
    const dataSource = this.toolsRaw;
    console.log('Using filtered data with', dataSource.length, 'records to determine top locations');
    
    dataSource.forEach(t => {
      if (t.error_name && t.error_name !== 'Unknown') {
        const location = this.extractErrorLocation(t.error_description);
        if (location.startsWith('8') || location === 'Unknown' || location.length === 0) return;
        
        const uniqueKey = `${t.state_in_date}_${location}`;
        if (!uniqueCombinations.has(uniqueKey)) {
          uniqueCombinations.add(uniqueKey);
          locationCounts[location] = (locationCounts[location] || 0) + 1;
        }
      }
    });
  
    this.selectedLocationTypes = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // Select top 5 locations
      .map(([name]) => name);
    
    console.log('Selected top 5 locations from filtered data:', this.selectedLocationTypes);
  
    this.generateLocationMultiLineChart();
  }

  scrollToLocations(): void {
    const element = document.querySelector('.locations-label');
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }

  hasActiveFilter(): boolean {
    console.log('Checking for active filters:', {
      startDate: this.startDate,
      endDate: this.endDate
    });
    
    const hasDateFilter = Boolean((this.startDate && this.startDate !== '') || 
                                 (this.endDate && this.endDate !== ''));
    
    console.log('Date filter result:', hasDateFilter);
    
    return hasDateFilter;
  }

  getFilterIndicatorText(): string {
    console.log('Getting filter indicator text:', {
      startDate: this.startDate,
      endDate: this.endDate
    });
    
    // Only show date filter information
    if (this.startDate && this.endDate) {
      // Determine the quick range type
      const today = new Date();
      const startDateObj = new Date(this.startDate);
      const endDateObj = new Date(this.endDate);
      const todayStr = today.toISOString().split('T')[0];
      
      if (endDateObj.toISOString().split('T')[0] === todayStr) {
        const daysDiff = Math.floor((today.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log('Days difference:', daysDiff);
        
        if (daysDiff >= 6 && daysDiff <= 8) {
          return 'Last Week';
        } else if (daysDiff >= 28 && daysDiff <= 31) {
          return 'Last Month';
        } else if (daysDiff >= 89 && daysDiff <= 92) {
          return 'Last Quarter';
        } else if (daysDiff >= 364 && daysDiff <= 366) {
          return 'Last Year';
        } else {
          return `Custom: ${this.formatDateForDisplay(this.startDate)} - ${this.formatDateForDisplay(this.endDate)}`;
        }
      } else {
        return `Custom: ${this.formatDateForDisplay(this.startDate)} - ${this.formatDateForDisplay(this.endDate)}`;
      }
    } else if (this.startDate) {
      return `From: ${this.formatDateForDisplay(this.startDate)}`;
    } else if (this.endDate) {
      return `To: ${this.formatDateForDisplay(this.endDate)}`;
    }
    
    return 'No Date Filter';
  }

  private formatDateForDisplay(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }
}
