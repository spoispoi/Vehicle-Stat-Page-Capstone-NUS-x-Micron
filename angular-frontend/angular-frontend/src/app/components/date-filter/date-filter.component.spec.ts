import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DateFilterComponent } from './date-filter.component';
import { FormsModule } from '@angular/forms';

describe('DateFilterComponent', () => {
  let component: DateFilterComponent;
  let fixture: ComponentFixture<DateFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DateFilterComponent, FormsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DateFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty date values', () => {
    expect(component.startDate).toBe('');
    expect(component.endDate).toBe('');
  });

  it('should set max date to today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(component.maxDate).toBe(today);
  });

  it('should return false for isFilterApplied when no dates are set', () => {
    expect(component.isFilterApplied).toBe(false);
  });

  it('should return true for isFilterApplied when start date is set', () => {
    component.startDate = '2024-01-01';
    expect(component.isFilterApplied).toBe(true);
  });

  it('should return true for isFilterApplied when end date is set', () => {
    component.endDate = '2024-12-31';
    expect(component.isFilterApplied).toBe(true);
  });

  it('should emit date range change when start date changes', () => {
    spyOn(component.dateRangeChange, 'emit');
    const event = { target: { value: '2024-01-01' } } as any;
    
    component.onStartDateChange(event);
    
    expect(component.startDate).toBe('2024-01-01');
    expect(component.dateRangeChange.emit).toHaveBeenCalledWith({
      startDate: '2024-01-01',
      endDate: ''
    });
  });

  it('should emit date range change when end date changes', () => {
    spyOn(component.dateRangeChange, 'emit');
    const event = { target: { value: '2024-12-31' } } as any;
    
    component.onEndDateChange(event);
    
    expect(component.endDate).toBe('2024-12-31');
    expect(component.dateRangeChange.emit).toHaveBeenCalledWith({
      startDate: '',
      endDate: '2024-12-31'
    });
  });

  it('should clear filter and emit filter cleared event', () => {
    spyOn(component.filterCleared, 'emit');
    component.startDate = '2024-01-01';
    component.endDate = '2024-12-31';
    
    component.clearFilter();
    
    expect(component.startDate).toBe('');
    expect(component.endDate).toBe('');
    expect(component.filterCleared.emit).toHaveBeenCalled();
  });

  it('should format date correctly', () => {
    const formattedDate = component['formatDate']('2024-01-15');
    expect(formattedDate).toContain('Jan 15, 2024');
  });

  it('should return correct filter description when no filter is applied', () => {
    const description = component.getFilterDescription();
    expect(description).toBe('No date filter applied - showing all data');
  });

  it('should return correct filter description when both dates are set', () => {
    component.startDate = '2024-01-01';
    component.endDate = '2024-12-31';
    const description = component.getFilterDescription();
    expect(description).toContain('Showing data from Jan 1, 2024 to Dec 31, 2024');
  });

  it('should return correct filter description when only start date is set', () => {
    component.startDate = '2024-01-01';
    const description = component.getFilterDescription();
    expect(description).toContain('Showing data from Jan 1, 2024 onwards');
  });

  it('should return correct filter description when only end date is set', () => {
    component.endDate = '2024-12-31';
    const description = component.getFilterDescription();
    expect(description).toContain('Showing data up to Dec 31, 2024');
  });
}); 