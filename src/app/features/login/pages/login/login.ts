import { Component, inject, OnInit } from '@angular/core';
import { EsqueceuSenha } from '@features/login/components/esqueceu-senha/esqueceu-senha';
import { IconeLogin } from '@features/login/components/icone-login/icone-login';
import { ZardButtonComponent } from '@shared/components/button/button.component';
import { ZardCardComponent } from '@shared/components/card/card.component';
import { ZardDividerComponent } from '@shared/components/divider/divider.component';
import { generateId } from '@shared/utils/merge-classes';
import { FormGroup, ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { LoginService } from '@core/services/login-service';
import { Router } from '@angular/router';
import { ToastService } from '@shared/services/toast-service';

interface GoogleSignInResponse {
  getBasicProfile(): {
    getId(): string;
    getName(): string;
    getImageUrl(): string;
    getEmail(): string;
  };
  getAuthResponse(): {
    id_token: string;
  };
}

interface GapiAuth2 {
  init(options: { client_id: string }): Promise<void>;
  getAuthInstance(): {
    signIn(): Promise<GoogleSignInResponse>;
    isSignedIn: {
      get(): boolean;
    };
  };
}

interface Gapi {
  load(name: string, callback: () => void): void;
  auth2: GapiAuth2;
}

declare const gapi: Gapi;

@Component({
  selector: 'app-login',
  imports: [
    ZardButtonComponent,
    ZardCardComponent,
    ZardDividerComponent,
    IconeLogin,
    EsqueceuSenha,
    ReactiveFormsModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  protected readonly idEmail = generateId('email');
  protected readonly idPassword = generateId('password');
  protected loginForm!: FormGroup;

  private formBuilderService = inject(NonNullableFormBuilder);
  private loginService = inject(LoginService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  ngOnInit(): void {
    this.initializeGoogleSignIn();
    this.initLoginForm();
  }

  private initLoginForm(): void {
    this.loginForm = this.formBuilderService.group({
      email: ['', [Validators.email]],
      senha: ['', [Validators.minLength(6), Validators.maxLength(20)]],
    });
  }

  handleCredentialRespons(response: any): void {
    const token = response.credential;
    this.onSignIn(token);
  }

  private initializeGoogleSignIn(): void {
    if (typeof gapi !== 'undefined') {
      gapi.load('auth2', () => {
        gapi.auth2.init({
          client_id: '519340482200-2tl0nqoknnjnjfgnprgqkgvvrrbcrrpo.apps.googleusercontent.com',
        });
      });
    }
  }

  signInWithGoogle(): void {
    if (typeof gapi !== 'undefined' && gapi.auth2) {
      try {
        const auth2 = gapi.auth2.getAuthInstance();
        auth2
          .signIn()
          .then((googleUser: GoogleSignInResponse) => {
            this.onSignIn(googleUser);
          })
          .catch((error: Error) => {
            console.error('Erro ao fazer login com Google:', error);
          });
      } catch (error) {
        console.error('Erro ao obter instância de auth2:', error);
      }
    } else {
      console.error('Google API não está disponível');
    }
  }

  onSignIn(googleUser: GoogleSignInResponse): void {
    const profile = googleUser.getBasicProfile();
    console.log('ID: ' + profile.getId());
    console.log('Name: ' + profile.getName());
    console.log('Image URL: ' + profile.getImageUrl());
    console.log('Email: ' + profile.getEmail());

    const id_token = googleUser.getAuthResponse().id_token;
    console.log('ID Token:', id_token);
  }

  protected signIn(): void {
    if (this.loginForm.invalid) {
      return;
    }

    const loginData = this.loginForm.getRawValue();

    this.loginService.login(loginData).subscribe({
      next: () => {
        console.log('Login realizado com sucesso!');
        this.toastService.exibirToastSucesso('Sucesso', 'Redirecionando para a página principal!');
      },
      error: (error) => {
        console.error(error);
        this.toastService.exibirToastErro('Erro', 'Verifique suas credenciais!');
      },
    });
  }
}
