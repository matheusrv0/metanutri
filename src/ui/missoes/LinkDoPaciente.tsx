// O que o paciente vê no link aberto: o aviso de estágio, o topo, as missões (e "Meu plano", com a dieta) e o rodapé.
// Só desenha: quem busca e marca é a `TelaMissoesPaciente`. A prévia de "Sua marca" desenha este mesmo componente, num
// celular claro e num escuro (spec marca-no-link, DP-ML-15): o que a nutricionista vê é o que o paciente vê.
import { Check, GraduationCap } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { diasMarcadosNaSemana, missoesDoDia, progressoDoDia, DIAS_NA_SEMANA_PARA_EM_DIA, type Acompanhamento, type MissaoDoDia, type ProgressoDia } from '@/domain/acompanhamento.ts'
import { avaliarCor } from '@/domain/corDaMarca.ts'
import { temDieta } from '@/domain/dietaDoLink.ts'
import type { MarcaDoLink } from '@/domain/marca.ts'
import { cn } from '@/lib/utils'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Logo } from '@ds/componentes/display/Logo.tsx'
import { PlacaLogo } from '@ds/componentes/display/PlacaLogo.tsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ds/componentes/navigation/tabs.tsx'
import { MeuPlano } from './MeuPlano.tsx'

type Parte = 'missoes' | 'plano'

/** O tema fixo de um celular da prévia; fora da prévia, o link segue o tema do celular do paciente. */
export type TemaDaPrevia = 'claro' | 'escuro'

/** D-154: as duas partes do link, quando ele tem a dieta. */
const PARTES: readonly { readonly valor: Parte; readonly rotulo: string }[] = [
  { valor: 'missoes', rotulo: 'Missões' },
  { valor: 'plano', rotulo: 'Meu plano' },
]

/** O texto alternativo da logo dela: o link não sabe o nome de quem montou o plano, e não precisa saber (D-952). */
export const ALT_DA_LOGO_NO_LINK = 'Logo de quem montou seu plano'

/*
 * DP-157: as abas do design system (Tabs, do Radix: tablist, tab, tabpanel e setas do teclado) com cara de pílula só
 * nesta tela. O trilho cinza ganha um fio para aparecer sobre a mesa cinza. A régua por baixo da aba do Tabs some aqui.
 * Toque de 44 px no celular. Spec marca-no-link (D-956, DP-ML-8): sem a cor dela, a aba escolhida é a pílula branca de
 * sempre; com a cor, é a pílula na cor (`--link-acao`), com o texto por cima (`--link-acao-texto`).
 */
const TRILHO = 'grid w-full grid-cols-2 gap-1 rounded-full border border-borderdefault bg-surfacerow p-1'
const ABA = 'h-11 rounded-full px-4 font-semibold transition-colors duration-150 data-[state=active]:shadow-xs data-[state=active]:after:hidden'
/** Fora da prévia, a densidade do computador a partir de 640 px com mouse; o celular da prévia é sempre celular. */
const ABA_FORA_DA_PREVIA = 'sm:h-9 sm:pointer-coarse:h-11'
const ABA_ESCOLHIDA_SEM_COR = 'data-[state=active]:bg-card data-[state=active]:text-heading'
const ABA_ESCOLHIDA_COM_COR = 'data-[state=active]:bg-linkacao data-[state=active]:text-linkacaotexto'

const DATA_LONGA = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' })

function dataPorExtenso(dia: string): string {
  const quando = new Date(`${dia}T00:00:00Z`)
  return Number.isNaN(quando.getTime()) ? '' : DATA_LONGA.format(quando)
}

/** As variáveis da cor dela na raiz do link: a cor e a versão do escuro (D-955). O CSS escolhe pelo tema. */
function estiloDaCor(cor: string): CSSProperties {
  return { '--marca-claro': cor, '--marca-escuro': avaliarCor(cor).escuro } as CSSProperties
}

interface MolduraDoLinkProps {
  readonly children: ReactNode
  readonly cor?: string | null
  readonly previa?: TemaDaPrevia | undefined
}

/**
 * CA-757 (spec revisao-geral-publica): o conteúdo da tela é a região principal. Na prévia, o celular é um pedaço da
 * tela de "Sua marca": sem a altura da tela inteira e sem região principal, no escopo do tema dele.
 */
export function MolduraDoLink({ children, cor = null, previa }: MolduraDoLinkProps) {
  const comCor = cor !== null
  if (previa) {
    return (
      <div className={previa === 'escuro' ? 'dark' : 'tema-claro'}>
        <div
          data-link-do-paciente=""
          className={cn('bg-background px-4 pt-5 pb-8 text-foreground', comCor && 'marca-da-nutricionista')}
          style={comCor ? estiloDaCor(cor) : undefined}
        >
          {children}
        </div>
      </div>
    )
  }
  return (
    <div data-link-do-paciente="" className={cn('min-h-dvh bg-background px-4 py-8', comCor && 'marca-da-nutricionista')} style={comCor ? estiloDaCor(cor) : undefined}>
      <main className="mx-auto w-full max-w-md">{children}</main>
    </div>
  )
}

interface LinkDoPacienteProps {
  readonly acompanhamento: Acompanhamento
  readonly marca: MarcaDoLink
  readonly hoje: string
  /** D-232: a frase de quando a última marcação não chegou à nuvem. */
  readonly naoSalvou: string | null
  readonly aoAlternar: (missaoId: string, feita: boolean) => void
  /** A prévia de "Sua marca": o celular claro ou o escuro. */
  readonly previa?: TemaDaPrevia
}

export function LinkDoPaciente({ acompanhamento, marca, hoje, naoSalvou, aoAlternar, previa }: LinkDoPacienteProps) {
  // D-154: abre em "Missões", como sempre abriu.
  const [parte, setParte] = useState<Parte>('missoes')
  // CA-1973: a logo que não abriu volta à do MetaNutri; uma logo nova tenta de novo.
  const [logoQuebrada, setLogoQuebrada] = useState<string | null>(null)
  const logo = marca.logo !== null && marca.logo !== logoQuebrada ? marca.logo : null

  const missoes = missoesDoDia(acompanhamento, hoje)
  const progresso = progressoDoDia(acompanhamento, hoje)
  const naSemana = diasMarcadosNaSemana(acompanhamento, hoje)
  const tudoFeito = progresso.total > 0 && progresso.feitas === progresso.total
  // "Ana, 30 anos" vira "Ana": o nome do plano costuma vir com vírgula e idade.
  const primeiroNome = acompanhamento.nome.trim().split(/[\s,;]+/)[0] || 'Olá'
  // CA-536 e CB-159: link sem dieta, ou com a dieta vazia, é a tela de missões de sempre.
  const dieta = temDieta(acompanhamento.dieta) ? acompanhamento.dieta : null
  const varianteDaLogo = previa === 'claro' ? 'claro' : previa === 'escuro' ? 'escuro' : 'auto'

  const parteDasMissoes = (
    <ParteDasMissoes
      hoje={hoje}
      primeiroNome={primeiroNome}
      missoes={missoes}
      progresso={progresso}
      naSemana={naSemana}
      tudoFeito={tudoFeito}
      naoSalvou={naoSalvou}
      aoAlternar={aoAlternar}
    />
  )

  return (
    <MolduraDoLink cor={marca.cor} previa={previa}>
      {/* D-958 e CA-1970: o aviso de estágio vem antes de tudo, antes da logo dela inclusive. */}
      {acompanhamento.usoNaoComercial ? (
        <aside className="mb-5 flex items-start gap-3 rounded-2xl border border-stateinfo/40 bg-lightinfo p-4">
          <GraduationCap className="mt-0.5 size-5 shrink-0 text-infotext" aria-hidden="true" />
          <p className="text-sm text-infotext">
            Este acompanhamento é de <strong>estágio de nutrição</strong>, feito por estudante sob supervisão. Não substitui consulta com nutricionista
            e não é atendimento profissional.
          </p>
        </aside>
      ) : null}

      {/* D-957: a logo dela no lugar da do MetaNutri, numa placa branca; sem logo, o topo de sempre. */}
      <div className="mb-5 flex items-center">
        {logo ? <PlacaLogo src={logo} alt={ALT_DA_LOGO_NO_LINK} aoFalhar={() => setLogoQuebrada(logo)} /> : <Logo tamanho={22} variante={varianteDaLogo} />}
      </div>

      {dieta ? (
        <Tabs value={parte} onValueChange={(valor) => setParte(valor === 'plano' ? 'plano' : 'missoes')}>
          <TabsList aria-label="O que ver" className={TRILHO}>
            {PARTES.map((p) => (
              <TabsTrigger
                key={p.valor}
                value={p.valor}
                className={cn(ABA, previa ? null : ABA_FORA_DA_PREVIA, marca.cor !== null ? ABA_ESCOLHIDA_COM_COR : ABA_ESCOLHIDA_SEM_COR)}
              >
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

      {/* D-957: com a logo dela no topo, o MetaNutri fica pequeno no rodapé, em todos os planos (D-959). */}
      {logo ? (
        <div className="mt-8 flex justify-center opacity-80">
          <Logo tamanho={16} variante={varianteDaLogo} />
        </div>
      ) : null}
    </MolduraDoLink>
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
  readonly naoSalvou: string | null
  readonly aoAlternar: (missaoId: string, feita: boolean) => void
}) {
  return (
    <>
      <header className="mb-6">
        <p className="text-sm text-muted-foreground">{dataPorExtenso(hoje)}</p>
        <h1 className="mt-1 font-titulo text-2xl font-bold text-heading">
          {tudoFeito ? `Dia completo, ${primeiroNome}.` : `Suas missões de hoje, ${primeiroNome}`}
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
          {/* D-956: a barra do dia é ação (a cor dela, quando há); "Dia completo" continua verde (estado). */}
          <div className={cn('h-full rounded-full transition-[width] duration-300', tudoFeito ? 'bg-stateok' : 'bg-linkacao')} style={{ width: `${progresso.pct}%` }} />
        </div>
      </section>

      {naoSalvou ? (
        <Alert variant="error" role="alert" className="mb-4">
          {naoSalvou}
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
          {naSemana >= DIAS_NA_SEMANA_PARA_EM_DIA ? 'Você está no ritmo combinado.' : `A meta é marcar em ${DIAS_NA_SEMANA_PARA_EM_DIA} dias por semana.`}
        </p>
        <p className="mt-4">Não precisa de conta nem de aplicativo. Guarde este link e abra todo dia.</p>
      </footer>
    </>
  )
}
