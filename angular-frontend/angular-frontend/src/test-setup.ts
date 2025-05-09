import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

export const configureTestingModule = (declarations: any[] = [], imports: any[] = []) => {
  return TestBed.configureTestingModule({
    declarations,
    imports: [
      HttpClientTestingModule,
      RouterTestingModule,
      NoopAnimationsModule,
      ...imports
    ]
  });
}; 