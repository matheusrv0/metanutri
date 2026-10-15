import { ChevronDown, TriangleAlert } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { calcularAdequacao, type EstadoAdequacao, type LinhaAdequacao } from '@/domain/adequacao.ts'
import { arredondarNoEstado } from '@/domain/arredondarNoEstado.ts'
import { adicionarItem, type GerarId } from '@/domain/plano.ts'
import { NOME_DA_BASE } from '@/domain/baseMetanutri.ts'
import { ALIMENTOS, buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDoPlano } from '@/domain/totais.ts'
import type { Caso, ChaveNutrienteAlimento, Plano, PresetAdequacao } from '@/domain/tipos.ts'
import { quantidadeNoPlano, valorDeReferencia } from '@/domain/formatarQuantidade.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { cn } from '@/lib/utils'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { SeletorSegmentado } from '@ds/componentes/navigation/SeletorSegmentado.tsx'
import { Progress } from '@ds/componentes/display/progress.tsx'
import { Table, TableBody, TableCell, TableFootnotes, TableHead, TableHeader, TableRow } from '@ds/componentes/display/table.tsx'
import { useMediaQuery } from '../estado/usarMediaQuery.ts'
import { GavetaCobrir } from './GavetaCobrir.tsx'
import { MarcaLimite } from './MarcaLimite.tsx'
import { MarcaSemDado } from './MarcaSemDado.tsx'
import { podeCobrir } from './podeCobrir.ts'

interface TelaAdequacaoProps {
  readonly caso: Caso
  readonly plano: Plano
  readonly gastoEnergetico: number | null
  /** Restrições do paciente vinculado; filtram as sugestões do cobrir. */
  readonly restricoes?: readonly string[]
  readonly aoAlterarCaso: (mudanca: Partial<Caso>) => void
  readonly aoAlterarPlano: (novo: Plano) => void
  readonly gerarId?: GerarId
  readonly aoAbrirFontes?: (() => void) | undefined
}

/* A barra carrega o estado da linha: cor sempre significa alguma coisa. */
const VARIANTE_BARRA: Record<EstadoAdequacao, 'success' | 'warning' | 'error'> = {
  adequado: 'success',
  abaixo: 'warning',
  'acima-limite': 'error',
}

/* O texto da adequação leva a mesma cor da barra: abaixo em âmbar, dentro em verde, acima do limite em vermelho. */
const COR_TEXTO: Record<EstadoAdequacao, string> = {
  adequado: 'text-successtext',
  abaixo: 'text-warningtext',
  'acima-limite': 'text-errortext',
}

function textoDaAdequacao(linha: LinhaAdequacao): string {
  // Abaixo da meta arredonda para baixo: 89,6% nunca sai "90% abaixo" (D-209).
  const pct = `${formatarNumero(arredondarNoEstado(linha.adequacaoPct, linha.estado === 'abaixo' ? 'abaixo' : 'dentro'), 0)}%`
  if (linha.estado === 'abaixo') return `${pct} abaixo`
  if (linha.estado === 'acima-limite') return `${pct} · acima do limite`
  return pct
}
const TIPO_PRESET: readonly { readonly valor: PresetAdequacao['tipo']; readonly rotulo: string }[] = [
  { valor: 'individual', rotulo: 'Individual (RDA, 90%)' },
  { valor: 'coletivo', rotulo: 'Coletivo (EAR, 50%)' },
  { valor: 'personalizado', rotulo: 'Personalizado' },
]

const idPadrao: GerarId = () => globalThis.crypto.randomUUID()

/** O maior mínimo que `calcularAdequacao` aceita no preset personalizado (`adequacao.ts`). */
const MINIMO_MAXIMO_PCT = 1000

/** Abaixo de 640 px a tabela vira lista: a tabela rolava para o lado e escondia o Cobrir (D-207). */
const CELULAR = '(max-width: 639px)'

/** "feminino-19-30" vira "mulheres de 19 a 30 anos"; "gestante-19-30" vira "gestantes de 19 a 30 anos". */
function descreverEstagio(estagio: { readonly idadeMin: number; readonly idadeMax: number | null; readonly sexo: string | null; readonly gestante: boolean; readonly lactante: boolean }): string {
  const grupo = estagio.gestante
    ? 'gestantes'
    : estagio.lactante
      ? 'lactantes'
      : estagio.sexo === 'F'
        ? 'mulheres'
        : estagio.sexo === 'M'
          ? 'homens'
          : 'crianças'
  const faixa = estagio.idadeMax === null ? `${estagio.idadeMin} anos ou mais` : `${estagio.idadeMin} a ${estagio.idadeMax} anos`
  return `${grupo} de ${faixa}`
}

function Linha({ linha, aoCobrir }: { readonly linha: LinhaAdequacao; readonly aoCobrir: () => void }) {
  return (
    <TableRow>
      <TableCell>
        <span className="font-medium text-heading">{linha.rotulo}</span>
        <MarcaLimite nota={linha.notaLimite} />
      </TableCell>
      <TableCell className="numeros whitespace-nowrap">
        {`${quantidadeNoPlano(linha.total)} ${linha.unidade}`}
        <MarcaSemDado semDado={linha.semDado} />
      </TableCell>
      <TableCell className="numeros whitespace-nowrap">
        {`${valorDeReferencia(linha.referencia.valor)} ${linha.unidade}`}
        <span className="ml-1.5 text-xs uppercase text-muted-foreground">{linha.referencia.tipo}</span>
      </TableCell>
      <TableCell className="min-w-36">
        <Progress value={linha.adequacaoPct} variant={VARIANTE_BARRA[linha.estado]} />
        <span className={`numeros mt-1 block whitespace-nowrap text-xs font-semibold ${COR_TEXTO[linha.estado]}`}>{textoDaAdequacao(linha)}</span>
      </TableCell>
      <TableCell>
        {podeCobrir(linha) ? (
          <Button size="sm" variant="lightprimary" onClick={aoCobrir}>
            Cobrir
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  )
}

/** No celular, cada nutriente é um item: nome e estado, a barra, quanto tem de quanto precisa e o Cobrir (CA-692). */
function ItemLista({ linha, aoCobrir }: { readonly linha: LinhaAdequacao; readonly aoCobrir: () => void }) {
  return (
    <li className="flex flex-col gap-2 border-b border-border py-3 last:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-sm font-medium text-heading">
          {linha.rotulo}
          <MarcaLimite nota={linha.notaLimite} />
        </span>
        <span className={`numeros shrink-0 text-xs font-semibold ${COR_TEXTO[linha.estado]}`}>{textoDaAdequacao(linha)}</span>
      </div>
      <Progress value={linha.adequacaoPct} variant={VARIANTE_BARRA[linha.estado]} />
      <div className="flex min-h-11 items-center justify-between gap-3">
        <span className="numeros text-xs text-muted-foreground">
          {`${quantidadeNoPlano(linha.total)} ${linha.unidade}`}
          <MarcaSemDado semDado={linha.semDado} />
          {` de ${valorDeReferencia(linha.referencia.valor)} ${linha.unidade} `}
          <span className="uppercase">{linha.referencia.tipo}</span>
        </span>
        {podeCobrir(linha) ? (
          <Button size="sm" variant="lightprimary" onClick={aoCobrir}>
            Cobrir
          </Button>
        ) : null}
      </div>
    </li>
  )
}

/** Etapa 3: adequação de micronutrientes e ação "cobrir" (CA-25 a CA-40). */
export function TelaAdequacao({ caso, plano, gastoEnergetico, restricoes = [], aoAlterarCaso, aoAlterarPlano, gerarId = idPadrao, aoAbrirFontes }: TelaAdequacaoProps) {
  const [cobrindo, setCobrindo] = useState<ChaveNutrienteAlimento | null>(null)
  const [mostrarNaMeta, setMostrarNaMeta] = useState(false)
  const idNaMeta = useId()
  const celular = useMediaQuery(CELULAR)
  const prefs = caso.adequacao

  const totais = useMemo(() => totaisDoPlano(plano, buscarAlimento), [plano])
  const resultado = useMemo(() => calcularAdequacao(totais, caso, prefs.preset), [totais, caso, prefs.preset])

  const trocarPreset = (tipo: PresetAdequacao['tipo']) => {
    const preset: PresetAdequacao =
      tipo === 'personalizado' ? { tipo: 'personalizado', referencia: 'rda', minimoPct: 90 } : { tipo }
    aoAlterarCaso({ adequacao: { ...prefs, preset } })
  }

  const rotuloCobrindo = resultado.linhas.find((l) => l.chave === cobrindo)?.rotulo ?? ''
  // O que pede ação fica à vista, na ordem de sempre; o que está na meta fica recolhido (D-205).
  const pedemAcao = resultado.linhas.filter((l) => l.estado !== 'adequado')
  const naMeta = resultado.linhas.filter((l) => l.estado === 'adequado')
  const rotuloNaMeta = `${mostrarNaMeta ? 'Esconder' : 'Ver'} os ${naMeta.length} na meta`
  const botaoNaMeta = (
    <Button variant="ghost" size="sm" aria-expanded={mostrarNaMeta} aria-controls={idNaMeta} onClick={() => setMostrarNaMeta((v) => !v)}>
      <ChevronDown className={cn('transition-transform', mostrarNaMeta && 'rotate-180')} aria-hidden="true" />
      {rotuloNaMeta}
    </Button>
  )
  const nomeAlimento = (id: number) => ALIMENTOS.find((a) => a.id === id)?.descricao ?? ''

  const metaPct = resultado.linhas[0]?.metaPct ?? null
  const subtitulo = [resultado.estagio ? descreverEstagio(resultado.estagio) : null, metaPct === null ? null : `meta de ${formatarNumero(metaPct, 0)}% da referência`]
    .filter((p): p is string => p !== null)
    .join(' · ')

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Micronutrientes</CardTitle>
          {subtitulo ? <CardDescription>{subtitulo}</CardDescription> : null}
        </CardHeader>

        <SeletorSegmentado rotulo="Tipo de referência" opcoes={TIPO_PRESET} valor={prefs.preset.tipo} aoEscolher={trocarPreset} className="max-w-full overflow-x-auto" />

        {prefs.preset.tipo === 'personalizado' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <GrupoOpcoes<'rda' | 'ear'>
              rotulo="Referência"
              opcoes={[
                { valor: 'rda', rotulo: 'RDA' },
                { valor: 'ear', rotulo: 'EAR' },
              ]}
              valor={prefs.preset.referencia}
              aoEscolher={(referencia) => aoAlterarCaso({ adequacao: { ...prefs, preset: { ...prefs.preset, referencia } as PresetAdequacao } })}
            />
            <CampoNumero
              rotulo="Mínimo da meta"
              valor={prefs.preset.tipo === 'personalizado' ? prefs.preset.minimoPct : 90}
              aoMudar={(v) =>
                // Acima de 1000% o cálculo da adequação recusa o número: ele não vale, e a tela não cai (CA-698).
                v !== null &&
                v > 0 &&
                v <= MINIMO_MAXIMO_PCT &&
                aoAlterarCaso({ adequacao: { ...prefs, preset: { ...prefs.preset, minimoPct: v } as PresetAdequacao } })
              }
              sufixo="%"
            />
          </div>
        ) : null}

        {resultado.motivoSemCalculo ? (
          <Alert variant="warning">
            <TriangleAlert aria-hidden="true" />
            <p>{resultado.motivoSemCalculo}</p>
          </Alert>
        ) : (
          <>
            {celular ? (
              <div className="flex flex-col">
                {pedemAcao.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Nenhum nutriente abaixo da meta.</p> : null}
                {pedemAcao.length > 0 ? (
                  <ul aria-label="Fora da meta" className="flex flex-col">
                    {pedemAcao.map((linha) => (
                      <ItemLista key={linha.chave} linha={linha} aoCobrir={() => setCobrindo(linha.chave)} />
                    ))}
                  </ul>
                ) : null}
                {naMeta.length > 0 ? <div className="pt-2">{botaoNaMeta}</div> : null}
                <ul id={idNaMeta} hidden={!mostrarNaMeta} aria-label="Na meta" className="flex flex-col">
                  {naMeta.map((linha) => (
                    <ItemLista key={linha.chave} linha={linha} aoCobrir={() => setCobrindo(linha.chave)} />
                  ))}
                </ul>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nutriente</TableHead>
                    <TableHead>No plano</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Adequação</TableHead>
                    <TableHead>
                      <span className="sr-only">Ações</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedemAcao.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        Nenhum nutriente abaixo da meta.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {pedemAcao.map((linha) => (
                    <Linha key={linha.chave} linha={linha} aoCobrir={() => setCobrindo(linha.chave)} />
                  ))}
                  {naMeta.length > 0 ? (
                    <TableRow className="[&:has(td)]:hover:bg-transparent">
                      <TableCell colSpan={5} className="py-2">
                        {botaoNaMeta}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
                <TableBody id={idNaMeta} hidden={!mostrarNaMeta}>
                  {naMeta.map((linha) => (
                    <Linha key={linha.chave} linha={linha} aoCobrir={() => setCobrindo(linha.chave)} />
                  ))}
                </TableBody>
              </Table>
            </div>
            )}

            <TableFootnotes>
              <p>
                <span className="mr-1 align-super text-[10px] font-semibold text-warningtext">†</span>
                <span>Total possivelmente subestimado: algum alimento do plano não tem esse dado, e falta de dado nunca entra como zero.</span>
              </p>
              <p>
                <span className="mr-1 align-super text-[10px] font-semibold text-muted-foreground">‡</span>
                <span>O limite superior da tabela não vale para a forma do nutriente presente nos alimentos.</span>
              </p>
              <p>AI: usada quando o nutriente não tem RDA nem EAR.</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-1">
                {`Composição: ${NOME_DA_BASE}`}
                {aoAbrirFontes ? (
                  <>
                    {' · '}
                    <button type="button" onClick={aoAbrirFontes} className="inline-flex min-h-11 items-center font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      Fontes da base
                    </button>
                  </>
                ) : null}
              </p>
              <p>{`Referências de ingestão: ${resultado.fonte}`}</p>
              {prefs.ocultos.length > 0 ? <p className="mt-1">{`Sugestões ocultas neste caso: ${prefs.ocultos.map(nomeAlimento).join(', ')}.`}</p> : null}
            </TableFootnotes>
          </>
        )}
      </Card>
      <GavetaCobrir
        chave={cobrindo}
        rotulo={rotuloCobrindo}
        caso={caso}
        plano={plano}
        totais={totais}
        adequacao={resultado}
        gastoEnergetico={gastoEnergetico}
        restricoes={restricoes}
        aoAlterarCaso={aoAlterarCaso}
        aoFechar={() => setCobrindo(null)}
        aoAdicionar={(refeicaoId, opcao, alimentoId, gramas) => {
          aoAlterarPlano(adicionarItem(plano, refeicaoId, opcao, { alimentoId, gramas }, gerarId))
          setCobrindo(null)
        }}
      />
    </div>
  )
}
