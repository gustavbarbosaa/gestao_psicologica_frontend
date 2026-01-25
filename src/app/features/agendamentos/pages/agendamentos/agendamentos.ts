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
import { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { ZardDialogService } from '@shared/components/dialog/dialog.service';
import { CriaAgendamentoForm } from '@features/agendamentos/components/cria-agendamento-form/cria-agendamento-form';
import { iAgendamentoRequest } from '@shared/models/agendamento.model';
import { AgendamentoService } from '@core/services/agendamento-service';
import { ToastService } from '@shared/services/toast-service';
import { Subject, takeUntil } from 'rxjs';
import { EditarAgendamentoForm } from '@features/agendamentos/components/editar-agendamento/editar-agendamento-form';

@Component({
  selector: 'app-agendamentos',
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './agendamentos.html',
  styleUrl: './agendamentos.css',
})
export class Agendamentos implements OnInit, OnDestroy, AfterViewInit {
  private dialogService = inject(ZardDialogService);
  private agendamentoService = inject(AgendamentoService);
  private toastService = inject(ToastService);
  private DURACAO_PADRAO_EM_MINUTOS = 60;

  protected calendarOptions!: CalendarOptions;
  protected eventosCalendario = signal<any[]>([]);

  private destroy$ = new Subject<void>();

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
      initialView: 'dayGridMonth',
      plugins: [dayGridPlugin, interactionPlugin, timeGridPlugin],
      weekends: false,
      locale: ptBrLocale,
      locales: [ptBrLocale],
      dateClick: (arg: DateClickArg) => this.handleDateClick(arg),
      eventDisplay: 'block',
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

  carregarAgendamentosIniciais(): void {
    this.agendamentoService.buscarAgendamentosPorUsuario().subscribe({
      next: (agendamentos) => {
        const eventosFormatados = agendamentos.map((agendamento) => ({
          id: agendamento.id,
          title: agendamento.paciente.nome,
          start: agendamento.dataHoraInicio,
          end: agendamento.dataHoraFim,
          color: '#0f766e',
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
      color: '#0f766e',
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
      color: '#0f766e',
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
        const form = (instance as CriaAgendamentoForm).form;

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
        const form = (instance as EditarAgendamentoForm).form;

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
        duracaoEmMinutos: Math.round(
          (new Date(agendamento.dataHoraFim).getTime() -
            new Date(agendamento.dataHoraInicio).getTime()) /
            60000,
        ),
        pacienteId: agendamento.paciente?.id || '',
        usuarioId: agendamento.usuario?.id || '',
      },
      zOkIcon: 'check',
      zCancelIcon: 'x',
      zOkText: 'Salvar',
      zCancelText: 'Cancelar',
      zOnOk: (instance) => {
        const form = (instance as EditarAgendamentoForm).form;

        if (form.valid) {
          const payload = form.getRawValue() as iAgendamentoRequest;
          this.agendamentoService.editarAgendamento(agendamento.id, payload).subscribe({
            next: (updated) => {
              this.toastService.exibirToastSucesso(
                'Agendamento atualizado',
                `Agendamento para ${updated.paciente.nome} atualizado.`,
              );
              const evt = this.calendarComponent.getApi().getEventById(updated.id);
              if (evt) {
                evt.setProp('title', updated.paciente.nome);
                evt.setStart(updated.dataHoraInicio);
                evt.setEnd(updated.dataHoraFim);
                (evt as any).setExtendedProp('agendamento', updated);
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
        this.toastService.exibirToastErro(
          'Erro ao criar agendamento',
          'Tente novamente mais tarde.',
        );
        console.error('Erro ao criar agendamento', err);
      },
    });
  }
}
