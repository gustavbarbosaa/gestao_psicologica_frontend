import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth-guard';
import { loginGuard } from '@core/guards/login-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home-page/home-page').then((m) => m.HomePage),
    canMatch: [authGuard],
  },
  {
    path: 'login',
    loadComponent: () => import('./features/login/pages/login/login').then((m) => m.Login),
    canMatch: [loginGuard],
  },
  {
    path: 'agendamentos',
    loadComponent: () =>
      import('./features/agendamentos/pages/agendamentos/agendamentos').then((m) => m.Agendamentos),
    canMatch: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
