import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { LoginService } from '@core/services/login-service';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanMatchFn = () => {
  const loginService = inject(LoginService);
  const router = inject(Router);

  if (loginService.isLogado()) {
    return true;
  }

  if (!loginService.isLogado()) {
    router.navigate(['/login']);
    return false;
  }

  return loginService.verificaUsuarioLogado().pipe(
    map(() => true),
    catchError(() => {
      router.navigate(['/login']);
      return of(false);
    }),
  );
};
