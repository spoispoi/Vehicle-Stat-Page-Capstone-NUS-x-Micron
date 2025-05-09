import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { configureTestingModule } from '../test-setup';
import { of } from 'rxjs';

describe('AppComponent', () => {
  beforeEach(async () => {
    await configureTestingModule([], [AppComponent]).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should fetch statistics if equip_id is present in route', () => {
    const mockRoute = {
      snapshot: { paramMap: { get: () => '123' } }
    };
    const statisticsService = jasmine.createSpyObj('StatisticsService', ['getStatistics']);
    statisticsService.getStatistics.and.returnValue(of({ error_frequency: [], error_notes: {} }));
    const mockHttp = {} as any;
    const mockPlatformId = 'browser';
    const component = new AppComponent(mockRoute as any, statisticsService, mockHttp, mockPlatformId);
    spyOn(component, 'fetchStatistics');
    component.ngOnInit();
    expect(component.fetchStatistics).toHaveBeenCalledWith('123');
  });

  it('should log error if equip_id is not present in route', () => {
    const mockRoute = {
      snapshot: { paramMap: { get: () => null } }
    };
    const statisticsService = jasmine.createSpyObj('StatisticsService', ['getStatistics']);
    const mockHttp = {} as any;
    const mockPlatformId = 'browser';
    const component = new AppComponent(mockRoute as any, statisticsService, mockHttp, mockPlatformId);
    spyOn(console, 'error');
    component.ngOnInit();
    expect(console.error).toHaveBeenCalledWith('No equipment ID provided in the route aaa.');
  });

  it('should call transformData with data from statisticsService in fetchStatistics', () => {
    const mockData = { error_frequency: [], error_notes: {} };
    const statisticsService = jasmine.createSpyObj('StatisticsService', ['getStatistics']);
    statisticsService.getStatistics.and.returnValue(of(mockData));
    const mockHttp = {} as any;
    const mockPlatformId = 'browser';
    const component = new AppComponent({ snapshot: { paramMap: { get: () => '123' } } } as any, statisticsService, mockHttp, mockPlatformId);
    spyOn(component, 'transformData');
    component.fetchStatistics('123');
    expect(component.transformData).toHaveBeenCalledWith(mockData);
  });

  it('should transform error_frequency and error_notes in transformData', () => {
    const mockHttp = {} as any;
    const mockPlatformId = 'browser';
    const component = new AppComponent({ snapshot: { paramMap: { get: () => '123' } } } as any, {} as any, mockHttp, mockPlatformId);
    const data = {
      error_frequency: [
        { state_in_date: '2023-01-01', count: 2 },
        { state_in_date: '2023-01-02', count: 3 }
      ],
      error_notes: {
        NoteA: [1, 2],
        NoteB: [3]
      }
    };
    component.transformData(data);
    expect(component.errorFrequencyData).toEqual([
      { name: new Date('2023-01-01').toLocaleDateString(), value: 2 },
      { name: new Date('2023-01-02').toLocaleDateString(), value: 3 }
    ]);
    expect(component.errorNotesData).toEqual([
      { name: 'NoteA', value: 2 },
      { name: 'NoteB', value: 1 }
    ]);
  });
});
