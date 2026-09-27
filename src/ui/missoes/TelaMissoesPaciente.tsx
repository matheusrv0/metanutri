// A tela que o paciente abre pelo link, no aparelho dele. Sem conta, sem menu e sem
// nada para aprender: a lista do dia e um toque para marcar. É a Fase 1 do
// `docs/plano-negocio.md`, e a métrica do produto nasce aqui.
import { Check, CircleAlert, GraduationCap, Link2Off } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  diaLocal,
  diasMarcadosNaSemana,
  marcarMissao,
  missoesDoDia,
  progressoDoDia,
  DIAS_NA_SEMANA_PARA_EM_DIA,
  type Acompanhamento,
} from '@/domain/acompanhamento.ts'
import type { FonteAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { cn } from '@/lib/utils'

interface TelaMissoesPacienteProps {
  readonly token: string
  readonly fonte: FonteAcompanhamentos
  /** Injetável para o teste não depender do relógio da máquina. */
  readonly hoje?: string
}

const DATA_LONGA = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' })

function dataPorExtenso(dia: string): string {
  const quando = new Date(`${dia}T00:00:00Z`)
  return Number.isNaN(quando.getTime()) ? '' : DATA_LONGA.format(quando)
}

function Moldura({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  )
}

function Aviso({ icone, titulo, texto }: { readonly icone: React.ReactNode; readonly titulo: string; readonly texto: string }) {
  return (
    <Moldura>
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <span aria-hidden="true" className="mx-auto mb-4 grid size-12 place-content-center rounded-full bg-muted text-muted-foreground">
          {icone}
        </span>
        <h1 className="font-titulo text-xl font-bold text-heading">{titulo}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{texto}</p>
      </div>
    </Moldura>
  )
}

interface Carga {
  readonly token: string
  readonly acompanhamento: Acompanhamento | null
}

export function TelaMissoesPaciente({ token, fonte, hoje = diaLocal() }: TelaMissoesPacienteProps) {
  // Guardar o token junto com o resultado deixa "carregando" ser derivado do render,
  // em vez de um segundo estado que o efeito teria de ligar e desligar.
  const [carga, setCarga] = useState<Carga | null>(null)
  const carregando = carga === null || carga.token !== token
  const acompanhamento = carregando ? null : carga.acompanhamento

  useEffect(() => {
    let vivo = true
    void fonte.porToken(token).then((achado) => {
      if (vivo) setCarga({ token, acompanhamento: achado })
    })
    return () => {
      vivo = false
    }
  }, [token, fonte])

  const alternar = useCallback(
    (missaoId: string, feita: boolean) => {
      setCarga((atual) => {
        if (atual === null || atual.acompanhamento === null) return atual
        const novo = marcarMissao(atual.acompanhamento, hoje, missaoId, feita)
        if (novo === atual.acompanhamento) return atual
        void fonte.salvar(novo)
        return { token: atual.token, acompanhamento: novo }
      })
    },
    [fonte, hoje],
  )

  if (carregando) {
    return (
      <Moldura>
        <p className="py-16 text-center text-sm text-muted-foreground">Abrindo suas missões…</p>
      </Moldura>
    )
  }

  if (acompanhamento === null) {
    return fonte.naNuvem ? (
      <Aviso
        icone={<Link2Off className="size-6" />}
        titulo="Este link não existe mais"
        texto="Pode ter sido trocado por um novo. Peça o link atualizado para quem montou seu plano."
      />
    ) : (
      <Aviso
        icone={<CircleAlert className="size-6" />}
        titulo="Este link ainda não abre em outro aparelho"
        texto="A conta na nuvem do MetaNutri não foi ligada. Por enquanto, as missões só aparecem no computador onde o plano foi montado."
      />
    )
  }

  const missoes = missoesDoDia(acompanhamento, hoje)
  const progresso = progressoDoDia(acompanhamento, hoje)
  const naSemana = diasMarcadosNaSemana(acompanhamento, hoje)
  const tudoFeito = progresso.total > 0 && progresso.feitas === progresso.total
  const primeiroNome = acompanhamento.nome.split(' ')[0] || 'Olá'

  return (
    <Moldura>
      {acompanhamento.usoNaoComercial ? (
        <aside className="mb-5 flex items-start gap-3 rounded-2xl border border-stateinfo/40 bg-lightinfo p-4">
          <GraduationCap className="mt-0.5 size-5 shrink-0 text-infotext" aria-hidden="true" />
          <p className="text-sm text-infotext">
            Este acompanhamento é de <strong>estágio de nutrição</strong>, feito por estudante sob supervisão. Não substitui consulta com nutricionista
            e não é atendimento profissional.
          </p>
        </aside>
      ) : null}

      <header className="mb-6">
        <p className="text-sm text-muted-foreground">{dataPorExtenso(hoje)}</p>
        <h1 className="mt-1 font-titulo text-2xl font-bold text-heading">
          {tudoFeito ? `Dia fechado, ${primeiroNome}.` : `Suas missões de hoje, ${primeiroNome}`}
        </h1>
      </header>

      <section aria-label="Progresso do dia" className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="numeros font-titulo text-3xl font-bold text-heading">
            {progresso.feitas}
            <span className="text-lg text-muted-foreground">/{progresso.total}</span>
          </span>
          <span className={cn('text-sm font-medium', tudoFeito ? 'text-successtext' : 'text-muted-foreground')}>
            {tudoFeito ? 'Tudo feito hoje' : 'feitas hoje'}
          </span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progresso.pct} aria-valuemin={0} aria-valuemax={100}>
          <div className={cn('h-full rounded-full transition-[width] duration-300', tudoFeito ? 'bg-stateok' : 'bg-surfaceinverse')} style={{ width: `${progresso.pct}%` }} />
        </div>
      </section>

      <ul className="flex flex-col gap-2.5">
        {missoes.map((missao) => (
          <li key={missao.id}>
            <button
              type="button"
              aria-pressed={missao.feita}
              onClick={() => alternar(missao.id, !missao.feita)}
              className={cn(
                'flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                missao.feita ? 'border-stateok/40 bg-lightsuccess' : 'border-border bg-card hover:border-borderstrong',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 grid size-6 shrink-0 place-content-center rounded-full border-2 transition-colors',
                  missao.feita ? 'border-stateok bg-stateok text-textoninverse' : 'border-borderstrong',
                )}
              >
                {missao.feita ? <Check className="size-4" strokeWidth={3} /> : null}
              </span>
              <span className="min-w-0">
                <span className={cn('block text-base font-medium', missao.feita ? 'text-successtext line-through' : 'text-heading')}>{missao.texto}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{missao.origem}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {missoes.length === 0 ? <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">Seu plano ainda não tem missões.</p> : null}

      <footer className="mt-8 text-center text-xs text-muted-foreground">
        <p className="font-medium text-foreground">
          {naSemana === 0
            ? 'Marque a primeira de hoje.'
            : `Você marcou missão em ${naSemana} ${naSemana === 1 ? 'dia' : 'dias'} desta semana.`}
        </p>
        <p className="mt-1">
          {naSemana >= DIAS_NA_SEMANA_PARA_EM_DIA ? 'Está no ritmo que seu nutricionista combinou.' : `A meta são ${DIAS_NA_SEMANA_PARA_EM_DIA} dias por semana.`}
        </p>
        <p className="mt-4">Não precisa de conta nem de aplicativo. Guarde este link e abra todo dia.</p>
      </footer>
    </Moldura>
  )
}
