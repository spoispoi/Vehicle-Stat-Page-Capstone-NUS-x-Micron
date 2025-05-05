import { Component, OnInit, Inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ToolService } from '../tool.service';
import { Renderer2 } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { Color, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { trigger, state, style, animate, transition } from '@angular/animations';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';


@Component({
  selector: 'app-tool-list',
  standalone: true,
  imports: [RouterOutlet, NgxChartsModule, CommonModule],
  templateUrl: './tool-list.component.html',
  styleUrls: ['./tool-list.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  animations: [
    trigger('collapseAnimation', [
      state('collapsed', style({ height: '0px', overflow: 'hidden', opacity: 0 })),
      state('expanded', style({ height: '*', opacity: 1 })),
      transition('collapsed <=> expanded', animate('300ms ease-in-out')),
    ])
  ]
})
export class ToolListComponent implements OnInit {
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
    domain: [], // We'll populate this dynamically
    group: ScaleType.Ordinal,
    selectable: true,
    name: 'equipTopCount'
  };
  
  

  constructor(
    private toolService: ToolService,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.toolService.getTools().subscribe((tools) => {
      this.toolsRaw = tools;

      const groupedTools = this.groupToolsByEquipId(tools);
      this.tools = groupedTools;
      this.filteredTools = [...this.tools];
      this.sortByEquipId();
     // this.renderToolList();

      const errorCounts = this.calculateErrorCounts(tools);
      this.top10ErrorData = this.formatTop10ChartData(errorCounts);

      this.colorSchemeTopCount.domain = this.top10ErrorData.map((item, index) => 
      index === 0 ? '#ff6347' : '#484848' // Top count in tomato color, others in nude color
    );


      this.top10ErrorData.slice(0, 5).forEach(error => {
        this.errorRowLoading[error.name] = true;
        setTimeout(() => {
          this.errorToEquipMap[error.name] = this.getEquipmentsForError(error.name);
          this.errorRowLoading[error.name] = false;
        }, 300);
      });

      this.errorTrendData = this.calculateMonthlyErrorTrend(tools);

      //this.errorTrendData.sort((a, b) => b.value - a.value);
      this.top5Months = [...this.errorTrendData].sort((a, b) => b.value - a.value).slice(0, 5);


      const equipIdErrorCounts = this.calculateEquipIdErrorCounts(tools);
      this.equipIdErrorData = this.formatEquipIdChartData(equipIdErrorCounts);

      
      // Limit to top 20 equipments
      this.top20Equipments = this.equipIdErrorData.slice(0, 50);

      this.colorSchemeEquipTopCount.domain = this.top20Equipments.map((item, index) => 
      index === 0 ? '#ff6347' : '#484848' // Top count in tomato color, others in nude color
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
    });
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
    this.sortByEquipId();
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
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)} ${date.toLocaleTimeString()}`;
  }

  sortByEquipId(): void {
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
      const countMap: { [key: string]: number } = {};
      validErrors.forEach(t => countMap[t.error_name] = (countMap[t.error_name] || 0) + 1);
      const topError = Object.entries(countMap).sort((a, b) => b[1] - a[1])[0][0];
      return {
        equip_id: equipId,
        most_recent_error: mostRecent.error_name,
        most_recent_date: this.formatDate(mostRecent.state_in_date),
        top_error: topError
      };
    }).filter(x => x !== null);
  }

  calculateErrorCounts(tools: any[]): { [key: string]: number } {
    const counts: { [key: string]: number } = {};
    tools.forEach(t => counts[t.error_name] = (counts[t.error_name] || 0) + 1);
    return counts;
  }

  calculateMonthlyErrorTrend(tools: any[]): any[] {
    const map: { [month: string]: number } = {};
    tools.forEach(t => {
      if (t.error_name !== 'Unknown') {
        const date = new Date(t.state_in_date);
        const month = this.getLocalMonthKey(t.state_in_date);

        map[month] = (map[month] || 0) + 1;
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
  }

  formatTop10ChartData(counts: { [key: string]: number }): any[] {
    delete counts['Unknown'];
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }

  calculateEquipIdErrorCounts(tools: any[]): { [key: string]: number } {
    const counts: { [key: string]: number } = {};
    tools.forEach(t => counts[t.equip_id] = (counts[t.equip_id] || 0) + 1);
    return counts;
  }

  formatEquipIdChartData(counts: { [key: string]: number }): any[] {
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }

  getEquipmentsForError(errorName: string): any[] {
    const counts: { [key: string]: number } = {};
    this.toolsRaw.forEach(t => {
      if (t.error_name === errorName) {
        counts[t.equip_id] = (counts[t.equip_id] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }

  getErrorsForEquip(equipId: string): any[] {
    const counts: { [key: string]: number } = {};
    this.toolsRaw.forEach(t => {
      if (t.equip_id === equipId && t.error_name !== 'Unknown') {
        counts[t.error_name] = (counts[t.error_name] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }

  getTopErrorsForMonth(month: string): any[] {
    const counts: { [key: string]: number } = {};
    this.toolsRaw.forEach(t => {
      const date = new Date(t.state_in_date);
      const monthKey = this.getLocalMonthKey(t.state_in_date);
      if (monthKey === month && t.error_name !== 'Unknown') {
        counts[t.error_name] = (counts[t.error_name] || 0) + 1;
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
    this.selectedErrorTypes.forEach(e => map[e] = {});
  
    this.toolsRaw.forEach(t => {
      const e = t.error_name;
      if (!this.selectedErrorTypes.includes(e)) return;
      const monthKey = this.getLocalMonthKey(t.state_in_date); // 'YYYY-MM'
      map[e][monthKey] = (map[e][monthKey] || 0) + 1;
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
    this.toolsRaw.forEach(t => {
      if (t.error_name && t.error_name !== 'Unknown') {
        errorCounts[t.error_name] = (errorCounts[t.error_name] || 0) + 1;
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
}
