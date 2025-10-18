import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private pending = 0;
  private readonly subject = new BehaviorSubject<boolean>(false);
  readonly isLoading$ = this.subject.asObservable();

  start(): void {
    this.pending++;
    if (this.pending === 1) this.subject.next(true);
  }

  stop(): void {
    if (this.pending > 0) this.pending--;
    if (this.pending === 0) this.subject.next(false);
  }
}

