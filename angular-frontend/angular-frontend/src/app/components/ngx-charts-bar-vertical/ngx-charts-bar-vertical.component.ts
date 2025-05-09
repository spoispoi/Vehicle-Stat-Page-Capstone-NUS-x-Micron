/* istanbul ignore file */
import { Component } from '@angular/core';
import { OnInit, Inject } from '@angular/core';
import { ToolService } from '../../tool.service';

@Component({
  selector: 'app-ngx-charts-bar-vertical',
  standalone: true,
  imports: [],
  templateUrl: './ngx-charts-bar-vertical.component.html',
  styleUrl: './ngx-charts-bar-vertical.component.css'
})
export class NgxChartsBarVerticalComponent {
  errorData: any[] = [];
  view: [number, number] = [700, 400]; // Chart dimensions

  // Options for the chart
  showXAxis = true;
  showYAxis = true;
  gradient = false;
  showLegend = true;
  showXAxisLabel = true;
  xAxisLabel = 'Error Names';
  showYAxisLabel = true;
  yAxisLabel = 'Counts';

  constructor(private toolService: ToolService) {}

  ngOnInit(): void {
    this.toolService.getTools().subscribe((tools: any[]) => {
      const errorCounts = this.calculateErrorCounts(tools);
      this.errorData = this.formatChartData(errorCounts);
    });
  }

  calculateErrorCounts(tools: any[]): { [key: string]: number } {
    const errorCounts: { [key: string]: number } = {};
    tools.forEach((tool) => {
      errorCounts[tool.error_name] = (errorCounts[tool.error_name] || 0) + 1;
    });
    return errorCounts;
  }

  formatChartData(errorCounts: { [key: string]: number }): any[] {
    return Object.keys(errorCounts).map((errorName) => ({
      name: errorName,
      value: errorCounts[errorName]
    }));
  }
}


