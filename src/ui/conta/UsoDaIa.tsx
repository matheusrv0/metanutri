import { useEffect } from 'react'
import { mesDe, renovacaoDoUso } from '@/domain/iaLimites.ts'
import { Progress } from '@ds/componentes/display/progress.tsx'
import { useSugestaoIa, type DependenciasDaSugestao } from '../estado/usarSugestaoIa.ts'

interface UsoDaIaProps {
  readonly agora: Date
  /** Para os testes: a função falsa. */
  readonly dependencias?: DependenciasDaSugestao | undefined
}

/**
 * Spec assistente-ia, D-1321 e D-1354: a linha "Sugestões com IA · 7 de 20 em novembro · Renovam em 1º de dezembro", com
 * a barra. Pede o contador ao abrir; sem resposta, a linha não aparece (CB-1321).
 */
export function UsoDaIa({ agora, dependencias }: UsoDaIaProps) {
  const { uso, lerUso } = useSugestaoIa(dependencias)
  useEffect(() => {
    lerUso()
    // Uma leitura ao abrir a tela; as seguintes vêm da gaveta.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lerUso muda a cada desenho e a leitura é só a da abertura
  }, [])
  if (!uso) return null
  const mes = mesDe(agora)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 rounded-3xl bg-surfacerow p-4 sm:grid-cols-[10rem_minmax(0,1fr)_auto]">
      <p className="text-sm text-foreground">Sugestões com IA</p>
      <p className="numeros text-right text-sm text-muted-foreground sm:order-last">{renovacaoDoUso(uso)}</p>
      <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
        <p className="numeros text-sm font-semibold text-heading">{`${uso.usados} de ${uso.limite} em ${mes}`}</p>
        <Progress value={uso.limite > 0 ? (uso.usados / uso.limite) * 100 : 0} className="h-1" aria-label={`${uso.usados} de ${uso.limite} sugestões com IA em ${mes}`} />
      </div>
    </div>
  )
}
