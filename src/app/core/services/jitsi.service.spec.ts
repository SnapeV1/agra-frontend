import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { JitsiService } from './jitsi.service';

describe('JitsiService', () => {
  let service: JitsiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(JitsiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have initial connection status as disconnected', () => {
    service.connectionStatus$.subscribe(status => {
      expect(status).toBe('disconnected');
    });
  });

  it('should have empty participants initially', () => {
    service.participants$.subscribe(participants => {
      expect(participants).toEqual([]);
    });
  });

  it('should not be in room initially', () => {
    expect(service.isInRoom()).toBeFalse();
  });

  it('should return null for current room initially', () => {
    expect(service.getCurrentRoom()).toBeNull();
  });
});