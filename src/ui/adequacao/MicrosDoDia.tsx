import { useId, useMemo, useState } from 'react'
import { calcularAdequacao } from '@/domain/adequacao.ts'
import { arredondarNoEstado } from '@/domain/arredondarNoEstado.ts'
import { adicionarItem, type GerarId } from '@/domain/plano.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDoPlano } from '@/domain/totais.ts'
import type { Caso, ChaveNutrienteAlimento, Plano } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { GavetaCobrir } from './GavetaCobrir.tsx'
import { MarcaSemDado } from './MarcaSemDado.tsx'
import { podeCobrir } from './podeCobrir.ts'

interface MicrosDoDiaProps {
  readonly caso: Caso
  readonly plano: Plano
  readonly gastoEnergetico: number | null
  /** Restrições do paciente vinculado; filtram as sugestões do cobrir. */
  readonly restricoes?: readonly string[]
  readonly aoAlterarCaso: (mudanca: Partial<Caso>) => void
  readonly aoAlterarPlano: (novo: Plano) => void
  /** Leva à etapa 3, onde estão os 16. */
  readonly aoVerTodos: () => void
  readonly gerarId?: GerarId
}

/** Quantos abaixo da meta o cartão mostra: o resto está na etapa 3 (CB-203). */
const MAXIMO = 5

const idPadrao: GerarId = () => globalThis.crypto.randomUUID()

/**
 * O que falta de micronutriente, com o Cobrir, na coluna da etapa 2 (spec painel-lateral-enxuto, D-204).
 * Mostra só o que pede ação; os 16 estão na etapa 3.
 */
export function MicrosDoDia({ caso, plano, gastoEnergetico, restricoes = [], aoAlterarCaso, aoAlterarPlano, aoVerTodos, gerarId = idPadrao }: MicrosDoDiaProps) {
  const [cobrindo, setCobrindo] = useState<ChaveNutrienteAlimento | null>(null)
  const idMeta = useId()

  const totais = useMemo(() => totaisDoPlano(plano, buscarAlimento), [plano])
  const resultado = useMemo(() => calcularAdequacao(totais, caso, caso.adequacao.preset), [totais, caso])

  const vazio = plano.refeicoes.every((r) => r.opcoes.principal.length === 0)
  const total = resultado.linhas.length
  // Só o que se cobre (o sódio não entra, D-206), do mais longe para o mais perto da meta;
  // o sort é estável, então empate fica na ordem da tabela.
  const paraCobrir = resultado.linhas.filter(podeCobrir).sort((a, b) => a.adequacaoPct - b.adequacaoPct)
  const acima = resultado.linhas.filter((l) => l.estado === 'acima-limite')
  const rotuloCobrindo = resultado.linhas.find((l) => l.chave === cobrindo)?.rotulo ?? ''
  const metaPct = resultado.linhas[0]?.metaPct ?? null
  const mostrados = [...paraCobrir.slice(0, MAXIMO), ...acima]
  // O † precisa de explicação à vista: o title do † não abre por toque nem por teclado (CA-699).
  const temMarca = mostrados.some((l) => l.semDado > 0)

  const contagem =
    paraCobrir.length > 0
      ? `${paraCobrir.length} para cobrir.`
      : resultado.linhas.every((l) => l.estado === 'adequado')
        ? `Todos os ${total} na meta.`
        : 'Nada para cobrir.'

  return (
    <section aria-label="Micronutrientes" className="flex flex-col">
      <Card className="gap-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Micronutrientes</CardTitle>
          {resultado.motivoSemCalculo ? null : (
            <Button variant="ghost" size="sm" onClick={aoVerTodos}>
              Ver todos
            </Button>
          )}
        </div>

        {resultado.motivoSemCalculo ? (
          <p className="text-sm text-muted-foreground">{resultado.motivoSemCalculo}</p>
        ) : vazio ? (
          <p className="text-sm text-muted-foreground">O plano ainda não tem alimentos.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{contagem}</p>
            {/* A meta usada fica para o leitor de tela: na tela, a cor e o Cobrir já dizem que falta (CA-703). */}
            {metaPct === null ? null : (
              <span id={idMeta} className="sr-only">{`Adequação em % da referência; a meta é ${formatarNumero(metaPct, 0)}%.`}</span>
            )}
            {paraCobrir.length + acima.length > 0 ? (
              <ul aria-label="Fora da meta" aria-describedby={metaPct === null ? undefined : idMeta} className="flex flex-col">
                {paraCobrir.slice(0, MAXIMO).map((linha) => (
                  <li key={linha.chave} className="flex min-h-12 items-center gap-3 border-b border-border py-1.5 last:border-0">
                    <span className="min-w-0 flex-1 truncate text-sm text-heading">{linha.rotulo}</span>
                    <span className="flex items-baseline">
                      <span className="numeros text-sm font-semibold text-warningtext">{`${formatarNumero(arredondarNoEstado(linha.adequacaoPct, 'abaixo'), 0)}%`}</span>
                      <MarcaSemDado semDado={linha.semDado} />
                    </span>
                    <Button size="sm" variant="lightprimary" onClick={() => setCobrindo(linha.chave)} aria-label={`Cobrir ${linha.rotulo}`}>
                      Cobrir
                    </Button>
                  </li>
                ))}
                {acima.map((linha) => (
                  <li key={linha.chave} className="flex min-h-12 items-center gap-3 border-b border-border py-1.5 last:border-0">
                    <span className="min-w-0 flex-1 truncate text-sm text-heading">{linha.rotulo}</span>
                    <span className="numeros text-sm font-semibold text-errortext">{`${formatarNumero(linha.adequacaoPct, 0)}% · acima do limite`}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {temMarca ? (
              <p className="text-xs text-muted-foreground">
                <span className="mr-1 align-super text-[10px] font-semibold text-warningtext">†</span>
                <span>Total possivelmente subestimado: falta o dado em algum alimento.</span>
              </p>
            ) : null}
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
    </section>
  )
}
