// A tela que o paciente abre pelo link, no aparelho dele. Sem conta, sem menu e sem
// nada para aprender: a lista do dia e um toque para marcar. É a Fase 1 do
// `docs/plano-negocio.md`, e a métrica do produto nasce aqui. Com a dieta no link
// (spec dieta-no-link), uma segunda parte, "Meu plano", mostra o que comer.
import { Check, CircleAlert, GraduationCap, Link2Off, WifiOff } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import {
  diaLocal,
  diasMarcadosNaSemana,
  marcarMissao,
  missoesDoDia,
  progressoDoDia,
  DIAS_NA_SEMANA_PARA_EM_DIA,
  type Acompanhamento,
  type MissaoDoDia,
  type ProgressoDia,
} from '@/domain/acompanhamento.ts'
import { temDieta } from '@/domain/dietaDoLink.ts'
import type { FonteAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { cn } from '@/lib/utils'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Logo } from '@ds/componentes/display/Logo.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ds/componentes/navigation/tabs.tsx'
import { MeuPlano } from './MeuPlano.tsx'

type Parte = 'missoes' | 'plano'

/** D-154: as duas partes do link, quando ele tem a dieta. */
const PARTES: readonly { readonly valor: Parte; readonly rotulo: string }[] = [
  { valor: 'missoes', rotulo: 'Missões' },
  { valor: 'plano', rotulo: 'Meu plano' },
]

/*
 * DP-157: as abas do design system (Tabs, do Radix: tablist, tab, tabpanel e setas do teclado) com cara de pílula só
 * nesta tela. O trilho cinza ganha um fio para aparecer sobre a mesa cinza; a aba escolhida é a pílula branca. A régua
 * por baixo da aba do Tabs some aqui. Toque de 44 px no celular.
 */
const TRILHO = 'grid w-full grid-cols-2 gap-1 rounded-full border border-borderdefault bg-surfacerow p-1'
const ABA =
  'h-11 rounded-full px-4 font-semibold sm:h-9 data-[state=active]:bg-card data-[state=active]:text-heading data-[state=active]:shadow-xs data-[state=active]:after:hidden'

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

/** CA-757 (spec revisao-geral-publica): o conteúdo da tela é a região principal. */
function Moldura({ children }: { readonly children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background px-4 py-8">
      <main className="mx-auto w-full max-w-md">{children}</main>
    </div>
  )
}

function Aviso({ icone, titulo, texto, acao }: { readonly icone: ReactNode; readonly titulo: string; readonly texto: string; readonly acao?: ReactNode }) {
  return (
    <Moldura>
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <span aria-hidden="true" className="mx-auto mb-4 grid size-12 place-content-center rounded-full bg-muted text-muted-foreground">
          {icone}
        </span>
        <h1 className="font-titulo text-xl font-bold text-heading">{titulo}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{texto}</p>
        {acao ? <div className="mt-6">{acao}</div> : null}
      </div>
    </Moldura>
  )
}

interface Carga {
  readonly token: string
  /** Qual pedido respondeu: "Tentar de novo" pede outra vez (CA-753). */
  readonly tentativa: number
  readonly acompanhamento: Acompanhamento | null
  /** A nuvem não respondeu e o aparelho não tinha cópia (D-232): não dá para dizer que o link não existe. */
  readonly semConexao: boolean
}

export function TelaMissoesPaciente({ token, fonte, hoje = diaLocal() }: TelaMissoesPacienteProps) {
  // Guardar o token junto com o resultado deixa "carregando" ser derivado do render,
  // em vez de um segundo estado que o efeito teria de ligar e desligar.
  const [carga, setCarga] = useState<Carga | null>(null)
  const [tentativa, setTentativa] = useState(0)
  // D-232: a última marcação não chegou à nuvem; some quando uma marcação salva.
  const [naoSalvou, setNaoSalvou] = useState(false)
  // D-154: abre em "Missões", como sempre abriu.
  const [parte, setParte] = useState<Parte>('missoes')
  const carregando = carga === null || carga.token !== token || carga.tentativa !== tentativa
  const acompanhamento = carregando ? null : carga.acompanhamento

  useEffect(() => {
    let vivo = true
    fonte.porToken(token).then(
      (achado) => {
        if (vivo) setCarga({ token, tentativa, acompanhamento: achado, semConexao: false })
      },
      () => {
        if (vivo) setCarga({ token, tentativa, acompanhamento: null, semConexao: true })
      },
    )
    return () => {
      vivo = false
    }
  }, [token, fonte, tentativa])

  /**
   * Marca na hora e grava. A nuvem não gravando (D-232, CA-756), só esta missão volta como estava (CB-236) e a tela
   * avisa: a marca não fica fingindo que salvou.
   */
  const alternar = (missaoId: string, feita: boolean) => {
    if (carga === null || carga.acompanhamento === null) return
    const novo = marcarMissao(carga.acompanhamento, hoje, missaoId, feita)
    if (novo === carga.acompanhamento) return
    setCarga({ ...carga, acompanhamento: novo })
    fonte.salvar(novo).then(
      () => setNaoSalvou(false),
      () => {
        setCarga((atual) => (atual?.acompanhamento ? { ...atual, acompanhamento: marcarMissao(atual.acompanhamento, hoje, missaoId, !feita) } : atual))
        setNaoSalvou(true)
      },
    )
  }

  if (carregando) {
    return (
      <Moldura>
        <p className="py-16 text-center text-sm text-muted-foreground">Abrindo suas missões…</p>
      </Moldura>
    )
  }

  if (acompanhamento === null && carga.semConexao) {
    return (
      <Aviso
        icone={<WifiOff className="size-6" />}
        titulo="Não consegui abrir suas missões"
        texto="Confira a internet do celular e tente de novo."
        acao={
          <Button size="lg" block onClick={() => setTentativa((n) => n + 1)}>
            Tentar de novo
          </Button>
        }
      />
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
  // "Ana, 30 anos" vira "Ana": o nome do plano costuma vir com vírgula e idade.
  const primeiroNome = acompanhamento.nome.trim().split(/[\s,;]+/)[0] || 'Olá'
  // CA-536 e CB-159: link sem dieta, ou com a dieta vazia, é a tela de missões de sempre.
  const dieta = temDieta(acompanhamento.dieta) ? acompanhamento.dieta : null
  const parteDasMissoes = (
    <ParteDasMissoes
      hoje={hoje}
      primeiroNome={primeiroNome}
      missoes={missoes}
      progresso={progresso}
      naSemana={naSemana}
      tudoFeito={tudoFeito}
      naoSalvou={naoSalvou}
      aoAlternar={alternar}
    />
  )

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

      <Logo tamanho={22} className="mb-5" />

      {dieta ? (
        <Tabs value={parte} onValueChange={(valor) => setParte(valor === 'plano' ? 'plano' : 'missoes')}>
          <TabsList aria-label="O que ver" className={TRILHO}>
            {PARTES.map((p) => (
              <TabsTrigger key={p.valor} value={p.valor} className={ABA}>
                {p.rotulo}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="missoes" className="mt-6">
            {parteDasMissoes}
          </TabsContent>
          <TabsContent value="plano" className="mt-6">
            <MeuPlano dieta={dieta} primeiroNome={primeiroNome} />
          </TabsContent>
        </Tabs>
      ) : (
        parteDasMissoes
      )}
    </Moldura>
  )
}

/** A parte das missões, como era a tela inteira antes da dieta no link. */
function ParteDasMissoes({
  hoje,
  primeiroNome,
  missoes,
  progresso,
  naSemana,
  tudoFeito,
  naoSalvou,
  aoAlternar: alternar,
}: {
  readonly hoje: string
  readonly primeiroNome: string
  readonly missoes: readonly MissaoDoDia[]
  readonly progresso: ProgressoDia
  readonly naSemana: number
  readonly tudoFeito: boolean
  readonly naoSalvou: boolean
  readonly aoAlternar: (missaoId: string, feita: boolean) => void
}) {
  return (
    <>
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

      {naoSalvou ? (
        <Alert variant="error" role="alert" className="mb-4">
          Não consegui salvar. Confira a internet e marque de novo.
        </Alert>
      ) : null}

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
    </>
  )
}
