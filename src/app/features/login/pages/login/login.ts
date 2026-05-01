import { Component, inject, OnInit, signal } from '@angular/core';
import { EsqueceuSenha } from '@features/login/components/esqueceu-senha/esqueceu-senha';
import { ZardButtonComponent } from '@shared/components/button/button.component';
import { ZardCardComponent } from '@shared/components/card/card.component';
import { generateId } from '@shared/utils/merge-classes';
import { FormGroup, ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { LoginService } from '@core/services/login-service';
import { Router } from '@angular/router';
import { ToastService } from '@shared/services/toast-service';
import { Logo } from '@shared/components/logo/logo';

@Component({
  selector: 'app-login',
  imports: [ZardButtonComponent, ZardCardComponent, EsqueceuSenha, ReactiveFormsModule, Logo],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  protected readonly idEmail = generateId('email');
  protected readonly idPassword = generateId('password');
  protected loginForm!: FormGroup;
  protected loading = signal<boolean>(false);

  private readonly formBuilderService = inject(NonNullableFormBuilder);
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  ngOnInit(): void {
    this.initLoginForm();
  }

  private initLoginForm(): void {
    this.loginForm = this.formBuilderService.group({
      email: ['', [Validators.email]],
      senha: ['', [Validators.minLength(6), Validators.maxLength(20)]],
    });
  }

  protected signIn(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading.set(true);
    const loginData = this.loginForm.getRawValue();

    this.loginService.login(loginData).subscribe({
      next: () => {
        this.loading.set(false);
        this.toastService.exibirToastSucesso('Sucesso', 'Redirecionando para a página principal!');
        this.router.navigate(['/home']);
      },
      error: () => {
        this.loading.set(false);
        this.toastService.exibirToastErro('Erro', 'Verifique suas credenciais!');
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }
}
