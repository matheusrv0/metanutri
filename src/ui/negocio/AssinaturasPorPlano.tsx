import { planoPorId } from '@/domain/conta.ts'
import type { LinhaDePlano, SituacoesDeAssinatura } from '@/domain/negocio.ts'
import { detalheDoPlano, inteiro, reais } from '@/domain/negocioTextos.ts'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { Progress } from '@ds/componentes/display/progress.tsx'

interface AssinaturasPorPlanoProps {
  readonly linhas: readonly LinhaDePlano[]
  readonly situacoes: SituacoesDeAssinatura
}

const plural = (n: number, um: string, varios: string) => `${inteiro(n)} ${n === 1 ? um : varios}`

/** CA-352 e CA-353. */
export function AssinaturasPorPlano({ linhas, situacoes }: AssinaturasPorPlanoProps) {
  const total = linhas.reduce((soma, l) => soma + l.centavosPorMes, 0)
  const ativas = linhas.reduce((soma, l) => soma + l.quantidade, 0)
  const selos = [
    situacoes.pendentes > 0 ? { texto: `${inteiro(situacoes.pendentes)} com pagamento pendente`, variante: 'lightWarning' as const } : null,
    situacoes.pausadas > 0 ? { texto: plural(situacoes.pausadas, 'pausada', 'pausadas'), variante: 'lightWarning' as const } : null,
    situacoes.canceladas30Dias > 0 ? { texto: `${plural(situacoes.canceladas30Dias, 'cancelada', 'canceladas')} em 30 dias`, variante: 'muted' as const } : null,
  ].filter((s) => s !== null)

  return (
    <section aria-labelledby="titulo-planos">
      <Card>
        <CardTitle id="titulo-planos">Assinaturas por plano</CardTitle>
        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma assinatura paga ainda.</p>
        ) : (
          // M-015 (spec ajustes-mobile): cabeçalho e linhas dividem as mesmas colunas (subgrid), e as de número crescem
          // com o maior valor; com 6rem fixos, "R$ 24.691.357,80" passava da coluna e da linha.
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(3rem,auto)_minmax(6rem,auto)] gap-x-3 gap-y-1.5">
            <p aria-hidden="true" className="col-span-3 grid grid-cols-subgrid px-3.5 text-2xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
              <span>Plano</span>
              <span className="text-right">Ativas</span>
              <span className="text-right">Por mês</span>
            </p>
            <ul className="col-span-3 grid grid-cols-subgrid gap-y-1.5">
              {linhas.map((l) => (
                <li key={l.chave} className="col-span-3 grid grid-cols-subgrid items-center gap-y-2 rounded-lg bg-surfacerow px-3.5 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="font-semibold text-heading">{planoPorId(l.plano)?.nome ?? l.plano}</span>{' '}
                    <span className="text-xs text-muted-foreground">{detalheDoPlano(l.plano, l.ciclo)}</span>
                  </span>
                  <span className="numeros text-right">{inteiro(l.quantidade)}</span>
                  <span className="numeros text-right font-semibold text-heading">{reais(l.centavosPorMes)}</span>
                  <Progress value={l.parte * 100} aria-label={`Parte do ${planoPorId(l.plano)?.nome ?? l.plano} ${l.ciclo} na receita`} className="col-span-3 h-1" />
                </li>
              ))}
            </ul>
            <p className="col-span-3 flex flex-wrap justify-between gap-x-3 px-3.5 pt-1 text-sm font-bold text-heading">
              <span>{plural(ativas, 'ativa', 'ativas')}</span>
              <span className="numeros">{reais(total)}</span>
            </p>
          </div>
        )}
        {selos.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selos.map((s) => (
              <Badge key={s.texto} variant={s.variante} dot>
                {s.texto}
              </Badge>
            ))}
          </div>
        ) : null}
      </Card>
    </section>
  )
}
