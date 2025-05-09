import { TestBed } from '@angular/core/testing';
import { StatisticsService } from './statistics.service';
import { configureTestingModule } from '../../test-setup';

describe('StatisticsService', () => {
  let service: StatisticsService;

  beforeEach(() => {
    configureTestingModule([], []);
    service = TestBed.inject(StatisticsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
