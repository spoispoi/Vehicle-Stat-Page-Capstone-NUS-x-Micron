import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EquipStatisticsComponent } from './equip-statistics.component';
import { configureTestingModule } from '../../test-setup';
import { of, throwError } from 'rxjs';
import { StatisticsService } from '../services/statistics.service';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

// Mock services
class MockStatisticsService {
  getStatistics = jasmine.createSpy().and.returnValue(of({
    most_common_event_code: 'E01',
    most_common_error_name: 'ErrorA',
    latest_error_date: '2023-01-01',
  }));
}

class MockHttpClient {
  get = jasmine.createSpy().and.returnValue(of([
    { error_name: 'Unknown', state_in_date: '2023-01-01', event_code: '', error_description: '' },
    { error_name: 'ErrorA', state_in_date: '2023-01-02', event_code: '', error_description: '' }
  ]));
}

describe('EquipStatisticsComponent', () => {
  let component: EquipStatisticsComponent;
  let fixture: ComponentFixture<EquipStatisticsComponent>;
  let statisticsService: StatisticsService;
  let httpClient: HttpClient;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        { provide: StatisticsService, useClass: MockStatisticsService },
        { provide: HttpClient, useClass: MockHttpClient },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '123' } } } },
      ],
      imports: [EquipStatisticsComponent, BrowserAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(EquipStatisticsComponent);
    component = fixture.componentInstance;
    statisticsService = TestBed.inject(StatisticsService);
    httpClient = TestBed.inject(HttpClient);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch statistics on init if equipId is present', () => {
    spyOn(component, 'fetchStatistics').and.callThrough();
    spyOn(component, 'fetchEquipEntries').and.callThrough();
    spyOn(component, 'fetchStatisticsGraph').and.stub();
    component.ngOnInit();
    expect(component.fetchStatistics).toHaveBeenCalledWith('123');
    expect(component.fetchEquipEntries).toHaveBeenCalledWith('123');
    expect(component.fetchStatisticsGraph).toHaveBeenCalledWith('123');
  });

  it('should handle error in fetchStatistics', () => {
    statisticsService.getStatistics = jasmine.createSpy().and.returnValue(throwError(() => new Error('fail')));
    spyOn(console, 'error');
    component.fetchStatistics('123');
    expect(console.error).toHaveBeenCalled();
  });

  it('should filter entries correctly in fetchEquipEntries', () => {
    component.fetchEquipEntries('123');
    expect(component.pmEntries.length).toBe(1);
    expect(component.entries.length).toBe(1);
    expect(component.filteredEntries.length).toBe(1);
  });

  it('should format date correctly', () => {
    const formatted = component.formatDate('2023-01-01');
    expect(formatted).toContain('2023');
  });

  it('should clear error filter', () => {
    component.selectedErrorName = 'ErrorA';
    component.clearErrorFilter();
    expect(component.selectedErrorName).toBeNull();
  });

  it('should handle error selection', () => {
    component.onErrorSelect({ name: 'ErrorA' });
    expect(component.selectedErrorName).toBe('ErrorA');
  });

  it('should not throw if statistics is null in populateStatistics', () => {
    component.statistics = null;
    expect(() => component.populateStatistics()).not.toThrow();
  });

  it('should handle empty data in fetchEquipEntries', () => {
    (httpClient.get as jasmine.Spy).and.returnValue(of([]));
    component.fetchEquipEntries('123');
    expect(component.pmEntries.length).toBe(0);
    expect(component.entries.length).toBe(0);
    expect(component.filteredEntries.length).toBe(0);
  });

  it('should not throw if equip-entries-container is missing in renderEquipEntries', () => {
    spyOn(document, 'getElementById').and.returnValue(null);
    expect(() => component.renderEquipEntries()).not.toThrow();
  });

  it('should handle empty entries in prepareErrorByEquipData', () => {
    component.entries = [];
    expect(() => component.prepareErrorByEquipData()).not.toThrow();
  });

  it('should handle null event in onErrorSelect', () => {
    component.onErrorSelect(null as any);
    expect(component.selectedErrorName).toBeUndefined();
  });

  it('should handle null in formatDate', () => {
    expect(component.formatDate(null)).toBe('');
  });

  it('should not fetch statistics if no equipId in route', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      providers: [
        { provide: StatisticsService, useClass: MockStatisticsService },
        { provide: HttpClient, useClass: MockHttpClient },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
      ],
      imports: [EquipStatisticsComponent, BrowserAnimationsModule],
    }).compileComponents();

    const fixture2 = TestBed.createComponent(EquipStatisticsComponent);
    const component2 = fixture2.componentInstance;
    spyOn(component2, 'fetchStatistics');
    spyOn(component2, 'fetchEquipEntries');
    spyOn(component2, 'fetchStatisticsGraph');
    component2.ngOnInit();
    expect(component2.fetchStatistics).not.toHaveBeenCalled();
    expect(component2.fetchEquipEntries).not.toHaveBeenCalled();
    expect(component2.fetchStatisticsGraph).not.toHaveBeenCalled();
  });

  it('should log error if fetchStatistics fails', () => {
    statisticsService.getStatistics = jasmine.createSpy().and.returnValue(throwError(() => new Error('fail')));
    spyOn(console, 'error');
    component.fetchStatistics('123');
    expect(console.error).toHaveBeenCalledWith('Error fetching statistics:', jasmine.any(Error));
  });

  it('should do nothing in populateStatistics if not isBrowser', () => {
    component.isBrowser = false;
    expect(() => component.populateStatistics()).not.toThrow();
  });

  it('should do nothing in renderEquipEntries if not isBrowser', () => {
    component.isBrowser = false;
    expect(() => component.renderEquipEntries()).not.toThrow();
  });

  it('should return early in transformData if error_frequency is missing', () => {
    expect(component.transformData({})).toBeUndefined();
  });
  it('should return early in transformData if error_frequency is empty', () => {
    expect(component.transformData({ error_frequency: [] })).toBeUndefined();
  });

  it('should skip error_frequency items with error_name "Unknown" in transformData', () => {
    const data = {
      error_frequency: [
        { date: '2023-01-01T00:00:00Z', error_name: 'Unknown', count: 5 },
        { date: '2023-01-01T00:00:00Z', error_name: 'ErrorA', count: 2 }
      ],
      error_notes: { ErrorA: [1, 2], Unknown: [3] }
    };
    component.transformData(data);
    expect(component.errorFrequencyData.some(d => d.series.some(s => s.name === 'Unknown'))).toBeFalse();
    expect(component.errorNotesData.some(n => n.name === 'Unknown')).toBeFalse();
  });

  it('should return value as is if no dash in formatXAxisTick', () => {
    expect(component.formatXAxisTick('Test')).toBe('Test');
  });
  it('should format date string in formatXAxisTick', () => {
    const result = component.formatXAxisTick('2023-01');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should filter entries and call renderEquipEntries in onErrorSelect', () => {
    component.entries = [
      { error_name: 'ErrorA', state_in_date: '2023-01-01', event_code: '', error_description: '' },
      { error_name: 'ErrorB', state_in_date: '2023-01-02', event_code: '', error_description: '' }
    ];
    spyOn(component, 'renderEquipEntries');
    component.entriesSection = { nativeElement: { scrollIntoView: jasmine.createSpy() } } as any;
    component.onErrorSelect({ name: 'ErrorA' });
    expect(component.filteredEntries.length).toBe(1);
    expect(component.renderEquipEntries).toHaveBeenCalled();
    expect(component.entriesSection.nativeElement.scrollIntoView).toHaveBeenCalled();
  });
  it('should not throw if entriesSection is undefined in onErrorSelect', () => {
    component.entries = [{ error_name: 'ErrorA', state_in_date: '2023-01-01', event_code: '', error_description: '' }];
    component.entriesSection = undefined as any;
    expect(() => component.onErrorSelect({ name: 'ErrorA' })).not.toThrow();
  });

  it('should filter entries and call renderEquipEntries in onMonthSelect', () => {
    component.entries = [
      { error_name: 'ErrorA', state_in_date: '2023-01-01', event_code: '', error_description: '' }
    ];
    spyOn(component, 'renderEquipEntries');
    component.entriesSection = { nativeElement: { scrollIntoView: jasmine.createSpy() } } as any;
    component.onMonthSelect({ series: 'Jan 2023' });
    expect(component.renderEquipEntries).toHaveBeenCalled();
    expect(component.entriesSection.nativeElement.scrollIntoView).toHaveBeenCalled();
  });
  it('should not throw if entriesSection is undefined in onMonthSelect', () => {
    component.entries = [{ error_name: 'ErrorA', state_in_date: '2023-01-01', event_code: '', error_description: '' }];
    component.entriesSection = undefined as any;
    expect(() => component.onMonthSelect({ series: 'Jan 2023' })).not.toThrow();
  });
  it('should filter entries and call renderEquipEntries in onTrendSelect', () => {
    component.entries = [
      { error_name: 'ErrorA', state_in_date: '2023-01-01', event_code: '', error_description: '' }
    ];
    spyOn(component, 'renderEquipEntries');
    component.entriesSection = { nativeElement: { scrollIntoView: jasmine.createSpy() } } as any;
    component.onTrendSelect({ name: 'Jan 2023' });
    expect(component.renderEquipEntries).toHaveBeenCalled();
    expect(component.entriesSection.nativeElement.scrollIntoView).toHaveBeenCalled();
  });
  it('should not throw if entriesSection is undefined in onTrendSelect', () => {
    component.entries = [{ error_name: 'ErrorA', state_in_date: '2023-01-01', event_code: '', error_description: '' }];
    component.entriesSection = undefined as any;
    expect(() => component.onTrendSelect({ name: 'Jan 2023' })).not.toThrow();
  });
});
