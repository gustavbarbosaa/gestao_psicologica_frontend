import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuarioService } from '@core/services/usuario-service';
import { Z_MODAL_DATA } from '@shared/components/dialog/dialog.service';
import { ZardDialogRef } from '@shared/components/dialog/dialog-ref';
import { ZardIconComponent } from '@shared/components/icon';
import { iUsuarioCadastroRequest } from '@shared/models/usuario.model';
import { ToastService } from '@shared/services/toast-service';

interface IModalData {
  onSaved?: () => void;
}

@Component({
  selector: 'app-cadastro-usuario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ZardIconComponent],
  templateUrl: './cadastro-usuario.html',
  styleUrl: './cadastro-usuario.css',
})
export class CadastroUsuario implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly toastService = inject(ToastService);
  private readonly dialogRef = inject<ZardDialogRef<CadastroUsuario>>(ZardDialogRef as any);
  private readonly data = inject<IModalData>(Z_MODAL_DATA as any);
  private readonly fb = inject(FormBuilder);

  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      nome: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue() as iUsuarioCadastroRequest;

    this.usuarioService.cadastrarUsuario(payload).subscribe({
      next: () => {
        this.toastService.exibirToastSucesso('Sucesso', 'Usuário criado com sucesso.');
        this.data?.onSaved?.();
        this.dialogRef.close(true);
      },
      error: (err) => {
        const mensagem = err.error?.erros?.[0] ?? err.error?.message ?? 'Falha ao criar usuário.';
        this.toastService.exibirToastErro('Erro', mensagem);
      },
    });
  }
}
