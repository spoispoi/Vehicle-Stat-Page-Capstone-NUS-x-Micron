// import { ComponentFixture, TestBed } from '@angular/core/testing';

// import { ToolListComponent } from './tool-list.component';

// describe('ToolListComponent', () => {
//   let component: ToolListComponent;
//   let fixture: ComponentFixture<ToolListComponent>;

//   beforeEach(async () => {
//     await TestBed.configureTestingModule({
//       imports: [ToolListComponent]
//     })
//     .compileComponents();

//     fixture = TestBed.createComponent(ToolListComponent);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });

//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });
// });

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToolListComponent } from './tool-list.component';
import { ToolService } from '../tool.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

describe('ToolListComponent', () => {
  let component: ToolListComponent;
  let fixture: ComponentFixture<ToolListComponent>;
  let toolService: jasmine.SpyObj<ToolService>;

  const mockTools = [
    {
      id: 1,
      equip_id: 'TEST-001',
      state_in_date: '2024-03-10T10:00:00',
      event_code: 'E001',
      error_name: 'Error Type 1',
      error_description: 'Test error 1'
    },
    {
      id: 2,
      equip_id: 'TEST-001',
      state_in_date: '2024-03-10T11:00:00',
      event_code: 'E001',
      error_name: 'Error Type 1',
      error_description: 'Test error 2'
    },
    {
      id: 3,
      equip_id: 'TEST-002',
      state_in_date: '2024-03-10T12:00:00',
      event_code: 'E002',
      error_name: 'Error Type 2',
      error_description: 'Test error 3'
    }
  ];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ToolService', ['getTools']);
    spy.getTools.and.returnValue(of(mockTools));

    await TestBed.configureTestingModule({
      imports: [
        ToolListComponent,
        HttpClientTestingModule,
        RouterTestingModule,
        NgxChartsModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: ToolService, useValue: spy }
      ]
    }).compileComponents();

    toolService = TestBed.inject(ToolService) as jasmine.SpyObj<ToolService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ToolListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load tools on init', () => {
    expect(toolService.getTools).toHaveBeenCalled();
    expect(component.toolsRaw).toEqual(mockTools);
  });

  it('should filter tools by search term', () => {
    const searchEvent = { target: { value: 'TEST-001' } } as unknown as Event;
    component.onSearch(searchEvent);
    expect(component.filteredTools.length).toBe(1);
    expect(component.filteredTools[0].equip_id).toBe('TEST-001');
  });

  it('should calculate error counts correctly', () => {
    const errorCounts = component.calculateErrorCounts(mockTools);
    expect(errorCounts['Error Type 1']).toBe(2);
    expect(errorCounts['Error Type 2']).toBe(1);
  });

  it('should format top 10 chart data correctly', () => {
    const errorCounts = { 'Error Type 1': 2, 'Error Type 2': 1 };
    const chartData = component.formatTop10ChartData(errorCounts);
    expect(chartData.length).toBe(2);
    expect(chartData[0].value).toBe(2);
    expect(chartData[1].value).toBe(1);
  });

  it('should toggle dark mode', () => {
    expect(component.isDarkMode).toBeFalse();
    component.toggleDarkMode();
    expect(component.isDarkMode).toBeTrue();
  });

  it('should toggle error expansion', () => {
    expect(component.expandedErrorIndex).toBeNull();
    component.toggleError(0);
    expect(component.expandedErrorIndex).toBe(0);
    component.toggleError(0);
    expect(component.expandedErrorIndex).toBeNull();
  });

  it('should format date correctly', () => {
    const date = '2024-03-10T10:00:00';
    const formattedDate = component.formatDate(date);
    expect(formattedDate).toBe('2024-03-10 10:00:00');
  });

  it('should handle null date in formatDate', () => {
    const formattedDate = component.formatDate(null);
    expect(formattedDate).toBe('N/A');
  });

  it('should sort tools by equip_id', () => {
    component.tools = [
      { equip_id: 'TEST-002' },
      { equip_id: 'TEST-001' }
    ];
    component.sortByEquipId();
    expect(component.tools[0].equip_id).toBe('TEST-001');
    expect(component.tools[1].equip_id).toBe('TEST-002');
  });

  it('should calculate monthly error trend', () => {
    const trendData = component.calculateMonthlyErrorTrend(mockTools);
    expect(trendData.length).toBeGreaterThan(0);
    expect(trendData[0].name).toBeDefined();
    expect(trendData[0].value).toBeDefined();
  });
});

describe('ToolListComponent helper methods', () => {
  let component: ToolListComponent;

  beforeEach(() => {
    component = new ToolListComponent(
      {} as any, // ToolService
      {} as any, // Renderer2
      {} as any, // DOCUMENT
      {} as any  // Router
    );
    component.toolsRaw = [
      { equip_id: 'E1', error_name: 'ErrorA', state_in_date: '2023-01-01' },
      { equip_id: 'E2', error_name: 'ErrorA', state_in_date: '2023-01-01' },
      { equip_id: 'E1', error_name: 'ErrorB', state_in_date: '2023-01-01' },
      { equip_id: 'E3', error_name: 'Unknown', state_in_date: '2023-01-01' },
      { equip_id: 'E1', error_name: 'ErrorA', state_in_date: '2023-02-01' },
      { equip_id: 'E2', error_name: 'ErrorC', state_in_date: '2023-01-01' },
    ];
  });

  it('should get top 5 equipments for a given error', () => {
    const result = component.getEquipmentsForError('ErrorA');
    expect(result).toEqual([
      { name: 'E1', value: 2 },
      { name: 'E2', value: 1 }
    ]);
  });

  it('should return empty array if no equipments match error', () => {
    const result = component.getEquipmentsForError('ErrorX');
    expect(result).toEqual([]);
  });

  it('should get top 5 errors for a given equipment', () => {
    const result = component.getErrorsForEquip('E1');
    expect(result).toEqual([
      { name: 'ErrorA', value: 2 },
      { name: 'ErrorB', value: 1 }
    ]);
  });

  it('should exclude Unknown errors in getErrorsForEquip', () => {
    const result = component.getErrorsForEquip('E3');
    expect(result).toEqual([]);
  });

  it('should get top 10 errors for a month', () => {
    spyOn<any>(component, 'getLocalMonthKey').and.callFake((date: any) => '2023-01');
    const result = component.getTopErrorsForMonth('2023-01');
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(e => e.name === 'ErrorA')).toBeTrue();
  });

  it('should handle onErrorTypeToggle add/remove', () => {
    component.selectedErrorTypes = ['ErrorA'];
    component.generateMultiLineChart = jasmine.createSpy();
    component.onErrorTypeToggle('ErrorB');
    expect(component.selectedErrorTypes).toContain('ErrorB');
    component.onErrorTypeToggle('ErrorA');
    expect(component.selectedErrorTypes).not.toContain('ErrorA');
    expect(component.generateMultiLineChart).toHaveBeenCalled();
  });

  it('should filter error types in onSearchError', () => {
    component.allErrorTypes = ['ErrorA', 'ErrorB', 'ErrorC'];
    const event = { target: { value: 'errorb' } } as any;
    component.onSearchError(event);
    expect(component.filteredErrorTypes).toEqual(['ErrorB']);
  });

  it('should clear all errors', () => {
    component.selectedErrorTypes = ['ErrorA', 'ErrorB'];
    component.generateMultiLineChart = jasmine.createSpy();
    component.clearAllErrors();
    expect(component.selectedErrorTypes).toEqual([]);
    expect(component.generateMultiLineChart).toHaveBeenCalled();
  });

  it('should select top errors', () => {
    component.generateMultiLineChart = jasmine.createSpy();
    component.selectTopErrors();
    expect(component.selectedErrorTypes.length).toBeLessThanOrEqual(5);
    expect(component.generateMultiLineChart).toHaveBeenCalled();
  });
});
