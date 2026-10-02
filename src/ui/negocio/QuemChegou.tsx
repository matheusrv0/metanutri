import type { EtapaDoFunil, UsoNoPainel } from '@/domain/negocio.ts'
import { inteiro, porcentagem } from '@/domain/negocioTextos.ts'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { Progress } from '@ds/componentes/display/progress.tsx'

interface QuemChegouProps {
  readonly funil: readonly EtapaDoFunil[]
  readonly uso: UsoNoPainel
}

/** CA-354 e CA-355. A porcentagem é sobre quem criou conta (D-62). */
export function QuemChegou({ funil, uso }: QuemChegouProps) {
  const base = funil[0]?.quantidade ?? 0
  return (
    <section aria-labelledby="titulo-funil">
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <CardTitle id="titulo-funil">Quem chegou nos últimos 30 dias</CardTitle>
          <p className="text-xs text-muted-foreground">A porcentagem é sobre quem criou conta.</p>
        </div>
        <ol aria-label="Etapas" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {funil.map((e) => (
            <li key={e.chave} className="flex flex-col gap-1.5">
              <span className="numeros font-titulo text-2xl font-bold text-heading">{inteiro(e.quantidade)}</span>
              <Progress value={base === 0 ? 0 : (e.quantidade / base) * 100} aria-label={e.rotulo} className="h-2.5" />
              <span className="text-sm text-muted-foreground">
                {e.rotulo}
                {e.parte !== null ? (
                  <>
                    {' · '}
                    <strong className="font-semibold text-foreground">{porcentagem(e.parte)}</strong>
                  </>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
        <ul className="grid gap-2 sm:grid-cols-2">
          <li className="flex items-baseline justify-between gap-3 rounded-lg bg-surfacerow px-3.5 py-2.5 text-sm">
            <span>Links de missões criados em 30 dias</span>
            <strong className="numeros text-heading">{inteiro(uso.links30Dias)}</strong>
          </li>
          <li className="flex items-baseline justify-between gap-3 rounded-lg bg-surfacerow px-3.5 py-2.5 text-sm">
            <span>Contas que atualizaram a cópia na nuvem em 30 dias</span>
            <strong className="numeros text-heading">{inteiro(uso.copias30Dias)}</strong>
          </li>
        </ul>
      </Card>
    </section>
  )
}
