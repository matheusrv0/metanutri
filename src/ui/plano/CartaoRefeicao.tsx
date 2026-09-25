import { Clock, Trash } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDeItens } from '@/domain/totais.ts'
import type { ItemPlano, OpcaoId, Refeicao } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { cn } from '@/lib/utils'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card } from '@ds/componentes/display/card.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { DialogoSubstituto } from './DialogoSubstituto.tsx'
import { EntradaRapida } from './EntradaRapida.tsx'
import { LinhaItem } from './LinhaItem.tsx'

const ROTULO_OPCAO: Record<OpcaoId, string> = { principal: 'Principal', substituto1: 'Substituto 1', substituto2: 'Substituto 2' }
const OPCOES_ORDEM: readonly OpcaoId[] = ['principal', 'substituto1', 'substituto2']

interface CartaoRefeicaoProps {
  readonly refeicao: Refeicao
  readonly aoRenomear: (nome: string) => void
  readonly aoMudarHorario: (horario: string) => void
  readonly aoRemover: () => void
  readonly aoAdicionarItem: (opcao: OpcaoId, alimentoId: number, gramas: number) => void
  readonly aoMudarGramas: (opcao: OpcaoId, itemId: string, gramas: number) => void
  readonly aoRemoverItem: (opcao: OpcaoId, itemId: string) => void
  /** Conteúdo extra no fim de uma opção de substituto (calculadora de equivalência). */
  readonly extraDaOpcao?: (opcao: OpcaoId) => ReactNode
}

/** CA-13 e CA-14: refeição com nome, horário e três opções em abas. */
export function CartaoRefeicao({
  refeicao,
  aoRenomear,
  aoMudarHorario,
  aoRemover,
  aoAdicionarItem,
  aoMudarGramas,
  aoRemoverItem,
  extraDaOpcao,
}: CartaoRefeicaoProps) {
  const [opcaoAtiva, setOpcaoAtiva] = useState<OpcaoId>('principal')
  const [itemParaSubstituir, setItemParaSubstituir] = useState<ItemPlano | null>(null)
  // O domínio recusa nome vazio e horário inválido; o texto fica local até ficar válido.
  const [nomeTexto, setNomeTexto] = useState(refeicao.nome)
  const [nomeConhecido, setNomeConhecido] = useState(refeicao.nome)
  if (refeicao.nome !== nomeConhecido) {
    setNomeConhecido(refeicao.nome)
    setNomeTexto(refeicao.nome)
  }
  const [horarioTexto, setHorarioTexto] = useState(refeicao.horario)
  const [horarioConhecido, setHorarioConhecido] = useState(refeicao.horario)
  if (refeicao.horario !== horarioConhecido) {
    setHorarioConhecido(refeicao.horario)
    setHorarioTexto(refeicao.horario)
  }
  const itens = refeicao.opcoes[opcaoAtiva]
  const kcal = totaisDeItens(itens, buscarAlimento).nutrientes.energia_kcal.total

  return (
    <Card className="gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-32 shrink-0">
          <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="time"
            aria-label={`Horário de ${refeicao.nome}`}
            value={horarioTexto}
            onChange={(e) => {
              setHorarioTexto(e.target.value)
              if (/^([01]\d|2[0-3]):[0-5]\d$/.test(e.target.value)) aoMudarHorario(e.target.value)
            }}
            onBlur={() => setHorarioTexto(refeicao.horario)}
            className="pl-9"
          />
        </div>
        <Input
          aria-label={`Nome da refeição ${refeicao.nome}`}
          value={nomeTexto}
          onChange={(e) => {
            setNomeTexto(e.target.value)
            if (e.target.value.trim() !== '') aoRenomear(e.target.value)
          }}
          onBlur={() => setNomeTexto(refeicao.nome)}
          className="min-w-40 flex-1"
        />
        <Button variant="ghost" size="icon" className="ml-auto" onClick={aoRemover} aria-label={`Remover refeição ${refeicao.nome}`}>
          <Trash aria-hidden="true" />
        </Button>
      </div>

      <div role="tablist" aria-label={`Opções de ${refeicao.nome}`} className="flex flex-wrap border-b border-borderdefault">
        {OPCOES_ORDEM.map((o) => {
          const ativa = o === opcaoAtiva
          const quantos = refeicao.opcoes[o].length
          return (
            <button
              key={o}
              type="button"
              role="tab"
              aria-selected={ativa}
              onClick={() => setOpcaoAtiva(o)}
              className={cn(
                '-mb-px flex-1 border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                ativa ? 'border-surfaceinverse font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {ROTULO_OPCAO[o]}
              {quantos > 0 ? ` (${quantos})` : ''}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" aria-label={`${ROTULO_OPCAO[opcaoAtiva]} de ${refeicao.nome}`} className="flex flex-col gap-3">
        <EntradaRapida
          rotulo={`Adicionar alimento em ${ROTULO_OPCAO[opcaoAtiva]} de ${refeicao.nome}`}
          aoAdicionar={(alimentoId, gramas) => aoAdicionarItem(opcaoAtiva, alimentoId, gramas)}
          comAtalhos
        />

        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum alimento nesta opção.</p>
        ) : (
          <ul aria-label={`Alimentos em ${ROTULO_OPCAO[opcaoAtiva]} de ${refeicao.nome}`} className="flex flex-col">
            {itens.map((item) => (
              <LinhaItem
                key={item.id}
                item={item}
                aoMudarGramas={(g) => aoMudarGramas(opcaoAtiva, item.id, g)}
                aoRemover={() => aoRemoverItem(opcaoAtiva, item.id)}
                aoSubstituir={opcaoAtiva === 'principal' ? () => setItemParaSubstituir(item) : undefined}
              />
            ))}
          </ul>
        )}

        {opcaoAtiva === 'principal' ? null : (
          <p className="text-xs text-muted-foreground">Os substitutos não entram na soma do dia nem na adequação.</p>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <span className="text-sm text-muted-foreground">Total desta opção</span>
          <span className="numeros text-sm font-semibold text-heading">{`${formatarNumero(kcal, 0)} kcal`}</span>
        </div>

        {extraDaOpcao?.(opcaoAtiva)}
      </div>

      <DialogoSubstituto
        item={itemParaSubstituir}
        aoFechar={() => setItemParaSubstituir(null)}
        aoAdicionar={(opcao, alimentoId, gramas) => aoAdicionarItem(opcao, alimentoId, gramas)}
      />
    </Card>
  )
}
