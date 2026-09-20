import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/rate-calendar/rate-calendar.component').then(
        (m) => m.RateCalendarComponent,
      ),
  },
];
