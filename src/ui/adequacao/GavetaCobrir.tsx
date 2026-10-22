import { EyeOff, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ResultadoAdequacao } from '@/domain/adequacao.ts'
import { refeicaoIndicada, sugerirParaCobrir } from '@/domain/cobrir.ts'
import { quantidadeNoPlano } from '@/domain/formatarQuantidade.ts'
import { PRIMEIRO_ID_PROPRIO } from '@/domain/busca.ts'
import { alimentosParaSugerir, buscarAlimento } from '@/domain/tabelas.ts'
import type { Totais } from '@/domain/totais.ts'
import type { Caso, ChaveNutrienteAlimento, MedidaDoItem, OpcaoId, Plano } from '@/domain/tipos.ts'
import { chaveDasRestricoes, comoRestricoes, SEM_RESTRICOES, type RestricoesDoPaciente } from '@/domain/restricoes.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { CampoPorcaoMaxima } from './CampoPorcaoMaxima.tsx'
import { useArmazenamento } from '../estado/contextoArmazenamento.ts'
import { lerOcultosGlobais, ocultarGlobalmente } from '../estado/ocultosGlobais.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@ds/componentes/overlay/sheet.tsx'
import { Switch } from '@ds/componentes/forms/switch.tsx'
import { aberturaDoCobrir, descreverAvisos, porcaoDaSugestao } from './estiloAdequacao.ts'

interface GavetaCobrirProps {
  /** Nutriente a cobrir; `null` mantém a gaveta fechada. */
  readonly chave: ChaveNutrienteAlimento | null
  readonly rotulo: string
  readonly caso: Caso
  readonly plano: Plano
  readonly totais: Totais
  readonly adequacao: ResultadoAdequacao
  readonly gastoEnergetico: number | null
  /** O que o paciente não come; a sugestão que casar com qualquer termo é descartada. */
  readonly restricoes?: RestricoesDoPaciente | readonly string[] | undefined
  readonly aoAlterarCaso: (mudanca: Partial<Caso>) => void
  /** Põe a sugestão na refeição, com a medida da porção (spec alimentos-e-gramaturas, G8). */
  readonly aoAdicionar: (refeicaoId: string, opcao: OpcaoId, alimentoId: number, gramas: number, medida: MedidaDoItem | null) => void
  readonly aoFechar: () => void
  /**
   * Para onde vai o foco quando a gaveta fecha (D-212). A gaveta abre por estado, sem gatilho próprio: sem isto o foco
   * cairia no corpo da página.
   */
  readonly focoAoFechar?: () => HTMLElement | null
}

/** Quanto cabe até o gasto; com o plano acima dele, quanto já passou, sem número negativo (CA-694). */
function fraseDoGasto(kcalDisponiveis: number | null): string {
  if (kcalDisponiveis === null) return ''
  const kcal = Math.round(kcalDisponiveis)
  return kcal < 0
    ? ` O plano já ultrapassa o gasto energético em ${formatarNumero(-kcal, 0)} kcal.`
    : ` Ainda cabem ${formatarNumero(Math.max(kcal, 0), 0)} kcal até o gasto energético.`
}

/** CA-34 a CA-40: sugestões de alimentos para cobrir a falta de um micronutriente. */
export function GavetaCobrir({
  chave,
  rotulo,
  caso,
  plano,
  totais,
  adequacao,
  gastoEnergetico,
  restricoes = SEM_RESTRICOES,
  aoAlterarCaso,
  aoAdicionar,
  aoFechar,
  focoAoFechar,
}: GavetaCobrirProps) {
  const { adequacao: prefs } = caso
  // D-441 (spec sugestoes-com-criterio): vazio é "Refeição de cada alimento"; cada sugestão vai para a refeição dela.
  const [refeicaoId, setRefeicaoId] = useState('')
  const escolhida = plano.refeicoes.find((r) => r.id === refeicaoId) ?? null
  const [opcao] = useState<OpcaoId>('principal')
  const [versaoOcultos, setVersaoOcultos] = useState(0)
  const armazenamento = useArmazenamento()
  // As restrições chegam num objeto novo a cada renderização; a chave delas é a dependência estável (revisão N7).
  const doPaciente = comoRestricoes(restricoes)
  const chaveRestricoes = chaveDasRestricoes(doPaciente)

  const resultado = useMemo(
    () =>
      chave === null
        ? null
        : sugerirParaCobrir(chave, totais, adequacao, {
            // D-386 (spec alimentos-e-gramaturas): a base e os alimentos próprios com a chave ligada.
            alimentos: alimentosParaSugerir(),
            gastoEnergetico,
            porcaoMaximaG: prefs.porcaoMaximaG,
            // D-439: a porção do grupo encolhe na criança e no adolescente.
            idadeAnos: caso.idadeAnos,
            incluirIngredientes: prefs.incluirIngredientes,
            // Junta o que foi escondido neste caso com o que vale para o aparelho inteiro.
            ocultos: new Set([...prefs.ocultos, ...lerOcultosGlobais(armazenamento)]),
            // A restrição filtra antes da escolha das 5 (spec sugestoes-com-criterio, CA-675).
            restricoes: doPaciente,
          }),
    // versaoOcultos força recalcular quando a pessoa esconde uma sugestão
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chave, totais, adequacao, gastoEnergetico, prefs, caso.idadeAnos, versaoOcultos, armazenamento, chaveRestricoes],
  )

  const ocultar = (alimentoId: number) => {
    ocultarGlobalmente(armazenamento, alimentoId)
    setVersaoOcultos((v) => v + 1)
  }

  return (
    <Sheet open={chave !== null} onOpenChange={(v) => !v && aoFechar()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-4 overflow-y-auto p-6 sm:max-w-md"
        onCloseAutoFocus={(evento) => {
          const destino = focoAoFechar?.() ?? null
          if (destino === null) return
          evento.preventDefault()
          destino.focus()
        }}
      >
        <SheetTitle className="pr-10">{`Cobrir ${rotulo}`}</SheetTitle>
        <SheetDescription>
          {/* CA-791: a falta com a mesma precisão da tabela da etapa 3 ("244 mg", não "243,60 mg"). */}
          {/* D-459 (spec ficha-unica): a abertura diz quanto o plano tem, na mesma forma da tabela. */}
          {resultado
            ? `${aberturaDoCobrir(adequacao.linhas.find((l) => l.chave === chave))}Faltam ${quantidadeNoPlano(resultado.falta)} ${resultado.unidade} para a meta.${fraseDoGasto(resultado.kcalDisponiveis)}`
            : ''}
        </SheetDescription>

        <div className="flex flex-col gap-3 border border-border bg-muted p-4">
          <CampoPorcaoMaxima valor={prefs.porcaoMaximaG} aoMudar={(porcaoMaximaG) => aoAlterarCaso({ adequacao: { ...prefs, porcaoMaximaG } })} />
          <label className="flex items-center justify-between gap-3 text-sm max-sm:min-h-11">
            <span>Incluir ingredientes e alimentos crus</span>
            <Switch
              checked={prefs.incluirIngredientes}
              onCheckedChange={(v) => aoAlterarCaso({ adequacao: { ...prefs, incluirIngredientes: v } })}
              aria-label="Incluir ingredientes e alimentos crus"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="refeicao-destino">
            Adicionar em
          </label>
          <select
            id="refeicao-destino"
            value={refeicaoId}
            onChange={(e) => setRefeicaoId(e.target.value)}
            className="h-11 rounded-md border border-input bg-card px-3 text-base sm:h-10 sm:text-sm"
          >
            <option value="">Refeição de cada alimento</option>
            {plano.refeicoes.map((r) => (
              <option key={r.id} value={r.id}>
                {`${r.horario} ${r.nome}`}
              </option>
            ))}
          </select>
        </div>

        {resultado?.motivoSemSugestao ? (
          <Alert variant="warning">
            <TriangleAlert aria-hidden="true" />
            <p>{resultado.motivoSemSugestao}</p>
          </Alert>
        ) : null}

        <ul aria-label="Sugestões para cobrir" className="flex flex-col gap-3">
          {(resultado?.sugestoes ?? []).map((s) => {
            // G8 (spec alimentos-e-gramaturas): a porção em meia medida caseira, o peso e a unidade (ml no líquido).
            const alimento = buscarAlimento(s.alimentoId)
            // D-474 (correção C): o que o paciente lê pelo peso cru diz "(peso cru)" também aqui.
            const porcao = porcaoDaSugestao(s, alimento)
            const destino = escolhida ?? (alimento ? refeicaoIndicada(plano, alimento) : null) ?? plano.refeicoes[0] ?? null
            return (
              <li key={s.alimentoId} className="flex flex-col gap-2 border-b border-border pb-3 last:border-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-heading">
                  <span className="min-w-0">{s.descricao}</span>
                  {s.alimentoId >= PRIMEIRO_ID_PROPRIO ? <span className="rotulo shrink-0 text-muted-foreground">meu</span> : null}
                </p>
                <p className="numeros text-sm text-muted-foreground">
                  {`${porcao} · cobre ${formatarNumero(s.coberturaPct, 0)}% da falta · +${formatarNumero(
                    s.kcalAdicionadas,
                    0,
                  )} kcal`}
                </p>
                {descreverAvisos(s).map((a) => (
                  <p key={a} className="text-xs text-warningtext">
                    {a}
                  </p>
                ))}
                <div className="flex flex-wrap gap-2">
                  {destino ? (
                    <Button size="sm" onClick={() => aoAdicionar(destino.id, opcao, s.alimentoId, s.gramas, s.medida)}>
                      {`Adicionar em ${destino.nome}`}
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => ocultar(s.alimentoId)} aria-label={`Nunca sugerir ${s.descricao}`}>
                    <EyeOff aria-hidden="true" />
                    Nunca sugerir
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      </SheetContent>
    </Sheet>
  )
}
