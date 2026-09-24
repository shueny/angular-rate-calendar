# Rate Calendar

A configurable hotel rate pricing engine with a calendar UI, built with Angular 19.

**[Live Demo](https://shueny.github.io/angular-rate-calendar/)** · **[How it works](https://shueny.github.io/angular-rate-calendar/how-it-works)** (interactive walkthrough of the system design, also in [Traditional Chinese](https://shueny.github.io/angular-rate-calendar/how-it-works/zh)) · **[Learning notes: From React to Angular](https://shueny.github.io/angular-rate-calendar/learning/en/)** (interactive diagrams; also in [Traditional Chinese](https://shueny.github.io/angular-rate-calendar/learning/))

## Motivation

Dynamic pricing is a core domain problem in hospitality — room rates shift based on weekends, holidays, peak seasons, and other business rules. This project models that problem as a **composable rule engine** with a calendar visualization, demonstrating how to design extensible business logic in Angular.

## Architecture

```
src/app/
├── core/
│   ├── pricing-engine/          # Strategy Pattern rule engine
│   │   ├── pricing-rule.model.ts    # Interfaces + default config
│   │   ├── pricing-engine.service.ts # Combinator: applies rules in order
│   │   └── rules/
│   │       ├── weekend-rule.ts      # Weekend surcharge
│   │       ├── holiday-rule.ts      # Holiday surcharge
│   │       └── peak-season-rule.ts  # Peak season surcharge
│   └── holiday/
│       ├── holiday.model.ts         # API response + domain types
│       └── holiday.service.ts       # Nager.Date API wrapper + cache
└── features/
    ├── rate-calendar/
    │   ├── rate-calendar.component.ts   # Calendar grid + month nav
    │   ├── pricing-config-form.component.ts # Reactive Forms config panel
    │   └── price-detail.component.ts    # Price breakdown overlay
    └── how-it-works/                # Interactive system-design walkthrough (EN / 中文)
        ├── chapters/                    # Pricing pipeline, signals graph, network scenarios
        └── demo-http-handler.ts         # Simulated API (latency, errors, timeouts)
```

**Why this structure:**

- **`core/pricing-engine`** — Each rule implements a `PricingRule` interface (Strategy Pattern). Rules are independent, composable, and ordered. The engine applies enabled rules sequentially, multiplying adjustments onto the base rate. Adding a new rule means creating one class — no existing code changes.

- **`core/holiday`** — Encapsulates the external API call (Nager.Date) behind Signals. Includes a per-year cache, error handling, and loading state. The rest of the app never touches HTTP directly.

- **`features/rate-calendar`** — UI layer consumes Signals from both services. It doesn't know about HTTP or rule internals.

- **`features/how-it-works`** — Explains the design with live diagrams. Each chapter runs its own instance of the real `PricingEngineService` / `HolidayService`; the holiday service is fed by a simulated `HttpHandler` so latency, server errors, timeouts and out-of-order responses can be replayed on demand.

## How to Add a New Pricing Rule

1. Create a new class implementing `PricingRule`:

```typescript
// src/app/core/pricing-engine/rules/loyalty-rule.ts
import { PricingContext, PriceAdjustment, PricingRule } from '../pricing-rule.model';

export class LoyaltyDiscountRule implements PricingRule {
  name = 'Loyalty Discount';
  order = 10;
  enabled = true;

  apply(context: PricingContext): PriceAdjustment | null {
    // Your logic here
    return {
      ruleName: this.name,
      multiplier: 0.9, // 10% discount
      description: 'Loyalty member discount (×0.9)',
    };
  }
}
```

2. Register it in `PricingEngineService.rules` computed signal.
3. Write unit tests for the new rule.

That's it — no changes to the calendar, the form, or any other rule.

## Tech Stack

| Layer | Tool |
|-------|------|
| Framework | Angular 19 (Standalone Components, Signals, `@if`/`@for`) |
| Language | TypeScript strict mode |
| Unit Tests | Vitest + @analogjs/vite-plugin-angular |
| E2E Tests | Playwright (API mocked via `page.route()`) |
| Lint / Format | ESLint + angular-eslint + Prettier |
| CI | GitHub Actions (lint → typecheck → test → build → e2e) |
| Deploy | GitHub Pages |

## Getting Started

```bash
npm install --legacy-peer-deps
npm start              # dev server at http://localhost:4200
npm test               # unit tests (Vitest)
npm run e2e            # e2e tests (Playwright)
npm run lint           # ESLint
npm run format:check   # Prettier check
npm run typecheck      # TypeScript strict check
```

## Testing Strategy

**Unit tests** (Vitest) cover the pricing engine and holiday service:
- Each rule tested independently with edge cases (holiday on a weekend, overlapping rules)
- Service-level tests verify rule stacking, config updates, and signal reactivity
- Holiday service tested with `HttpTestingController` — no real API calls

**E2E tests** (Playwright) cover user-facing flows:
- Calendar renders correct day count
- Changing config form updates prices immediately
- Month navigation works and triggers holiday reload
- Clicking a day shows/hides price breakdown

All API calls are intercepted with `page.route()` in e2e to avoid external dependencies.

## Known Limitations

- Peak season months are hardcoded in config (no UI for selecting months)
- No authentication or persistence — config resets on page reload
- Holiday data depends on Nager.Date API availability (cached per session)

## License

[MIT](LICENSE) © 2026 Shueny
