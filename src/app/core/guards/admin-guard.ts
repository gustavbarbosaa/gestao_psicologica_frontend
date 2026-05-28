import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { LoginService } from '@core/services/login-service';
import { catchError, map, of } from 'rxjs';

export const adminGuard: CanMatchFn = () => {
  const loginService = inject(LoginService);
  const router = inject(Router);

  if (!loginService.isLogado()()) {
    return router.createUrlTree(['/login']);
  }

  if (loginService.usuario()) {
    return loginService.isAdmin() ? true : router.createUrlTree(['/home']);
  }

  return loginService.carregarUsuario().pipe(
    map(() => (loginService.isAdmin() ? true : router.createUrlTree(['/home']))),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
