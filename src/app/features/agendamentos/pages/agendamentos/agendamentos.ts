import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  signal,
  ViewChild,
  OnDestroy,
  AfterViewInit,
} from '@angular/core';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventContentArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg, EventResizeDoneArg } from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { ZardDialogService } from '@shared/components/dialog/dialog.service';
import { CriaAgendamentoForm } from '@features/agendamentos/components/cria-agendamento-form/cria-agendamento-form';
import {
  iAgendamentoRequest,
  iAgendamentoResponse,
  StatusAtendimento,
  StatusPagamento,
} from '@shared/models/agendamento.model';
import { AgendamentoService } from '@core/services/agendamento-service';
import { ToastService } from '@shared/services/toast-service';
import { catchError, Observable, Subject, takeUntil, tap, throwError } from 'rxjs';
import { TipoAtendimentoService } from '@core/services/tipo-atendimento';
import { EditarAgendamentoForm } from '@features/agendamentos/components/editar-agendamento/editar-agendamento-form';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { PagamentoService } from '@core/services/pagamento-service';

@Component({
  selector: 'app-agendamentos',
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './agendamentos.html',
  styleUrl: './agendamentos.css',
})
export class Agendamentos implements OnInit, OnDestroy, AfterViewInit {
  private readonly dialogService = inject(ZardDialogService);
  private readonly agendamentoService = inject(AgendamentoService);
  private readonly pagamentoService = inject(PagamentoService);
  private readonly toastService = inject(ToastService);
  private readonly tipoAtendimentoService = inject(TipoAtendimentoService);
  private readonly DURACAO_PADRAO_EM_MINUTOS = 60;

  protected calendarOptions!: CalendarOptions;
  protected eventosCalendario = signal<any[]>([]);

  private readonly destroy$ = new Subject<void>();

  legendasStatus = [
    { label: 'Pendente', status: 'PENDENTE' },
    { label: 'Confirmado', status: 'CONFIRMADO' },
    { label: 'Cobrança Gerada', status: 'COBRANCA_GERADA' },
    { label: 'Outros', status: 'DEFAULT' },
  ];

  legendasAtendimento: { label: string; status: StatusAtendimento }[] = [
    { label: 'Criado', status: 'CRIADO' },
    { label: 'Confirmado', status: 'CONFIRMADO' },
    { label: 'Concluído', status: 'CONCLUIDO' },
    { label: 'Cancelado', status: 'CANCELADO' },
    { label: 'Não compareceu', status: 'NAO_COMPARECEU' },
  ];

  legendasPagamento: { label: string; status: StatusPagamento }[] = [
    { label: 'Pendente', status: 'PENDENTE' },
    { label: 'Pago', status: 'CONFIRMADO' },
    { label: 'Cobrança gerada', status: 'COBRANCA_GERADA' },
  ];

  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;

  ngOnInit(): void {
    this.calendarOptions = this.iniciarCalendario();

    this.agendamentoService.agendamentoCriado$
      .pipe(takeUntil(this.destroy$))
      .subscribe((novoAgendamento) => {
        this.adicionarEventoUnicoNoCalendario(novoAgendamento);
      });
  }

  ngAfterViewInit(): void {
    this.carregarAgendamentosIniciais();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private iniciarCalendario(): CalendarOptions {
    return {
      initialView: 'timeGridWeek',
      plugins: [dayGridPlugin, interactionPlugin, timeGridPlugin],
      weekends: false,
      locale: ptBrLocale,
      locales: [ptBrLocale],
      editable: true,
      eventDurationEditable: true,
      eventDrop: (arg) => this.handleEventResizeOrDrop(arg),
      eventResize: (arg) => this.handleEventResizeOrDrop(arg),
      dateClick: (arg: DateClickArg) => this.handleDateClick(arg),
      eventDisplay: 'block',
      eventClassNames: function (arg) {
        const status = arg.event.extendedProps['agendamento'].statusAtendimento;

        return ['status-' + status.toLowerCase()];
      },
      eventContent: (arg) => this.criaCardEventoAgendamento(arg),
      eventClick: (arg: EventClickArg) => this.handleEventClick(arg),
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay',
      },
      slotLabelFormat: {
        hour: '2-digit',
        minute: '2-digit',
        omitZeroMinute: false,
        meridiem: false,
      },
      eventTimeFormat: {
        hour: '2-digit',
        minute: '2-digit',
        meridiem: false,
      },
    };
  }

  handleEventResizeOrDrop(arg: EventResizeDoneArg | EventClickArg): void {
    const agendamento: any = (arg.event.extendedProps as any)?.agendamento;

    const dataHoraInicio = arg.event.start ? format(arg.event.start, "yyyy-MM-dd'T'HH:mm:ss") : '';
    const dataHoraFim = arg.event.end ? format(arg.event.end, "yyyy-MM-dd'T'HH:mm:ss") : '';

    const agendamentoRequest: iAgendamentoRequest = {
      dataHoraInicio: dataHoraInicio,
      duracaoEmMinutos: this.calculaDuracaoEmMinutos(dataHoraInicio, dataHoraFim),
      usuarioId: agendamento.usuario?.id || '',
      pacienteId: agendamento.paciente?.id || '',
      tipoAtendimentoId: agendamento.tipoAtendimento?.id || '',
    };

    this.agendamentoService.editarAgendamento(arg.event.id, agendamentoRequest).subscribe({
      next: (response) => {
        this.toastService.exibirToastSucesso(
          'Agendamento atualizado',
          `Agendamento para ${response.paciente.nome} atualizado.`,
        );
      },
      error: (err) => {
        const mensagem = err.error?.erros?.[0] ?? err.error?.message ?? 'Erro inesperado';

        this.toastService.exibirToastErro(
          'Erro',
          'Não foi possível atualizar o agendamento: ' + mensagem,
        );
        console.error('Erro ao editar agendamento', err);
      },
    });
  }

  carregarAgendamentosIniciais(): void {
    this.agendamentoService.buscarAgendamentosPorUsuario().subscribe({
      next: (agendamentos) => {
        const eventosFormatados = agendamentos.map((agendamento) => ({
          id: agendamento.id,
          title: agendamento.paciente.nome,
          start: agendamento.dataHoraInicio,
          end: agendamento.dataHoraFim,
          color: this.getCorAtendimentoPorStatus(agendamento.statusAtendimento),
          extendedProps: { agendamento },
        }));

        const api = this.calendarComponent.getApi();
        api.removeAllEvents();
        api.addEventSource(eventosFormatados);
      },
      error: () => {
        this.toastService.exibirToastErro('Erro', 'Erro ao carregar agendamentos.');
      },
    });
  }

  private adicionarEventoUnicoNoCalendario(agendamento: any): void {
    const eventoFormatado = {
      id: agendamento.id,
      title: agendamento.paciente.nome,
      start: agendamento.dataHoraInicio,
      end: agendamento.dataHoraFim,
      color: this.getCorAtendimentoPorStatus(agendamento.statusAtendimento),
      extendedProps: { agendamento },
    };

    this.calendarComponent.getApi().addEvent(eventoFormatado);
  }

  handleDateClick(arg: DateClickArg): void {
    this.abrirModal(arg);
  }

  private adicionarEventoNoCalendario(agendamento: any): void {
    const eventoFormatado = {
      id: agendamento.id,
      title: agendamento.paciente.nome,
      start: agendamento.dataHoraInicio,
      end: agendamento.dataHoraFim,
      color: this.getCorAtendimentoPorStatus(agendamento.statusAtendimento),
      statusPagamento: agendamento.statusPagamento,
      extendedProps: { agendamento },
    };

    this.calendarComponent.getApi().addEvent(eventoFormatado);
  }

  carregarAgendamentos(): void {
    this.agendamentoService.buscarAgendamentosPorUsuario().subscribe({
      next: (agendamentos) => {
        this.adicionarEventoNoCalendario(agendamentos);
      },
      error: () => {
        this.toastService.exibirToastErro(
          'Erro ao carregar agendamentos',
          'Tente novamente mais tarde.',
        );
      },
    });
  }

  abrirModal(arg: DateClickArg): void {
    this.dialogService.create({
      zTitle: 'Cadastrar Agendamento',
      zDescription: `Preencha o formulário abaixo para criar um novo agendamento.`,
      zContent: CriaAgendamentoForm,
      zData: {
        dataHoraInicio: arg.date,
        duracaoEmMinutos: this.DURACAO_PADRAO_EM_MINUTOS,
        pacienteId: '',
        usuarioId: '',
      },
      zOkIcon: 'check',
      zCancelIcon: 'x',
      zOkText: 'Salvar',
      zCancelText: 'Cancelar',
      zOnOk: (instance) => {
        const form = instance.form;

        if (form.valid) {
          const payload = form.getRawValue() as iAgendamentoRequest;
          this.criarAgendamento(payload);
        } else {
          this.toastService.exibirToastErro(
            'Formulário inválido',
            'Por favor, preencha todos os campos corretamente.',
          );
        }
      },
    });
  }

  abrirModalEdicao(arg: DateClickArg): void {
    this.dialogService.create({
      zTitle: 'Editar Agendamento',
      zDescription: `Preencha o formulário abaixo para editar o agendamento.`,
      zContent: EditarAgendamentoForm,
      zData: {
        dataHoraInicio: arg.date,
        duracaoEmMinutos: this.DURACAO_PADRAO_EM_MINUTOS,
        pacienteId: '',
        usuarioId: '',
      },
      zOkIcon: 'check',
      zCancelIcon: 'x',
      zOkText: 'Salvar',
      zCancelText: 'Cancelar',
      zOnOk: (instance) => {
        const form = instance.form;

        if (form.valid) {
          const payload = form.getRawValue() as iAgendamentoRequest;
          this.criarAgendamento(payload);
        } else {
          this.toastService.exibirToastErro(
            'Formulário inválido',
            'Por favor, preencha todos os campos corretamente.',
          );
        }
      },
    });
  }

  handleEventClick(arg: EventClickArg): void {
    const event = arg.event;

    const agendamento = (event.extendedProps as any)?.agendamento;

    if (!agendamento) {
      const agendamentoId = event.id;
      this.agendamentoService.buscarAgendamentosPorUsuario().subscribe({
        next: (agendamentos) => {
          const found = agendamentos.find((a) => a.id === agendamentoId);
          if (found) {
            this.abrirModalEdicaoComAgendamento(found);
          } else {
            this.toastService.exibirToastErro('Erro', 'Dados do agendamento não encontrados.');
          }
        },
        error: () => {
          this.toastService.exibirToastErro(
            'Erro',
            'Não foi possível carregar dados do agendamento.',
          );
        },
      });
      return;
    }

    this.abrirModalEdicaoComAgendamento(agendamento);
  }

  private abrirModalEdicaoComAgendamento(agendamento: any): void {
    this.dialogService.create({
      zTitle: 'Editar Agendamento',
      zDescription: `Preencha o formulário abaixo para editar o agendamento.`,
      zContent: EditarAgendamentoForm,
      zData: {
        dataHoraInicio: agendamento.dataHoraInicio,
        duracaoEmMinutos: this.calculaDuracaoEmMinutos(
          agendamento.dataHoraInicio,
          agendamento.dataHoraFim,
        ),
        pacienteId: agendamento.paciente?.id || '',
        usuarioId: agendamento.usuario?.id || '',
        tipoAtendimentoId: agendamento.tipoAtendimento?.id || '',
        agendamento,
        onChangeStatusAtendimento: (status: StatusAtendimento) => {
          return this.alterarStatusAtendimento(agendamento.id, status);
        },
        onConfirmarPagamento: () => {
          this.alterarStatusPagamento(agendamento.id, 'CONFIRMADO');
        },
        onGerarCobranca: () => {
          return this.gerarCobrancaPagamento(agendamento.id);
        },
      },
      zOkIcon: 'check',
      zCancelIcon: 'x',
      zOkText: 'Salvar',
      zCancelText: 'Cancelar',
      zOnOk: (instance) => {
        const form = instance.form;

        if (form.valid) {
          const payload = form.getRawValue() as iAgendamentoRequest;
          this.agendamentoService.editarAgendamento(agendamento.id, payload).subscribe({
            next: (updated) => {
              this.toastService.exibirToastSucesso(
                'Agendamento atualizado',
                `Agendamento para ${updated.paciente.nome} atualizado.`,
              );

              const applyUpdated = (ag: any) => {
                const api = this.calendarComponent.getApi();
                const existing = api.getEventById(ag.id);

                const eventoFormatado = {
                  id: ag.id,
                  title: ag.paciente.nome,
                  start: ag.dataHoraInicio,
                  end: ag.dataHoraFim,
                  color: this.getCorAtendimentoPorStatus(ag.statusAtendimento),
                  extendedProps: { agendamento: ag },
                };

                if (existing) {
                  existing.remove();
                }

                api.addEvent(eventoFormatado);
              };

              if (!updated.tipoAtendimento && (updated as any).tipoAtendimentoId) {
                this.tipoAtendimentoService
                  .buscarTipoAtendimentoPorId((updated as any).tipoAtendimentoId)
                  .subscribe({
                    next: (tipo) => {
                      (updated as any).tipoAtendimento = tipo;
                      applyUpdated(updated);
                    },
                    error: () => {
                      applyUpdated(updated);
                    },
                  });
              } else {
                applyUpdated(updated);
              }
            },
            error: (err) => {
              this.toastService.exibirToastErro(
                'Erro',
                'Não foi possível atualizar o agendamento.',
              );
              console.error('Erro ao editar agendamento', err);
            },
          });
        } else {
          this.toastService.exibirToastErro(
            'Formulário inválido',
            'Por favor, preencha todos os campos corretamente.',
          );
        }
      },
    });
  }

  private criarAgendamento(payload: iAgendamentoRequest): void {
    this.agendamentoService.criarAgendamento(payload).subscribe({
      next: (agendamento) => {
        this.toastService.exibirToastSucesso(
          'Agendamento criado com sucesso!',
          `Agendamento para ${agendamento.paciente.nome} criado.`,
        );
      },
      error: (err) => {
        this.toastService.exibirToastErro('Erro ao criar agendamento', err.error.erros[0]);
        console.error('Erro ao criar agendamento', err);
      },
    });
  }

  private alterarStatusAtendimento(
    agendamentoId: string,
    status: StatusAtendimento,
  ): Observable<iAgendamentoResponse> {
    return this.agendamentoService.alterarStatusAtendimento(agendamentoId, status).pipe(
      tap((agendamento) => {
        this.toastService.exibirToastSucesso(
          'Status atualizado',
          `Atendimento marcado como ${this.getLabelStatus(status)}.`,
        );
        this.atualizarEventoNoCalendario(agendamento);
      }),
      catchError((err) => {
        const mensagem = err.error?.erros?.[0] ?? err.error?.message ?? 'Tente novamente.';
        this.toastService.exibirToastErro('Erro ao atualizar status', mensagem);
        return throwError(() => err);
      }),
    );
  }

  private alterarStatusPagamento(agendamentoId: string, status: StatusPagamento): void {
    this.pagamentoService.alterarStatusPagamento(agendamentoId, status).subscribe({
      next: (agendamento) => {
        this.toastService.exibirToastSucesso(
          'Pagamento atualizado',
          `Pagamento marcado como ${this.getLabelStatus(status)}.`,
        );
        this.atualizarEventoNoCalendario(agendamento);
      },
      error: (err) => {
        const mensagem = err.error?.erros?.[0] ?? err.error?.message ?? 'Tente novamente.';
        this.toastService.exibirToastErro('Erro ao atualizar pagamento', mensagem);
      },
    });
  }

  private gerarCobrancaPagamento(agendamentoId: string): Observable<iAgendamentoResponse> {
    return this.pagamentoService.alterarStatusPagamento(agendamentoId, 'COBRANCA_GERADA').pipe(
      tap((agendamento) => {
        this.toastService.exibirToastSucesso(
          'Pagamento atualizado',
          `Pagamento marcado como ${this.getLabelStatus('COBRANCA_GERADA')}.`,
        );
        this.atualizarEventoNoCalendario(agendamento);
      }),
      catchError((err) => {
        const mensagem = err.error?.erros?.[0] ?? err.error?.message ?? 'Tente novamente.';
        this.toastService.exibirToastErro('Erro ao atualizar pagamento', mensagem);
        return throwError(() => err);
      }),
    );
  }

  private atualizarEventoNoCalendario(agendamento: iAgendamentoResponse): void {
    const api = this.calendarComponent.getApi();
    const existing = api.getEventById(agendamento.id);

    if (existing) {
      existing.remove();
    }

    api.addEvent({
      id: agendamento.id,
      title: agendamento.paciente.nome,
      start: agendamento.dataHoraInicio,
      end: agendamento.dataHoraFim,
      color: this.getCorAtendimentoPorStatus(agendamento.statusAtendimento),
      extendedProps: { agendamento },
    });
  }

  getCorAtendimentoPorStatus(statusAtendimento: string): string {
    switch (statusAtendimento) {
      case 'CRIADO':
        return '#64748B';
      case 'CONFIRMADO':
        return '#0F766E';
      case 'CONCLUIDO':
        return '#059669';
      case 'CANCELADO':
        return '#DC2626';
      case 'REAGENDADO':
        return '#2563EB';
      case 'NAO_COMPARECEU':
        return '#71717A';
      default:
        return '#94A3B8';
    }
  }

  getCorPagamentoPorStatus(statusPagamento: string): string {
    switch (statusPagamento) {
      case 'PENDENTE':
        return '#D97706';
      case 'CONFIRMADO':
        return '#059669';
      case 'COBRANCA_GERADA':
        return '#2563EB';
      default:
        return '#94A3B8';
    }
  }

  getLabelStatus(status: string): string {
    const labels: Record<string, string> = {
      CRIADO: 'criado',
      CONFIRMADO: 'confirmado',
      CANCELADO: 'cancelado',
      CONCLUIDO: 'concluído',
      REAGENDADO: 'reagendado',
      NAO_COMPARECEU: 'não compareceu',
      PENDENTE: 'pendente',
      COBRANCA_GERADA: 'cobrança gerada',
    };

    return labels[status] ?? status.toLowerCase();
  }

  private calculaDuracaoEmMinutos(dataHoraInicio: string, dataHoraFim: string): number {
    const inicio = parseISO(dataHoraInicio);
    const fim = parseISO(dataHoraFim);

    return differenceInMinutes(fim, inicio);
  }

  private criaCardEventoAgendamento(arg: EventContentArg) {
    const agendamento = arg.event.extendedProps['agendamento'];
    const corAtendimento = this.getCorAtendimentoPorStatus(agendamento.statusAtendimento);
    const deveMostrarPagamento = agendamento.statusAtendimento !== 'CANCELADO';

    const iconPagamento =
      agendamento.statusPagamento === 'CONFIRMADO'
        ? 'fa-check'
        : agendamento.statusPagamento === 'COBRANCA_GERADA'
          ? 'fa-dollar-sign'
          : 'fa-clock';

    const iconTipo = agendamento.tipoAtendimento?.nome === 'ONLINE' ? 'fa-video' : 'fa-building';

    return {
      html: `
        <div class="gp-calendar-event" style="border-left-color: ${corAtendimento}">
          <div class="gp-event-header">
            <i class="fas ${iconTipo} gp-event-icon"></i>
            <span class="gp-event-title">${arg.event.title}</span>
            ${deveMostrarPagamento ? `<i class="fas ${iconPagamento} gp-event-icon ml-auto"></i>` : ''}
          </div>

          <div class="gp-event-meta">
            <span>${arg.timeText}</span>
            <span>•</span>
            <span>${this.getLabelStatus(agendamento.statusAtendimento)}</span>
          </div>

          ${
            deveMostrarPagamento
              ? `<div class="gp-event-meta">
                  <span class="gp-event-payment">Pagamento: ${this.getLabelStatus(agendamento.statusPagamento)}</span>
                </div>`
              : ''
          }
        </div>
      `,
    };
  }
}
