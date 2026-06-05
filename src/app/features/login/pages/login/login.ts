import { Component, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { environment } from '@env/environment';
import { ZardButtonComponent } from '@shared/components/button/button.component';
import { ZardCardComponent } from '@shared/components/card/card.component';
import { generateId } from '@shared/utils/merge-classes';
import { FormGroup, ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { LoginService } from '@core/services/login-service';
import { Router } from '@angular/router';
import { ToastService } from '@shared/services/toast-service';
import { Logo } from '@shared/components/logo/logo';
import { ZardIconComponent } from '@shared/components/icon';

@Component({
  selector: 'app-login',
  imports: [ZardButtonComponent, ZardCardComponent, ReactiveFormsModule, Logo, ZardIconComponent],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit, OnDestroy {
  protected readonly idEmail = generateId('email');
  protected readonly idPassword = generateId('password');
  protected loginForm!: FormGroup;
  protected loading = signal<boolean>(false);
  protected credenciaisInvalidas = signal<boolean>(false);
  protected usuarioInativo = signal<boolean>(false);
  protected mostrarSenha = signal<boolean>(false);
  protected carregandoGoogle = signal<boolean>(true);
  protected googleDisponivel = signal<boolean>(true);

  private readonly formBuilderService = inject(NonNullableFormBuilder);
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly googleButtonRef = viewChild<ElementRef<HTMLElement>>('googleButtonRef');
  private googleScriptCheckId?: ReturnType<typeof setInterval>;
  private googleScriptTimeoutId?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.initLoginForm();
    this.inicializarGoogleSignIn();
  }

  ngOnDestroy(): void {
    if (this.googleScriptCheckId) {
      clearInterval(this.googleScriptCheckId);
    }

    if (this.googleScriptTimeoutId) {
      clearTimeout(this.googleScriptTimeoutId);
    }
  }

  private initLoginForm(): void {
    this.loginForm = this.formBuilderService.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(20)]],
    });

    this.loginForm.valueChanges.subscribe(() => {
      if (this.credenciaisInvalidas()) {
        this.credenciaisInvalidas.set(false);
      }

      if (this.usuarioInativo()) {
        this.usuarioInativo.set(false);
      }
    });
  }

  protected signIn(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.credenciaisInvalidas.set(false);
    this.usuarioInativo.set(false);
    const loginData = this.loginForm.getRawValue();

    this.loginService.login(loginData).subscribe({
      next: () => {
        this.loading.set(false);
        this.toastService.exibirToastSucesso('Sucesso', 'Redirecionando para a página principal!');
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.loading.set(false);

        if (err.status === 409 && err.error?.message === 'Usuário inativo.') {
          this.usuarioInativo.set(true);
        } else {
          this.credenciaisInvalidas.set(true);
        }

        this.loginForm.markAllAsTouched();
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  protected onGoogleSignIn(response: GoogleCredentialResponse): void {
    const idToken = response.credential;

    if (!idToken) {
      this.toastService.exibirToastErro(
        'Erro de autenticação',
        'O Google não retornou uma credencial válida.',
      );
      return;
    }

    this.loading.set(true);
    this.loginService.loginWithGoogle(idToken).subscribe({
      next: () => {
        this.loading.set(false);
        this.toastService.exibirToastSucesso('Sucesso', 'Redirecionando para a página principal!');
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.loading.set(false);
        const mensagem = err.error?.message || 'Erro ao autenticar com o Google. Tente novamente.';
        this.toastService.exibirToastErro('Erro de autenticação', mensagem);
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }

  protected toggleExibirSenha(): void {
    this.mostrarSenha.update((mostrar) => !mostrar);
  }

  private inicializarGoogleSignIn(): void {
    this.googleScriptCheckId = setInterval(() => {
      const buttonElement = this.googleButtonRef()?.nativeElement;
      const googleIdentity = window.google?.accounts.id;

      if (!buttonElement || !googleIdentity) {
        return;
      }

      if (this.googleScriptCheckId) {
        clearInterval(this.googleScriptCheckId);
        this.googleScriptCheckId = undefined;
      }

      if (this.googleScriptTimeoutId) {
        clearTimeout(this.googleScriptTimeoutId);
        this.googleScriptTimeoutId = undefined;
      }

      googleIdentity.initialize({
        client_id: environment.googleClientId,
        callback: (googleResponse) => this.onGoogleSignIn(googleResponse),
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: 'popup',
        context: 'signin',
      });

      buttonElement.innerHTML = '';

      googleIdentity.renderButton(buttonElement, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 320,
      });

      this.carregandoGoogle.set(false);
    }, 150);

    this.googleScriptTimeoutId = setTimeout(() => {
      if (!this.carregandoGoogle()) {
        return;
      }

      if (this.googleScriptCheckId) {
        clearInterval(this.googleScriptCheckId);
        this.googleScriptCheckId = undefined;
      }

      this.googleDisponivel.set(false);
      this.carregandoGoogle.set(false);
    }, 5000);
  }
}
