import { Injectable, OnDestroy } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, Subscriber } from 'rxjs';
import { SAMPLE_HOLIDAYS } from './demo-data';

export type DemoOutcome = 'ok' | 'error500' | 'offline' | 'hang';

export interface DemoPlan {
  latencyMs: number;
  outcome: DemoOutcome;
}

export type DemoEventType = 'request' | 'response' | 'delivered' | 'error' | 'failed' | 'cancel';

export interface DemoEvent {
  type: DemoEventType;
  id: number;
  country: string;
  year: number;
  status?: number;
  count?: number;
}

interface LiveRequest {
  timer?: ReturnType<typeof setTimeout>;
  subscriber: Subscriber<HttpEvent<unknown>>;
}

/**
 * A stand-in for the network. HttpClient built on top of it behaves exactly as usual,
 * but each request's latency and outcome come from `plan`, and every step is reported
 * to `listener` so the diagrams can draw it.
 */
@Injectable()
export class DemoHttpHandler extends HttpHandler implements OnDestroy {
  plan: (country: string, year: number) => DemoPlan = () => ({ latencyMs: 400, outcome: 'ok' });
  listener: (event: DemoEvent) => void = () => undefined;
  requests = 0;

  private nextId = 1;
  private readonly live = new Map<number, LiveRequest>();

  handle(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    const match = /\/PublicHolidays\/(\d{4})\/([A-Z]{2})$/.exec(req.url);
    const year = Number(match?.[1] ?? 0);
    const country = match?.[2] ?? '??';

    return new Observable<HttpEvent<unknown>>((subscriber) => {
      const id = this.nextId++;
      const base = { id, country, year };
      const { latencyMs, outcome } = this.plan(country, year);
      const request: LiveRequest = { subscriber };
      let settled = false;

      this.requests++;
      this.live.set(id, request);
      this.listener({ type: 'request', ...base });

      if (outcome !== 'hang') {
        request.timer = setTimeout(() => {
          settled = true;
          this.live.delete(id);
          if (outcome === 'ok') {
            const body = SAMPLE_HOLIDAYS[`${country}-${year}`] ?? [];
            this.listener({ type: 'response', ...base, status: 200, count: body.length });
            subscriber.next(new HttpResponse({ status: 200, body, url: req.urlWithParams }));
            subscriber.complete();
            this.listener({ type: 'delivered', ...base });
          } else {
            const status = outcome === 'error500' ? 500 : 0;
            this.listener({ type: 'error', ...base, status });
            subscriber.error(
              new HttpErrorResponse({
                status,
                statusText: status ? 'Internal Server Error' : 'Unknown Error',
                url: req.urlWithParams,
              }),
            );
            this.listener({ type: 'failed', ...base, status });
          }
        }, latencyMs);
      }

      return () => {
        clearTimeout(request.timer);
        this.live.delete(id);
        if (!settled) this.listener({ type: 'cancel', ...base });
      };
    });
  }

  /** Stops reporting and ends every open request so no timers outlive the demo. */
  dispose(): void {
    this.listener = () => undefined;
    for (const { timer, subscriber } of [...this.live.values()]) {
      clearTimeout(timer);
      subscriber.error(new HttpErrorResponse({ status: 0, statusText: 'Disposed' }));
    }
    this.live.clear();
  }

  ngOnDestroy(): void {
    this.dispose();
  }
}
