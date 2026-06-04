import { CommonModule, NgClass } from '@angular/common';
import { Component, inject, OnInit, signal, ViewContainerRef } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EvolucaoService } from '@core/services/evolucao-service';
import { ZardButtonComponent } from '@shared/components/button/button.component';
import { Z_MODAL_DATA, ZardDialogService } from '@shared/components/dialog/dialog.service';
import { ZardDialogRef } from '@shared/components/dialog/dialog-ref';
import { ZardIconComponent } from '@shared/components/icon';
import { ZardInputDirective } from '@shared/components/input/input.directive';
import { iEvolucaoRequest, iEvolucaoResponse } from '@shared/models/evolucao.model';
import { ToastService } from '@shared/services/toast-service';
import { format, parseISO } from 'date-fns';

type DetalheEvolucaoModalData = {
  evolucaoId: string;
  modo?: 'visualizar' | 'editar';
  canEdit?: boolean;
  canRemove?: boolean;
  onSaved?: (evolucao: iEvolucaoResponse) => void;
  onDeleted?: (evolucaoId: string) => void;
};

@Component({
  selector: 'app-detalhe-evolucao',
  standalone: true,
  imports: [
    CommonModule,
    NgClass,
    ReactiveFormsModule,
    ZardButtonComponent,
    ZardIconComponent,
    ZardInputDirective,
  ],
  templateUrl: './detalhe-evolucao.html',
  styleUrl: './detalhe-evolucao.css',
})
export class DetalheEvolucao implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly evolucaoService = inject(EvolucaoService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ZardDialogService);
  private readonly dialogRef = inject<ZardDialogRef<DetalheEvolucao>>(ZardDialogRef as any);
  protected readonly data = inject<DetalheEvolucaoModalData>(Z_MODAL_DATA as any);
  private readonly viewContainerRef = inject(ViewContainerRef);

  protected readonly loading = signal(true);
  protected readonly salvando = signal(false);
  protected readonly removendo = signal(false);
  protected readonly evolucao = signal<iEvolucaoResponse | null>(null);
  protected readonly somenteLeitura = signal(this.data?.modo !== 'editar');

  protected readonly form = this.fb.group({
    conteudo: this.fb.control('', [Validators.required]),
    observacoes: this.fb.control(''),
  });

  ngOnInit(): void {
    this.carregarEvolucao();
  }

  protected carregarEvolucao(): void {
    this.loading.set(true);

    this.evolucaoService.buscarEvolucaoPorId(this.data.evolucaoId).subscribe({
      next: (evolucao) => {
        this.evolucao.set(evolucao);
        this.form.patchValue({
          conteudo: evolucao.conteudo ?? '',
          observacoes: evolucao.observacoes ?? '',
        });
        this.loading.set(false);
      },
      error: (err) => {
        const mensagem = err.error?.message ?? 'Não foi possível carregar a evolução.';
        this.loading.set(false);
        this.toastService.exibirToastErro('Erro ao carregar evolução', mensagem);
        this.dialogRef.close();
      },
    });
  }

  protected habilitarEdicao(): void {
    if (!this.data.canEdit) {
      return;
    }

    this.somenteLeitura.set(false);
  }

  protected cancelar(): void {
    this.dialogRef.close();
  }

  protected salvar(): void {
    if (this.somenteLeitura() || !this.data.canEdit) {
      return;
    }

    if (this.form.invalid || !this.evolucao()) {
      this.form.markAllAsTouched();
      return;
    }

    const evolucao = this.evolucao()!;
    const payload: iEvolucaoRequest = {
      agendamentoId: evolucao.agendamento.id,
      conteudo: this.form.controls.conteudo.value.trim(),
      observacoes: this.form.controls.observacoes.value.trim() || null,
    };

    this.salvando.set(true);

    this.evolucaoService.editarEvolucao(evolucao.id, payload).subscribe({
      next: (evolucaoAtualizada) => {
        this.salvando.set(false);
        this.evolucao.set(evolucaoAtualizada);
        this.form.patchValue({
          conteudo: evolucaoAtualizada.conteudo ?? '',
          observacoes: evolucaoAtualizada.observacoes ?? '',
        });
        this.somenteLeitura.set(true);
        this.toastService.exibirToastSucesso(
          'Evolução atualizada',
          'Alterações salvas com sucesso.',
        );
        this.data.onSaved?.(evolucaoAtualizada);
      },
      error: (err) => {
        const mensagem = err.error?.erros?.[0] ?? err.error?.message ?? 'Tente novamente.';
        this.salvando.set(false);
        this.toastService.exibirToastErro('Erro ao salvar evolução', mensagem);
      },
    });
  }

  protected confirmarRemocao(): void {
    const evolucao = this.evolucao();

    if (!evolucao || !this.data.canRemove || this.removendo()) {
      return;
    }

    this.dialogService.create({
      zTitle: 'Remover evolução',
      zDescription: `Paciente: ${evolucao.agendamento.paciente.nome}`,
      zContent:
        'Tem certeza que deseja remover esta evolução psicoterapêutica? A exclusão é lógica e o registro deixará de aparecer na listagem.',
      zViewContainerRef: this.viewContainerRef,
      zOkText: 'Remover',
      zCancelText: 'Cancelar',
      zOkDestructive: true,
      zOnOk: () => {
        this.remover();
      },
    });
  }

  private remover(): void {
    const evolucao = this.evolucao();

    if (!evolucao) {
      return;
    }

    this.removendo.set(true);

    this.evolucaoService.removerEvolucao(evolucao.id).subscribe({
      next: () => {
        this.removendo.set(false);
        this.toastService.exibirToastSucesso('Evolução removida', 'Registro removido com sucesso.');
        this.data.onDeleted?.(evolucao.id);
        this.dialogRef.close(true);
      },
      error: (err) => {
        const mensagem = err.error?.erros?.[0] ?? err.error?.message ?? 'Tente novamente.';
        this.removendo.set(false);
        this.toastService.exibirToastErro('Erro ao remover evolução', mensagem);
      },
    });
  }

  protected formatarDataHora(data?: string | null): string {
    if (!data) {
      return 'Não informado';
    }

    try {
      return format(parseISO(data), "dd/MM/yyyy 'às' HH:mm");
    } catch {
      return 'Não informado';
    }
  }

  protected getDataReferencia(evolucao: iEvolucaoResponse): string | null {
    return evolucao.dataAlteracao ?? evolucao.dataCriacao ?? null;
  }

  protected getLabelDataReferencia(evolucao: iEvolucaoResponse): string {
    return evolucao.dataAlteracao ? 'Última edição:' : 'Criada em:';
  }

  protected getLabelStatus(status: string): string {
    const labels: Record<string, string> = {
      CRIADO: 'Criado',
      CONFIRMADO: 'Confirmado',
      CANCELADO: 'Cancelado',
      CONCLUIDO: 'Concluído',
      REAGENDADO: 'Reagendado',
      NAO_COMPARECEU: 'Não compareceu',
    };

    return labels[status] ?? status;
  }

  protected getClasseStatus(status: string): string {
    const classes: Record<string, string> = {
      CRIADO: 'status-neutral',
      CONFIRMADO: 'status-success',
      CANCELADO: 'status-danger',
      CONCLUIDO: 'status-success',
      REAGENDADO: 'status-info',
      NAO_COMPARECEU: 'status-muted',
    };

    return classes[status] ?? 'status-neutral';
  }

  protected getClassePreenchimento(): string {
    const conteudo = this.evolucao()?.conteudo?.trim();
    return conteudo ? 'status-success' : 'status-warning';
  }
}
