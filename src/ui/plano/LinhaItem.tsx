import { ArrowLeftRight, X } from 'lucide-react'
import { medidaEquivalente } from '@/domain/busca.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import type { ItemPlano } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { CampoNumero } from '../caso/CampoNumero.tsx'
import { Button } from '../componentes/button.tsx'

interface LinhaItemProps {
  readonly item: ItemPlano
  readonly aoMudarGramas: (gramas: number) => void
  readonly aoRemover: () => void
  /** Abre a calculadora de substituto; só existe no Principal (CA-41). */
  readonly aoSubstituir?: (() => void) | undefined
}

/** CA-19: gramas editáveis, medida caseira equivalente, kcal e remoção. */
export function LinhaItem({ item, aoMudarGramas, aoRemover, aoSubstituir }: LinhaItemProps) {
  const alimento = buscarAlimento(item.alimentoId)
  const descricao = alimento?.descricao ?? 'Alimento não encontrado'
  const medida = medidaEquivalente(item.alimentoId, item.gramas)
  const porCem = alimento?.nutrientes.energia_kcal ?? null
  // A tabela não traz energia deste alimento: mostra travessão, nunca zero (princípio do produto).
  const kcal = porCem === null ? null : (porCem * item.gramas) / 100

  return (
    <li className="flex items-center gap-3 border-b border-fio py-2 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground" title={descricao}>
          {descricao}
        </p>
        {medida ? <p className="text-xs text-muted-foreground">{medida.texto}</p> : null}
      </div>
      <div className="w-24 shrink-0">
        <CampoNumero
          rotulo={`Gramas de ${descricao}`}
          rotuloOculto
          valor={item.gramas}
          // CB-04: zero é aceito e não soma nada; negativo é ignorado.
          aoMudar={(v) => v !== null && v >= 0 && aoMudarGramas(v)}
          sufixo="g"
        />
      </div>
      <span
        className="numeros w-20 shrink-0 text-right text-sm font-medium text-heading"
        title={kcal === null ? 'A tabela de composição não traz energia para este alimento.' : undefined}
      >
        {kcal === null ? '— kcal' : `${formatarNumero(kcal, 0)} kcal`}
      </span>
      {aoSubstituir ? (
        <Button variant="ghost" size="iconsm" onClick={aoSubstituir} aria-label={`Substituir ${descricao}`}>
          <ArrowLeftRight aria-hidden="true" />
        </Button>
      ) : null}
      <Button variant="ghost" size="iconsm" onClick={aoRemover} aria-label={`Remover ${descricao}`}>
        <X aria-hidden="true" />
      </Button>
    </li>
  )
}
