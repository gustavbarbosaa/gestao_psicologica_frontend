import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AgendamentoService } from '@core/services/agendamento-service';
import { PagamentoService } from '@core/services/pagamento-service';
import { PacienteService } from '@core/services/paciente-service';
import { ZardButtonComponent } from '@shared/components/button/button.component';
import { ZardIconComponent } from '@shared/components/icon/icon.component';
import {
  iAgendamentoResponse,
  StatusAtendimento,
  StatusPagamento,
} from '@shared/models/agendamento.model';
import { iPacienteMaxResponse } from '@shared/models/paciente.model';
import { ToastService } from '@shared/services/toast-service';
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

type PeriodoFiltro = 'HOJE' | 'SEMANA' | 'MES' | 'TODOS';
type StatusPagamentoFiltro = StatusPagamento | 'TODOS';

@Component({
  selector: 'app-financeiro',
  imports: [CommonModule, ZardButtonComponent, ZardIconComponent],
  templateUrl: './financeiro.html',
  styleUrl: './financeiro.css',
})
export class Financeiro implements OnInit {
  private readonly agendamentoService = inject(AgendamentoService);
  private readonly pagamentoService = inject(PagamentoService);
  private readonly pacienteService = inject(PacienteService);
  private readonly toastService = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly atualizandoPagamentoId = signal<string | null>(null);
  protected readonly agendamentos = signal<iAgendamentoResponse[]>([]);
  protected readonly periodoFiltro = signal<PeriodoFiltro>('MES');
  protected readonly statusPagamentoFiltro = signal<StatusPagamentoFiltro>('TODOS');
  protected readonly buscaPaciente = signal('');

  protected readonly lancamentos = computed(() =>
    this.agendamentos()
      .filter((agendamento) => agendamento.statusAtendimento !== 'CANCELADO')
      .filter((agendamento) => this.filtrarPorPeriodo(agendamento))
      .filter((agendamento) => this.filtrarPorStatusPagamento(agendamento))
      .filter((agendamento) => this.filtrarPorPaciente(agendamento))
      .sort((a, b) => parseISO(b.dataHoraInicio).getTime() - parseISO(a.dataHoraInicio).getTime()),
  );

  protected readonly resumo = computed(() => {
    const lancamentos = this.lancamentos();
    const recebidos = lancamentos.filter((item) => item.statusPagamento === 'CONFIRMADO');
    const pendentes = lancamentos.filter((item) => item.statusPagamento === 'PENDENTE');
    const cobrancas = lancamentos.filter((item) => item.statusPagamento === 'COBRANCA_GERADA');

    return {
      previsto: this.somarValores(lancamentos),
      recebido: this.somarValores(recebidos),
      pendente: this.somarValores(pendentes),
      cobrancaGerada: this.somarValores(cobrancas),
      totalLancamentos: lancamentos.length,
    };
  });

  ngOnInit(): void {
    this.carregarAgendamentos();
  }

  protected carregarAgendamentos(): void {
    this.loading.set(true);

    this.agendamentoService.buscarAgendamentosPorUsuario().subscribe({
      next: (agendamentos) => {
        this.agendamentos.set(agendamentos);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toastService.exibirToastErro('Erro', 'Não foi possível carregar o financeiro.');
      },
    });
  }

  protected alterarPeriodo(event: Event): void {
    this.periodoFiltro.set((event.target as HTMLSelectElement).value as PeriodoFiltro);
  }

  protected alterarStatusFiltro(event: Event): void {
    this.statusPagamentoFiltro.set(
      (event.target as HTMLSelectElement).value as StatusPagamentoFiltro,
    );
  }

  protected alterarBuscaPaciente(event: Event): void {
    this.buscaPaciente.set((event.target as HTMLInputElement).value);
  }

  protected alterarStatusPagamento(
    agendamento: iAgendamentoResponse,
    status: StatusPagamento,
  ): void {
    if (this.isAcaoPagamentoDesabilitada(agendamento, status)) {
      return;
    }

    if (agendamento.statusPagamento === status) {
      return;
    }

    this.atualizandoPagamentoId.set(agendamento.id);

    this.pagamentoService.alterarStatusPagamento(agendamento.id, status).subscribe({
      next: (agendamentoAtualizado) => {
        this.agendamentos.update((agendamentos) =>
          agendamentos.map((item) =>
            item.id === agendamentoAtualizado.id ? agendamentoAtualizado : item,
          ),
        );
        this.atualizandoPagamentoId.set(null);
        this.toastService.exibirToastSucesso(
          'Pagamento atualizado',
          `Status alterado para ${this.getLabelStatus(status)}.`,
        );
      },
      error: (err) => {
        const mensagem = err.error?.erros?.[0] ?? err.error?.message ?? 'Tente novamente.';
        this.atualizandoPagamentoId.set(null);
        this.toastService.exibirToastErro('Erro ao atualizar pagamento', mensagem);
      },
    });
  }

  protected gerarCobranca(agendamento: iAgendamentoResponse): void {
    if (this.isAcaoPagamentoDesabilitada(agendamento, 'COBRANCA_GERADA')) {
      return;
    }

    const abaWhatsapp = window.open('', '_blank');
    this.atualizandoPagamentoId.set(agendamento.id);

    this.pacienteService.buscarPacientePorIdDetalhado(agendamento.paciente.id).subscribe({
      next: (paciente) => {
        const urlWhatsapp = this.criarUrlMensagemCobranca(agendamento, paciente);

        if (!urlWhatsapp) {
          abaWhatsapp?.close();
          this.atualizandoPagamentoId.set(null);
          return;
        }

        this.pagamentoService.alterarStatusPagamento(agendamento.id, 'COBRANCA_GERADA').subscribe({
          next: (agendamentoAtualizado) => {
            this.agendamentos.update((agendamentos) =>
              agendamentos.map((item) =>
                item.id === agendamentoAtualizado.id ? agendamentoAtualizado : item,
              ),
            );
            this.atualizandoPagamentoId.set(null);
            this.toastService.exibirToastSucesso(
              'Cobrança gerada',
              'A mensagem de cobrança foi preparada para envio.',
            );

            if (abaWhatsapp) {
              abaWhatsapp.location.href = urlWhatsapp;
            } else {
              window.open(urlWhatsapp, '_blank');
            }
          },
          error: (err) => {
            const mensagem = err.error?.erros?.[0] ?? err.error?.message ?? 'Tente novamente.';
            abaWhatsapp?.close();
            this.atualizandoPagamentoId.set(null);
            this.toastService.exibirToastErro('Erro ao gerar cobrança', mensagem);
          },
        });
      },
      error: () => {
        abaWhatsapp?.close();
        this.atualizandoPagamentoId.set(null);
        this.toastService.exibirToastErro(
          'Paciente não encontrado',
          'Não foi possível carregar os dados do paciente para enviar a mensagem.',
        );
      },
    });
  }

  protected formatarData(data: string): string {
    return format(parseISO(data), 'dd/MM/yyyy');
  }

  protected formatarHora(data: string): string {
    return format(parseISO(data), 'HH:mm');
  }

  protected formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  }

  protected valorAgendamento(agendamento: iAgendamentoResponse): number {
    return Number(agendamento.tipoAtendimento?.valorPadraoTipoAtendimento ?? 0);
  }

  protected getIniciais(nomePaciente: string): string {
    if (!nomePaciente) return '';

    const partes = nomePaciente.trim().split(/\s+/);

    if (partes.length === 1) {
      return partes[0].substring(0, 2).toUpperCase();
    }

    return (partes[0][0] + partes[1][0]).toUpperCase();
  }

  protected getLabelStatus(status: StatusAtendimento | StatusPagamento): string {
    const labels: Record<string, string> = {
      CRIADO: 'Criado',
      CONFIRMADO: 'Confirmado',
      CANCELADO: 'Cancelado',
      CONCLUIDO: 'Concluído',
      REAGENDADO: 'Reagendado',
      NAO_COMPARECEU: 'Não compareceu',
      PENDENTE: 'Pendente',
      COBRANCA_GERADA: 'Cobrança gerada',
    };

    return labels[status] ?? status;
  }

  public isAcaoPagamentoDesabilitada(
    agendamento: iAgendamentoResponse,
    statusAcao: StatusPagamento,
  ): boolean {
    if (this.atualizandoPagamentoId() === agendamento.id) {
      return true;
    }

    if (agendamento.statusPagamento === 'CONFIRMADO') {
      return true;
    }

    if (agendamento.statusPagamento === statusAcao) {
      return true;
    }

    if (statusAcao === 'COBRANCA_GERADA') {
      return !this.podeGerarCobranca(agendamento);
    }

    return statusAcao === 'PENDENTE' && agendamento.statusPagamento === 'COBRANCA_GERADA';
  }

  protected podeGerarCobranca(agendamento: iAgendamentoResponse): boolean {
    return (
      agendamento.statusAtendimento === 'NAO_COMPARECEU' &&
      agendamento.statusPagamento === 'PENDENTE'
    );
  }

  protected getClasseStatus(status: StatusAtendimento | StatusPagamento): string {
    const classes: Record<string, string> = {
      CRIADO: 'status-neutral',
      CONFIRMADO: 'status-success',
      CANCELADO: 'status-danger',
      CONCLUIDO: 'status-success',
      REAGENDADO: 'status-info',
      NAO_COMPARECEU: 'status-muted',
      PENDENTE: 'status-warning',
      COBRANCA_GERADA: 'status-info',
    };

    return classes[status] ?? 'status-neutral';
  }

  private filtrarPorPeriodo(agendamento: iAgendamentoResponse): boolean {
    if (this.periodoFiltro() === 'TODOS') {
      return true;
    }

    const data = parseISO(agendamento.dataHoraInicio);
    const hoje = new Date();

    const intervalos: Record<Exclude<PeriodoFiltro, 'TODOS'>, { start: Date; end: Date }> = {
      HOJE: { start: startOfDay(hoje), end: endOfDay(hoje) },
      SEMANA: {
        start: startOfWeek(hoje, { weekStartsOn: 1 }),
        end: endOfWeek(hoje, { weekStartsOn: 1 }),
      },
      MES: { start: startOfMonth(hoje), end: endOfMonth(hoje) },
    };

    return isWithinInterval(
      data,
      intervalos[this.periodoFiltro() as Exclude<PeriodoFiltro, 'TODOS'>],
    );
  }

  private filtrarPorStatusPagamento(agendamento: iAgendamentoResponse): boolean {
    return (
      this.statusPagamentoFiltro() === 'TODOS' ||
      agendamento.statusPagamento === this.statusPagamentoFiltro()
    );
  }

  private filtrarPorPaciente(agendamento: iAgendamentoResponse): boolean {
    const busca = this.buscaPaciente().trim().toLowerCase();

    if (!busca) {
      return true;
    }

    return agendamento.paciente.nome.toLowerCase().includes(busca);
  }

  private somarValores(agendamentos: iAgendamentoResponse[]): number {
    return agendamentos.reduce((total, item) => total + this.valorAgendamento(item), 0);
  }

  private criarUrlMensagemCobranca(
    agendamento: iAgendamentoResponse,
    paciente: iPacienteMaxResponse,
  ): string | null {
    const telefone = this.formatarTelefoneParaWhatsapp(paciente.telefone);
    const dataHoraInicio = parseISO(agendamento.dataHoraInicio);
    const valorAtendimento = this.valorAgendamento(agendamento);

    if (!telefone) {
      this.toastService.exibirToastErro(
        'Telefone não informado',
        'Cadastre o telefone do paciente para enviar a mensagem.',
      );
      return null;
    }

    if (Number.isNaN(dataHoraInicio.getTime())) {
      this.toastService.exibirToastErro(
        'Data inválida',
        'Não foi possível identificar a data do atendimento.',
      );
      return null;
    }

    if (!valorAtendimento) {
      this.toastService.exibirToastErro(
        'Valor não informado',
        'Cadastre o valor padrão do tipo de atendimento.',
      );
      return null;
    }

    const mensagem = this.criarMensagemCobranca(paciente.nome, dataHoraInicio, valorAtendimento);

    return `https://web.whatsapp.com/send?phone=${telefone}&text=${encodeURIComponent(mensagem)}`;
  }

  private formatarTelefoneParaWhatsapp(telefone?: string): string | null {
    const apenasNumeros = telefone?.replaceAll(/\D/g, '');

    if (!apenasNumeros) {
      return null;
    }

    return apenasNumeros.startsWith('55') ? apenasNumeros : `55${apenasNumeros}`;
  }

  private criarMensagemCobranca(
    nomePaciente: string,
    dataHoraInicio: Date,
    valorAtendimento: number,
  ): string {
    const data = new Intl.DateTimeFormat('pt-BR').format(dataHoraInicio);
    const hora = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(dataHoraInicio);
    const valor = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valorAtendimento);

    return `Olá, ${nomePaciente}. Foi gerada uma cobrança no valor de ${valor}, referente ao atendimento do dia ${data} as ${hora} horas.`;
  }
}
