import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EquipStatisticsComponent } from './equip-statistics.component';

describe('EquipStatisticsComponent', () => {
  let component: EquipStatisticsComponent;
  let fixture: ComponentFixture<EquipStatisticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EquipStatisticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EquipStatisticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
