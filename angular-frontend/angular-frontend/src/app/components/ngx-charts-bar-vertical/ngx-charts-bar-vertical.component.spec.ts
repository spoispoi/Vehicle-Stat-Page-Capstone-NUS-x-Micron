import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxChartsBarVerticalComponent } from './ngx-charts-bar-vertical.component';
import { configureTestingModule } from '../../../test-setup';
import { of } from 'rxjs';
import { ToolService } from '../../tool.service';

// describe('NgxChartsBarVerticalComponent', () => {
//   let component: NgxChartsBarVerticalComponent;
//   let fixture: ComponentFixture<NgxChartsBarVerticalComponent>;
//   let toolService: jasmine.SpyObj<ToolService>;

//   beforeEach(async () => {
//     const toolServiceSpy = jasmine.createSpyObj('ToolService', ['getTools']);
//     await TestBed.configureTestingModule({
//       declarations: [NgxChartsBarVerticalComponent],
//       providers: [
//         { provide: ToolService, useValue: toolServiceSpy }
//       ]
//     }).compileComponents();
//     fixture = TestBed.createComponent(NgxChartsBarVerticalComponent);
//     component = fixture.componentInstance;
//     toolService = TestBed.inject(ToolService) as jasmine.SpyObj<ToolService>;
//   });

//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });

// });
