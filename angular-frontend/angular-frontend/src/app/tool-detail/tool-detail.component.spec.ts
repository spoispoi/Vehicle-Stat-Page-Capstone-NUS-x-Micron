import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToolDetailComponent } from './tool-detail.component';
import { ToolService } from '../tool.service';
import { of } from 'rxjs';
import { configureTestingModule } from '../../test-setup';

describe('ToolDetailComponent', () => {
  let component: ToolDetailComponent;
  let fixture: ComponentFixture<ToolDetailComponent>;
  let toolService: jasmine.SpyObj<ToolService>;

  const mockTool = {
    id: 1,
    equip_id: 'TEST-001',
    state_in_date: '2024-03-10T10:00:00',
    event_code: 'E001',
    error_name: 'Error Type 1',
    error_description: 'Test error 1'
  };

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ToolService', ['getTool']);
    spy.getTool.and.returnValue(of(mockTool));

    await configureTestingModule([], [ToolDetailComponent])
      .overrideProvider(ToolService, { useValue: spy })
      .compileComponents();

    toolService = TestBed.inject(ToolService) as jasmine.SpyObj<ToolService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ToolDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load tool data on init', () => {
    expect(toolService.getTool).toHaveBeenCalled();
    expect(component.tool).toEqual(mockTool);
  });
});
