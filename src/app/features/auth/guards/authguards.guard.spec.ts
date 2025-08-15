import { TestBed } from '@angular/core/testing';

import { AuthguardsGuard } from './authguards.guard';

describe('AuthguardsGuard', () => {
  let guard: AuthguardsGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(AuthguardsGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
