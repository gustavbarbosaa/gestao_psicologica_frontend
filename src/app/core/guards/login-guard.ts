import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { LoginService } from '@core/services/login-service';
import { catchError, map, of } from 'rxjs';

export const loginGuard: CanMatchFn = () => {
  const loginService = inject(LoginService);
  const router = inject(Router);

  if (loginService.isLogado()) {
    router.navigate(['/home']);
    return false;
  }

  if (!loginService.isLogado()) {
    return true;
  }

  return loginService.verificaUsuarioLogado().pipe(
    map(() => {
      router.navigate(['/home']);
      return false;
    }),
    catchError(() => of(true)),
  );
};
