import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EquipStatisticsComponent } from './equip-statistics.component';
import { ActivatedRoute } from '@angular/router';
import { StatisticsService } from '../services/statistics.service';
import { HttpClient } from '@angular/common/http';
import { ViewportScroller } from '@angular/common';
import { of } from 'rxjs';

describe('EquipStatisticsComponent', () => {
  let component: EquipStatisticsComponent;
  let fixture: ComponentFixture<EquipStatisticsComponent>;
  let mockStatisticsService: jasmine.SpyObj<StatisticsService>;
  let mockActivatedRoute: any;
  let mockHttpClient: jasmine.SpyObj<HttpClient>;
  let mockViewportScroller: jasmine.SpyObj<ViewportScroller>;

  beforeEach(async () => {
    mockStatisticsService = jasmine.createSpyObj('StatisticsService', ['getStatistics']);
    mockHttpClient = jasmine.createSpyObj('HttpClient', ['get']);
    mockViewportScroller = jasmine.createSpyObj('ViewportScroller', ['scrollToPosition']);

    mockActivatedRoute = {
      params: of({ equip_id: 'TEST001' })
    };

    await TestBed.configureTestingModule({
      imports: [EquipStatisticsComponent],
      providers: [
        { provide: StatisticsService, useValue: mockStatisticsService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: ViewportScroller, useValue: mockViewportScroller }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EquipStatisticsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with equipment ID from route', () => {
    fixture.detectChanges();
    expect(component.equipId).toBe('TEST001');
  });

  it('should load statistics on init', () => {
    const mockData = {
      most_common_event_code: 'TEST_CODE',
      most_common_error_name: 'TEST_ERROR',
      latest_error_date: '2024-01-01',
      error_frequency: [],
      error_notes: {}
    };
    
    mockStatisticsService.getStatistics.and.returnValue(of(mockData));
    
    fixture.detectChanges();
    
    expect(mockStatisticsService.getStatistics).toHaveBeenCalledWith('TEST001', '', '');
  });

  it('should handle date range changes', () => {
    fixture.detectChanges();
    
    const dateRange = { startDate: '2024-01-01', endDate: '2024-12-31' };
    component.onDateRangeChange(dateRange);
    
    expect(component.startDate).toBe('2024-01-01');
    expect(component.endDate).toBe('2024-12-31');
  });

  it('should clear filters', () => {
    fixture.detectChanges();
    
    component.startDate = '2024-01-01';
    component.endDate = '2024-12-31';
    
    component.onFilterCleared();
    
    expect(component.startDate).toBe('');
    expect(component.endDate).toBe('');
  });

  it('should format date correctly', () => {
    const formattedDate = component.formatDate('2024-01-15T10:30:00');
    expect(formattedDate).toContain('2024');
  });

  it('should sort entries correctly', () => {
    const entries = [
      { state_in_date: '2024-01-01', event_code: 'A', error_name: 'Error1', error_description: 'Desc1' },
      { state_in_date: '2024-01-02', event_code: 'B', error_name: 'Error2', error_description: 'Desc2' }
    ];
    
    const sorted = component.sortEntries(entries);
    expect(sorted[0].state_in_date).toBe('2024-01-02');
  });
});
