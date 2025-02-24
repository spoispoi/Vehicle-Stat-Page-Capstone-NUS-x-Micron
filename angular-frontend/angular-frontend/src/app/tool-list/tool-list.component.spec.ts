// import { ComponentFixture, TestBed } from '@angular/core/testing';

// import { ToolListComponent } from './tool-list.component';

// describe('ToolListComponent', () => {
//   let component: ToolListComponent;
//   let fixture: ComponentFixture<ToolListComponent>;

//   beforeEach(async () => {
//     await TestBed.configureTestingModule({
//       imports: [ToolListComponent]
//     })
//     .compileComponents();

//     fixture = TestBed.createComponent(ToolListComponent);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });

//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });
// });

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ToolListComponent } from './tool-list.component';
import { RouterTestingModule } from '@angular/router/testing';

describe('ToolListComponent', () => {
  let component: ToolListComponent;
  let fixture: ComponentFixture<ToolListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ToolListComponent], // Declare the component here
      imports: [
        provideHttpClient
      // Import HttpClientTestingModule for HttpClient dependencies
        //RouterTestingModule      // Import RouterTestingModule for any routing dependencies
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ToolListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
