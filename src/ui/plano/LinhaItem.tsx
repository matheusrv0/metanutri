import { ArrowLeftRight, X } from 'lucide-react'
import { medidaEquivalente } from '@/domain/busca.ts'
import { explicarCompletude } from '@/domain/completude.ts'
import { ehItemDeReceita, nomeDaReceita, receitaDoItem, textoDaPorcao } from '@/domain/receitaNoPlano.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDeItens } from '@/domain/totais.ts'
import type { ItemPlano } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'

interface LinhaItemProps {
  readonly item: ItemPlano
  readonly aoMudarGramas: (gramas: number) => void
  readonly aoRemover: () => void
  /** Abre a calculadora de substituto; só existe no Principal (CA-41). */
  readonly aoSubstituir?: (() => void) | undefined
}

/** A energia da receita pelos ingredientes; sem nenhum dado de energia, `null` (travessão, nunca zero). */
function kcalDaReceita(item: ItemPlano): number | null {
  const { total, semDado } = totaisDeItens([item], buscarAlimento).nutrientes.energia_kcal
  return semDado > 0 && total === 0 ? null : total
}

/**
 * CA-19: gramas editáveis, medida caseira equivalente, kcal e remoção. Spec receitas-com-calculo, CA-873: a receita
 * mostra o nome dela e "Receita · 1 unidade" embaixo, e não tem substituto.
 */
export function LinhaItem({ item, aoMudarGramas, aoRemover, aoSubstituir }: LinhaItemProps) {
  const deReceita = ehItemDeReceita(item)
  const receita = receitaDoItem(item)
  const alimento = deReceita ? undefined : buscarAlimento(item.alimentoId)
  const descricao = deReceita ? nomeDaReceita(receita) : (alimento?.descricao ?? 'Alimento não encontrado')
  const medidaTexto = deReceita
    ? ['Receita', receita ? textoDaPorcao(receita, item.gramas) : null].filter(Boolean).join(' · ')
    : (medidaEquivalente(item.alimentoId, item.gramas)?.texto ?? null)
  const incompleto = alimento ? explicarCompletude(alimento) : null
  const porCem = alimento?.nutrientes.energia_kcal ?? null
  // A tabela não traz energia deste alimento: mostra travessão, nunca zero (princípio do produto).
  const kcal = deReceita ? kcalDaReceita(item) : porCem === null ? null : (porCem * item.gramas) / 100
  const substituir = deReceita ? undefined : aoSubstituir

  return (
    // No celular o nome fica numa linha só e os controles descem; no desktop tudo na mesma linha.
    <li className="flex flex-col gap-1 border-b border-border py-2 last:border-0 sm:flex-row sm:items-center sm:gap-3">
      <div className="min-w-0 sm:flex-1">
        <p className="truncate text-sm text-foreground" title={incompleto ? `${descricao} — ${incompleto}` : descricao}>
          {descricao}
        </p>
        {medidaTexto ? <p className="truncate text-xs text-muted-foreground">{medidaTexto}</p> : null}
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
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
          className="numeros flex-1 text-sm font-medium text-heading sm:w-20 sm:flex-none sm:text-right"
          title={kcal === null ? 'A tabela de composição não traz energia para este alimento.' : undefined}
        >
          {kcal === null ? '— kcal' : `${formatarNumero(kcal, 0)} kcal`}
        </span>
        {substituir ? (
          <Button variant="ghost" size="iconsm" onClick={substituir} aria-label={`Substituir ${descricao}`}>
            <ArrowLeftRight aria-hidden="true" />
          </Button>
        ) : null}
        <Button variant="ghost" size="iconsm" onClick={aoRemover} aria-label={`Remover ${descricao}`}>
          <X aria-hidden="true" />
        </Button>
      </div>
    </li>
  )
}
