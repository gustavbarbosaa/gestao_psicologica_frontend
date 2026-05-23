import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '@env/environment';
import { switchMap } from 'rxjs';

const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
const XSRF_HEADER_NAME = 'X-XSRF-TOKEN';
const CSRF_ENDPOINT = `${environment.apiUrl}/autenticacao/csrf`;

function readCookie(name: string): string | null {
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${name}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.split('=').slice(1).join('='));
}

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  const httpClient = inject(HttpClient);
  const isApiRequest = req.url.startsWith(environment.apiUrl);
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());

  if (!isApiRequest || !isMutation || req.headers.has(XSRF_HEADER_NAME)) {
    return next(req);
  }

  const csrfToken = readCookie(XSRF_COOKIE_NAME);
  if (!csrfToken) {
    return httpClient.get<void>(CSRF_ENDPOINT).pipe(
      switchMap(() => {
        const refreshedToken = readCookie(XSRF_COOKIE_NAME);

        if (!refreshedToken) {
          return next(req);
        }

        return next(
          req.clone({
            setHeaders: {
              [XSRF_HEADER_NAME]: refreshedToken,
            },
          }),
        );
      }),
    );
  }

  return next(
    req.clone({
      setHeaders: {
        [XSRF_HEADER_NAME]: csrfToken,
      },
    }),
  );
};
