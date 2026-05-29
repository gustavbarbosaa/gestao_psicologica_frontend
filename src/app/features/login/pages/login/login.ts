import { Component, inject, OnInit, signal } from '@angular/core';
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
export class Login implements OnInit {
  protected readonly idEmail = generateId('email');
  protected readonly idPassword = generateId('password');
  protected loginForm!: FormGroup;
  protected loading = signal<boolean>(false);
  protected credenciaisInvalidas = signal<boolean>(false);
  protected usuarioInativo = signal<boolean>(false);
  protected mostrarSenha = signal<boolean>(false);

  private readonly formBuilderService = inject(NonNullableFormBuilder);
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  ngOnInit(): void {
    this.initLoginForm();
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

  protected toggleExibirSenha(): void {
    this.mostrarSenha.update((mostrar) => !mostrar);
  }
}
