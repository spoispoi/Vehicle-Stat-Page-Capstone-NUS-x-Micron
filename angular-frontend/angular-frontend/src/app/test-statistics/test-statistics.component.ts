import { Component, OnInit } from '@angular/core';
import { NgxChartsModule, LegendPosition } from '@swimlane/ngx-charts';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-test-statistics',
  standalone: true,
  imports: [CommonModule, NgxChartsModule],
  template: `
    <div class="container mt-4">
      <h2 class="text-center mb-4">Test Statistics Dashboard</h2>

      <!-- Minimal Working Example for Legend Visibility -->
      <div style="width: 100%; min-width: 600px; min-height: 500px; margin-bottom: 40px; border: 2px dashed #aaa; background: #fff;">
        <h4>Minimal Legend Test</h4>
        <ngx-charts-pie-chart
          [results]="testResults"
          [legend]="true"
          [legendPosition]="legendPosition"
          [labels]="true"
          [view]="[600, 500]">
        </ngx-charts-pie-chart>
      </div>

      <!-- Test Results Pie Chart -->
      <div class="row mb-4">
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Test Results Overview</h5>
              <p class="chart-desc">Shows the proportion of passed vs failed tests.</p>
              <div style="width: 100%; min-width: 600px; min-height: 500px;">
                <ngx-charts-pie-chart
                  [results]="testResults"
                  [gradient]="true"
                  [legend]="true"
                  [legendPosition]="legendPosition"
                  [labels]="true"
                  [doughnut]="false"
                  [arcWidth]="0.5"
                  [view]="[600, 500]">
                </ngx-charts-pie-chart>
              </div>
            </div>
          </div>
        </div>

        <!-- Coverage Metrics Bar Chart -->
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Coverage Metrics</h5>
              <p class="chart-desc">Shows the percentage of code covered by tests for each metric.</p>
              <div style="width: 100%; min-width: 600px; min-height: 500px;">
                <ngx-charts-bar-vertical
                  [results]="coverageData"
                  [gradient]="true"
                  [xAxis]="true"
                  [yAxis]="true"
                  [legend]="true"
                  [legendPosition]="legendPosition"
                  [showXAxisLabel]="true"
                  [showYAxisLabel]="true"
                  [xAxisLabel]="'Coverage Metric'"
                  [yAxisLabel]="'Coverage %'"
                  [view]="[600, 500]">
                </ngx-charts-bar-vertical>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Component Test Distribution -->
      <div class="row">
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Component Test Distribution</h5>
              <p class="chart-desc">Shows how tests are distributed across components and services.</p>
              <div style="width: 100%; min-width: 600px; min-height: 500px;">
                <ngx-charts-pie-chart
                  [results]="componentTests"
                  [gradient]="true"
                  [legend]="true"
                  [legendPosition]="legendPosition"
                  [labels]="true"
                  [doughnut]="true"
                  [arcWidth]="0.5"
                  [view]="[600, 500]">
                </ngx-charts-pie-chart>
              </div>
            </div>
          </div>
        </div>

        <!-- Coverage Goals -->
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Coverage Goals Progress</h5>
              <p class="chart-desc">Compares current coverage to the target for each metric.</p>
              <div style="width: 100%; min-width: 600px; min-height: 500px;">
                <ngx-charts-bar-vertical-2d
                  [results]="coverageGoals"
                  [gradient]="true"
                  [xAxis]="true"
                  [yAxis]="true"
                  [legend]="true"
                  [legendPosition]="legendPosition"
                  [showXAxisLabel]="true"
                  [showYAxisLabel]="true"
                  [xAxisLabel]="'Coverage Metric'"
                  [yAxisLabel]="'Coverage %'"
                  [view]="[600, 500]">
                </ngx-charts-bar-vertical-2d>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
    }
    .card-title {
      color: #333;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .chart-desc {
      font-size: 1rem;
      color: #666;
      margin-bottom: 12px;
    }
    ::ng-deep .legend {
      margin-top: 24px !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
      border: 1px solid #e0e0e0 !important;
      border-radius: 8px !important;
      background: #fff !important;
      padding: 8px 16px !important;
      width: 100% !important;
    }
    ::ng-deep .ngx-charts-legend {
      display: flex !important;
      justify-content: center !important;
      flex-wrap: wrap !important;
      width: 100% !important;
    }
    ::ng-deep .legend-label {
      margin: 0 16px 8px 0 !important;
      font-size: 1.1rem !important;
      font-weight: 600 !important;
      padding: 6px 14px !important;
      border-radius: 6px !important;
      background: #f8f9fa !important;
      color: #222 !important;
    }
    ::ng-deep .legend-label-text, 
    ::ng-deep .legend-title {
      font-size: 1.1rem !important;
      font-weight: bold !important;
      color: #222 !important;
    }
    ::ng-deep .legend-title {
      margin-bottom: 8px !important;
    }
    ::ng-deep .x.axis-label, 
    ::ng-deep .y.axis-label, 
    ::ng-deep .tick text {
      font-size: 1.1rem !important;
      font-weight: bold !important;
      fill: #222 !important;
    }
  `]
})
export class TestStatisticsComponent implements OnInit {
  legendPosition: LegendPosition = LegendPosition.Below;
  // Test Results Data
  testResults = [
    {
      name: 'Passed',
      value: 23
    },
    {
      name: 'Failed',
      value: 1
    }
  ];

  // Coverage Data
  coverageData = [
    {
      name: 'Statements',
      value: 59.27
    },
    {
      name: 'Branches',
      value: 41.93
    },
    {
      name: 'Functions',
      value: 53.42
    },
    {
      name: 'Lines',
      value: 61.08
    }
  ];

  // Component Test Distribution
  componentTests = [
    {
      name: 'EquipStatistics',
      value: 8
    },
    {
      name: 'ToolList',
      value: 6
    },
    {
      name: 'ToolDetail',
      value: 5
    },
    {
      name: 'Services',
      value: 5
    }
  ];

  // Coverage Goals
  coverageGoals = [
    {
      name: 'Statements',
      series: [
        {
          name: 'Current',
          value: 59.27
        },
        {
          name: 'Target',
          value: 80
        }
      ]
    },
    {
      name: 'Branches',
      series: [
        {
          name: 'Current',
          value: 41.93
        },
        {
          name: 'Target',
          value: 80
        }
      ]
    },
    {
      name: 'Functions',
      series: [
        {
          name: 'Current',
          value: 53.42
        },
        {
          name: 'Target',
          value: 80
        }
      ]
    },
    {
      name: 'Lines',
      series: [
        {
          name: 'Current',
          value: 61.08
        },
        {
          name: 'Target',
          value: 80
        }
      ]
    }
  ];

  constructor() {}

  ngOnInit(): void {}
} 