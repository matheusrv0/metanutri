import { Clock, MoreHorizontal, Trash } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { SugestaoAlimento, TipoRefeicao } from '@/domain/sugestoes.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDeItens } from '@/domain/totais.ts'
import type { ItemPlano, OpcaoId, Refeicao } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { cn } from '@/lib/utils'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card } from '@ds/componentes/display/card.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ds/componentes/overlay/dropdown-menu.tsx'
import { DialogoSugestoes } from './DialogoSugestoes.tsx'
import { DialogoSubstituto } from './DialogoSubstituto.tsx'
import { EntradaRapida } from './EntradaRapida.tsx'
import { LinhaItem } from './LinhaItem.tsx'
import { SugestoesDaRefeicao } from './SugestoesDaRefeicao.tsx'

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
  /** Tipo da refeição, pelo nome ou pelo horário (CA-239, CA-240). */
  readonly tipo: TipoRefeicao
  /** A lista de sugestões que vale para esse tipo (CA-237). */
  readonly sugestoes: readonly SugestaoAlimento[]
  /** Grava a lista do tipo; `false` quando o aparelho não guardou (CB-70). */
  readonly aoSalvarSugestoes: (lista: readonly SugestaoAlimento[]) => boolean
  /** Conteúdo extra no fim de uma opção de substituto (calculadora de equivalência). */
  readonly extraDaOpcao?: (opcao: OpcaoId) => ReactNode
}

/** CA-13, CA-14 e CA-334: refeição com horário, nome, kcal da opção aberta e três opções. */
export function CartaoRefeicao({
  refeicao,
  aoRenomear,
  aoMudarHorario,
  aoRemover,
  aoAdicionarItem,
  aoMudarGramas,
  aoRemoverItem,
  tipo,
  sugestoes,
  aoSalvarSugestoes,
  extraDaOpcao,
}: CartaoRefeicaoProps) {
  const [opcaoAtiva, setOpcaoAtiva] = useState<OpcaoId>('principal')
  const [itemParaSubstituir, setItemParaSubstituir] = useState<ItemPlano | null>(null)
  const [editandoSugestoes, setEditandoSugestoes] = useState(false)
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
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-28 shrink-0">
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
          className="min-w-32 flex-1 font-semibold"
        />
        <span className="numeros ml-auto shrink-0 text-sm font-semibold text-heading">{`${formatarNumero(kcal, 0)} kcal`}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Mais ações de ${refeicao.nome}`}>
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={aoRemover}>
              <Trash aria-hidden="true" />
              Remover refeição
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div role="tablist" aria-label={`Opções de ${refeicao.nome}`} className="inline-flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-surfacerow p-1">
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
                'inline-flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9',
                ativa ? 'bg-card text-heading shadow-xs' : 'text-muted-foreground hover:text-foreground',
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
          quandoVazio={
            <SugestoesDaRefeicao
              tipo={tipo}
              sugestoes={sugestoes}
              aoEditar={() => setEditandoSugestoes(true)}
              aoEscolher={(alimentoId, gramas) => aoAdicionarItem(opcaoAtiva, alimentoId, gramas)}
            />
          }
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

        {extraDaOpcao?.(opcaoAtiva)}
      </div>

      {editandoSugestoes ? (
        <DialogoSugestoes tipo={tipo} lista={sugestoes} aoSalvar={aoSalvarSugestoes} aoFechar={() => setEditandoSugestoes(false)} />
      ) : null}

      <DialogoSubstituto
        item={itemParaSubstituir}
        aoFechar={() => setItemParaSubstituir(null)}
        aoAdicionar={(opcao, alimentoId, gramas) => aoAdicionarItem(opcao, alimentoId, gramas)}
      />
    </Card>
  )
}
