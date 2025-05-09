import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ToolService } from './tool.service';

describe('ToolService', () => {
  let service: ToolService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ToolService]
    });
    service = TestBed.inject(ToolService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Verify no outstanding requests
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all tools', () => {
    const mockTools = [
      { id: 1, equip_id: 'TEST-001', event_code: 'E001', error_name: 'Test Error 1' },
      { id: 2, equip_id: 'TEST-002', event_code: 'E002', error_name: 'Test Error 2' }
    ];

    service.getTools().subscribe(tools => {
      expect(tools).toEqual(mockTools);
    });

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/tools/');
    expect(req.request.method).toBe('GET');
    req.flush(mockTools);
  });

  it('should get a specific tool', () => {
    const mockTool = { id: 1, equip_id: 'TEST-001', event_code: 'E001', error_name: 'Test Error 1' };

    service.getTool(1).subscribe(tool => {
      expect(tool).toEqual(mockTool);
    });

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/tools/1/');
    expect(req.request.method).toBe('GET');
    req.flush(mockTool);
  });

  it('should delete a tool', () => {
    service.deleteTool(1).subscribe(response => {
      expect(response).toBeTruthy();
    });

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/tools/1/');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('should handle error when getting tools', () => {
    const errorMessage = 'Error fetching tools';

    service.getTools().subscribe({
      error: (error) => {
        expect(error.status).toBe(500);
        expect(error.statusText).toBe('Server Error');
      }
    });

    const req = httpMock.expectOne('http://127.0.0.1:8000/api/tools/');
    req.flush(errorMessage, { status: 500, statusText: 'Server Error' });
  });
});
