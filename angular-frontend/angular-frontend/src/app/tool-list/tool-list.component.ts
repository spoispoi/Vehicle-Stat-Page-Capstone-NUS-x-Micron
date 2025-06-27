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

  constructor(
    private toolService: ToolService,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTools();
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
  }

  onFilterCleared(): void {
    this.startDate = '';
    this.endDate = '';
    this.loadTools();
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
    this.debugMonthlyData(tools); // checking for chart data first months low
    this.errorTrendData = this.calculateMonthlyErrorTrend(tools); // checking for chart data first months low
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

    this.errorTrendData = this.calculateMonthlyErrorTrend(tools);

    this.top5Months = [...this.errorTrendData].sort((a, b) => b.value - a.value).slice(0, 5);

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

    this.errorTrendData.forEach(month => {
      this.monthRowLoading[month.name] = true;
      console.log(`Loading data for month: ${month.name}`); // Debugging statement
      setTimeout(() => {
        this.monthToErrorMap[month.name] = this.getTopErrorsForMonth(month.name);
        console.log(`Data for month ${month.name}:`, this.monthToErrorMap[month.name]); // Debugging statement
        this.monthRowLoading[month.name] = false;
      }, 300);
    });

    this.allErrorTypes = [...new Set(tools.map(t => t.error_name).filter(name => name && name !== 'Unknown'))];
    this.selectedErrorTypes = this.allErrorTypes.slice(0, 5);
    this.filteredErrorTypes = [...this.allErrorTypes]; // Initialize filteredErrorTypes
    this.generateMultiLineChart();

    // Initialize location types for location trend chart
    this.allLocationTypes = [...new Set(tools.map(t => {
      const location = this.extractErrorLocation(t.error_description);
      return location;
    }).filter(location => location && location !== 'Unknown' && !location.startsWith('8') && location.length > 0))];
    
    // Select the top 5 locations by count
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
    
    // Select the top 5 locations by count
    this.selectedLocationTypes = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // Select top 5 locations
      .map(([name]) => name);
    
    this.filteredLocationTypes = [...this.allLocationTypes]; // Initialize filteredLocationTypes
    this.generateLocationMultiLineChart();

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

//   renderToolList(): void {
//     const container = this.document.getElementById('tool-list');
//     if (!container) return;
//     container.innerHTML = '';
//     const gridContainer = this.renderer.createElement('div');
// this.renderer.addClass(gridContainer, 'tool-grid'); // this class will define the grid layout

// this.filteredTools.forEach(tool => {
//   const card = this.renderer.createElement('div');
//   this.renderer.addClass(card, 'card');
//   this.renderer.addClass(card, 'shadow-sm');

//   const cardBody = this.renderer.createElement('div');
//   this.renderer.addClass(cardBody, 'card-body');

//   const title = this.renderer.createElement('h5');
//   this.renderer.addClass(title, 'card-title');
//   title.textContent = tool.equip_id;

//   const text = this.renderer.createElement('p');
//   this.renderer.addClass(text, 'card-text');
//   text.innerHTML = `
//     <strong>Most Recent Error:</strong> ${tool.most_recent_error || 'N/A'}<br>
//     <strong>Most Recent Date:</strong> ${tool.most_recent_date || 'N/A'}<br>
//   `;

//   const button = this.renderer.createElement('button');
//   this.renderer.addClass(button, 'btn');
//   this.renderer.addClass(button, 'btn-primary');
//   button.textContent = 'View Statistics';
//   this.renderer.listen(button, 'click', () => this.navigateToStatistics(tool.equip_id));

//   this.renderer.appendChild(cardBody, title);
//   this.renderer.appendChild(cardBody, text);
//   this.renderer.appendChild(cardBody, button);
//   this.renderer.appendChild(card, cardBody);
//   this.renderer.appendChild(gridContainer, card);
// });

// // Replace old container contents with new grid
// this.renderer.appendChild(container, gridContainer);

//   }
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
    
    this.toolsRaw.forEach(t => {
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
    const map: { [error: string]: { [month: string]: number } } = {};
    const uniqueCombinations: { [error: string]: { [month: string]: Set<string> } } = {};
    
    this.selectedErrorTypes.forEach(e => {
      map[e] = {};
      uniqueCombinations[e] = {};
    });
  
    // Apply date filtering to multi-line chart as well
    const startDateObj = this.startDate ? new Date(this.startDate) : null;
    const endDateObj = this.endDate ? new Date(this.endDate) : null;
  
    this.toolsRaw.forEach(t => {
      const e = t.error_name;
      if (!this.selectedErrorTypes.includes(e)) return;
      
      // Apply date filtering
      const toolDate = new Date(t.state_in_date);
      if (startDateObj && toolDate < startDateObj) return;
      if (endDateObj && toolDate > endDateObj) return;
      
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
  
    // Collect all unique months to ensure sorting order is consistent
    const allMonths = new Set<string>();
    Object.values(map).forEach(monthMap => {
      Object.keys(monthMap).forEach(month => allMonths.add(month));
    });
    const sortedMonths = Array.from(allMonths).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  
    this.errorTrendMultiLineData = Object.entries(map).map(([error, monthMap]) => ({
      name: error,
      series: sortedMonths.map(month => ({
        name: month,
        value: monthMap[month] || 0
      }))
    }));
  }

  yAxisTickFormatting(value: string): string {
    return value.length > 10 ? value.slice(0, 10) + '...' : value;
  }

  clearAllErrors(): void {
    this.selectedErrorTypes = [];
    this.generateMultiLineChart();
  }
  
  selectTopErrors(): void {
    const errorCounts: { [key: string]: number } = {};
    const uniqueCombinations = new Set<string>();
    
    this.toolsRaw.forEach(t => {
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
  private debugMonthlyData(tools: any[]): void {
    console.log('=== DEBUGGING MONTHLY DATA ===');
    
    // Group by month to see raw counts
    const monthlyBreakdown: { [key: string]: any[] } = {};
    
    tools.forEach(tool => {
      if (tool.error_name !== 'Unknown' && tool.state_in_date) {
        const dateStr = tool.state_in_date.split('T')[0];
        const [year, month] = dateStr.split('-');
        const monthKey = `${year}-${month}`;
        
        if (!monthlyBreakdown[monthKey]) {
          monthlyBreakdown[monthKey] = [];
        }
        monthlyBreakdown[monthKey].push(tool);
      }
    });
  
    // Log details for each month
    Object.keys(monthlyBreakdown).sort().forEach(monthKey => {
      const monthData = monthlyBreakdown[monthKey];
      const uniqueErrors = new Set();
      
      monthData.forEach(tool => {
        uniqueErrors.add(`${tool.state_in_date}_${tool.error_name}`);
      });
      
      console.log(`Month ${monthKey}:`);
      console.log(`  - Raw records: ${monthData.length}`);
      console.log(`  - Unique errors: ${uniqueErrors.size}`);
      console.log(`  - Date range: ${monthData[0]?.state_in_date} to ${monthData[monthData.length-1]?.state_in_date}`);
      console.log(`  - Sample dates:`, monthData.slice(0, 3).map(t => t.state_in_date));
    });
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
    const map: { [location: string]: { [month: string]: number } } = {};
    const uniqueCombinations: { [location: string]: { [month: string]: Set<string> } } = {};
    
    this.selectedLocationTypes.forEach(l => {
      map[l] = {};
      uniqueCombinations[l] = {};
    });
  
    // Apply date filtering to multi-line chart as well
    const startDateObj = this.startDate ? new Date(this.startDate) : null;
    const endDateObj = this.endDate ? new Date(this.endDate) : null;
  
    this.toolsRaw.forEach(t => {
      if (t.error_name === 'Unknown') return;
      
      const location = this.extractErrorLocation(t.error_description);
      if (location.startsWith('8') || location === 'Unknown' || location.length === 0) return;
      
      if (!this.selectedLocationTypes.includes(location)) return;
      
      // Apply date filtering
      const toolDate = new Date(t.state_in_date);
      if (startDateObj && toolDate < startDateObj) return;
      if (endDateObj && toolDate > endDateObj) return;
      
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
  
    // Collect all unique months from the entire dataset to ensure complete x-axis
    const allMonths = new Set<string>();
    
    // Add all months from the entire dataset (not just selected locations)
    this.toolsRaw.forEach(t => {
      if (t.state_in_date) {
        allMonths.add(this.getLocalMonthKey(t.state_in_date));
      }
    });
    
    // Also add months from selected locations (in case they're not in the main dataset)
    Object.values(map).forEach(monthMap => {
      Object.keys(monthMap).forEach(month => allMonths.add(month));
    });
    
    const sortedMonths = Array.from(allMonths).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  
    this.errorLocationTrendMultiLineData = Object.entries(map).map(([location, monthMap]) => ({
      name: location,
      series: sortedMonths.map(month => ({
        name: month,
        value: monthMap[month] || 0
      }))
    }));

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
    const locationCounts: { [key: string]: number } = {};
    const uniqueCombinations = new Set<string>();
    
    this.toolsRaw.forEach(t => {
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
  
    this.generateLocationMultiLineChart();
  }
}
