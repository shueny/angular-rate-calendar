import { Routes } from '@angular/router';

const howItWorks = () =>
  import('./features/how-it-works/how-it-works.component').then((m) => m.HowItWorksComponent);

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/rate-calendar/rate-calendar.component').then(
        (m) => m.RateCalendarComponent,
      ),
    title: 'Rate Calendar',
  },
  {
    path: 'how-it-works',
    loadComponent: howItWorks,
    data: { lang: 'en' },
    title: 'How it works · Rate Calendar',
  },
  {
    path: 'how-it-works/zh',
    loadComponent: howItWorks,
    data: { lang: 'zh' },
    title: '它是怎麼運作的 · Rate Calendar',
  },
];
