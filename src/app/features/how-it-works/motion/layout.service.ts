import { Injectable, signal } from '@angular/core';

/** Shared layout state for the explainer; the page switches every figure to its narrow geometry below 640px. */
@Injectable({ providedIn: 'root' })
export class HiwLayout {
  readonly narrow = signal(false);
}
