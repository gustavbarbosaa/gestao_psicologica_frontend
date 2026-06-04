import { CommonModule, NgClass } from '@angular/common';
import { Component, computed, inject, OnInit, signal, ViewContainerRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EvolucaoService } from '@core/services/evolucao-service';
import { LoginService } from '@core/services/login-service';
import { DetalheEvolucao } from '@features/evolucoes/components/detalhe-evolucao/detalhe-evolucao';
import { ZardButtonComponent } from '@shared/components/button/button.component';
import { ZardDialogService } from '@shared/components/dialog/dialog.service';
import { ZardIconComponent } from '@shared/components/icon';
import { ZardInputDirective } from '@shared/components/input/input.directive';
import { iEvolucaoResponse } from '@shared/models/evolucao.model';
import { ToastService } from '@shared/services/toast-service';
import { format, parseISO } from 'date-fns';

type FiltroPreenchimento = 'TODOS' | 'PENDENTE' | 'PREENCHIDA';

@Component({
  selector: 'app-evolucoes',
  imports: [CommonModule, NgClass, ZardButtonComponent, ZardIconComponent, ZardInputDirective],
  templateUrl: './evolucoes.html',
  styleUrl: './evolucoes.css',
})
export class Evolucoes implements OnInit {
  private readonly evolucaoService = inject(EvolucaoService);
  private readonly loginService = inject(LoginService);
  private readonly toastService = inject(ToastService);
  private readonly dialogService = inject(ZardDialogService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly removendoId = signal<string | null>(null);
  protected readonly evolucoes = signal<iEvolucaoResponse[]>([]);
  protected readonly busca = signal('');
  protected readonly filtroPreenchimento = signal<FiltroPreenchimento>('TODOS');
  protected readonly pacienteIdSelecionado = signal<string | null>(null);
  protected readonly pacienteNomeSelecionado = signal<string | null>(null);

  protected readonly podeVisualizar = computed(() =>
    this.loginService.hasAuthority('EVOLUCAO_VISUALIZAR'),
  );
  protected readonly podeEditar = computed(() => this.loginService.hasAuthority('EVOLUCAO_EDITAR'));
  protected readonly podeRemover = computed(() => this.loginService.hasAuthority('EVOLUCAO_REMOVER'));

  protected readonly evolucoesFiltradas = computed(() =>
    this.evolucoes()
      .filter((evolucao) => this.filtrarBusca(evolucao))
      .filter((evolucao) => this.filtrarPreenchimento(evolucao))
      .sort(
        (a, b) =>
          parseISO(b.agendamento.dataHoraInicio).getTime() -
          parseISO(a.agendamento.dataHoraInicio).getTime(),
      ),
  );
  protected readonly totalPreenchidas = computed(
    () => this.evolucoesFiltradas().filter((item) => !!item.conteudo?.trim()).length,
  );
  protected readonly totalPendentes = computed(
    () => this.evolucoesFiltradas().filter((item) => !item.conteudo?.trim()).length,
  );

  ngOnInit(): void {
    if (!this.podeVisualizar()) {
      this.loading.set(false);
      return;
    }

    this.route.queryParamMap.subscribe((params) => {
      const pacienteId = params.get('pacienteId');
      const pacienteNome = params.get('pacienteNome');

      this.pacienteIdSelecionado.set(pacienteId);
      this.pacienteNomeSelecionado.set(pacienteNome);
      this.carregarEvolucoes();
    });
  }

  protected carregarEvolucoes(): void {
    this.loading.set(true);

    const request$ = this.pacienteIdSelecionado()
      ? this.evolucaoService.listarEvolucoesPorPaciente(this.pacienteIdSelecionado()!)
      : this.evolucaoService.listarEvolucoes();

    request$.subscribe({
      next: (evolucoes) => {
        this.evolucoes.set(evolucoes);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toastService.exibirToastErro('Erro', 'Não foi possível carregar as evoluções.');
      },
    });
  }

  protected limparFiltroPaciente(): void {
    this.router.navigate(['/evolucoes']);
  }

  protected abrirVisualizacao(evolucao: iEvolucaoResponse): void {
    if (!this.podeVisualizar()) {
      return;
    }

    this.dialogService.create({
      zContent: DetalheEvolucao,
      zTitle: 'Visualizar evolução',
      zDescription: 'Registro vinculado ao agendamento selecionado.',
      zHideFooter: true,
      zViewContainerRef: this.viewContainerRef,
      zWidth: 'min(960px, calc(100vw - 2rem))',
      zData: {
        evolucaoId: evolucao.id,
        modo: 'visualizar',
        canEdit: this.podeEditar(),
        canRemove: this.podeRemover(),
        onSaved: (evolucaoAtualizada: iEvolucaoResponse) => this.atualizarEvolucaoNaLista(evolucaoAtualizada),
        onDeleted: (evolucaoId: string) => this.removerDaLista(evolucaoId),
      },
    });
  }

  protected abrirEdicao(evolucao: iEvolucaoResponse): void {
    if (!this.podeEditar()) {
      return;
    }

    this.dialogService.create({
      zContent: DetalheEvolucao,
      zTitle: 'Editar evolução',
      zDescription: 'Edite apenas conteúdo e observações.',
      zHideFooter: true,
      zViewContainerRef: this.viewContainerRef,
      zWidth: 'min(960px, calc(100vw - 2rem))',
      zData: {
        evolucaoId: evolucao.id,
        modo: 'editar',
        canEdit: this.podeEditar(),
        canRemove: this.podeRemover(),
        onSaved: (evolucaoAtualizada: iEvolucaoResponse) => this.atualizarEvolucaoNaLista(evolucaoAtualizada),
        onDeleted: (evolucaoId: string) => this.removerDaLista(evolucaoId),
      },
    });
  }

  protected confirmarRemocao(evolucao: iEvolucaoResponse): void {
    if (!this.podeRemover() || this.removendoId() === evolucao.id) {
      return;
    }

    this.dialogService.create({
      zTitle: 'Confirmar remoção',
      zDescription: `Paciente: ${evolucao.agendamento.paciente.nome}`,
      zContent:
        'A evolução será removida logicamente e deixará de aparecer nas listagens. Deseja continuar?',
      zViewContainerRef: this.viewContainerRef,
      zOkText: 'Remover',
      zCancelText: 'Cancelar',
      zOkDestructive: true,
      zOnOk: () => {
        this.removerEvolucao(evolucao.id);
      },
    });
  }

  private removerEvolucao(evolucaoId: string): void {
    this.removendoId.set(evolucaoId);

    this.evolucaoService.removerEvolucao(evolucaoId).subscribe({
      next: () => {
        this.removendoId.set(null);
        this.removerDaLista(evolucaoId);
        this.toastService.exibirToastSucesso('Evolução removida', 'Registro removido com sucesso.');
      },
      error: (err) => {
        const mensagem = err.error?.erros?.[0] ?? err.error?.message ?? 'Tente novamente.';
        this.removendoId.set(null);
        this.toastService.exibirToastErro('Erro ao remover evolução', mensagem);
      },
    });
  }

  private atualizarEvolucaoNaLista(evolucaoAtualizada: iEvolucaoResponse): void {
    this.evolucoes.update((evolucoes) =>
      evolucoes.map((item) => (item.id === evolucaoAtualizada.id ? evolucaoAtualizada : item)),
    );
  }

  private removerDaLista(evolucaoId: string): void {
    this.evolucoes.update((evolucoes) => evolucoes.filter((item) => item.id !== evolucaoId));
  }

  protected atualizarBusca(event: Event): void {
    this.busca.set((event.target as HTMLInputElement).value);
  }

  protected alterarFiltroPreenchimento(event: Event): void {
    this.filtroPreenchimento.set((event.target as HTMLSelectElement).value as FiltroPreenchimento);
  }

  protected formatarData(data: string): string {
    return format(parseISO(data), 'dd/MM/yyyy');
  }

  protected formatarHora(data: string): string {
    return format(parseISO(data), 'HH:mm');
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

  protected getClassePreenchimento(evolucao: iEvolucaoResponse): string {
    return this.estaPreenchida(evolucao) ? 'status-success' : 'status-warning';
  }

  protected getLabelPreenchimento(evolucao: iEvolucaoResponse): string {
    return this.estaPreenchida(evolucao) ? 'Preenchida' : 'Pendente de preenchimento';
  }

  protected resumoConteudo(evolucao: iEvolucaoResponse): string {
    const conteudo = evolucao.conteudo?.trim();

    if (!conteudo) {
      return 'Evolução ainda não preenchida.';
    }

    return conteudo.length > 120 ? `${conteudo.slice(0, 117)}...` : conteudo;
  }

  protected getIniciais(nome: string): string {
    return nome
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase();
  }

  private estaPreenchida(evolucao: iEvolucaoResponse): boolean {
    return !!evolucao.conteudo?.trim();
  }

  private filtrarBusca(evolucao: iEvolucaoResponse): boolean {
    const termo = this.busca().trim().toLowerCase();

    if (!termo) {
      return true;
    }

    return [
      evolucao.agendamento.paciente.nome,
      evolucao.agendamento.tipoAtendimento.nome,
      evolucao.conteudo ?? '',
      evolucao.observacoes ?? '',
    ].some((valor) => valor.toLowerCase().includes(termo));
  }

  private filtrarPreenchimento(evolucao: iEvolucaoResponse): boolean {
    switch (this.filtroPreenchimento()) {
      case 'PENDENTE':
        return !this.estaPreenchida(evolucao);
      case 'PREENCHIDA':
        return this.estaPreenchida(evolucao);
      default:
        return true;
    }
  }
}
