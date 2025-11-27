import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/pages/login/login').then((m) => m.Login),
  },
];
