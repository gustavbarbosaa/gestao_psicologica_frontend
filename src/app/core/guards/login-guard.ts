import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { LoginService } from '@core/services/login-service';
import { catchError, map, of } from 'rxjs';

export const loginGuard: CanMatchFn = () => {
  const loginService = inject(LoginService);
  const router = inject(Router);

  if (loginService.isLogado()) {
    return router.createUrlTree(['/home']);
  }

  if (!loginService.isLogado()) {
    return true;
  }

  return loginService.verificaUsuarioLogado().pipe(
    map(() => {
      return router.createUrlTree(['/home']);
    }),
    catchError(() => of(true)),
  );
};
