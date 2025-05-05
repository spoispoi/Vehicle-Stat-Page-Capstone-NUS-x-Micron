import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxChartsBarVerticalComponent } from './ngx-charts-bar-vertical.component';

describe('NgxChartsBarVerticalComponent', () => {
  let component: NgxChartsBarVerticalComponent;
  let fixture: ComponentFixture<NgxChartsBarVerticalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxChartsBarVerticalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgxChartsBarVerticalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
