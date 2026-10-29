import { MoreHorizontal, Trash } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { Receita } from '@/domain/receitas.ts'
import type { SugestaoAlimento, TipoRefeicao } from '@/domain/sugestoes.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDeItens } from '@/domain/totais.ts'
import type { MedidaCaseira } from '@/domain/busca.ts'
import type { ItemPlano, MedidaDoItem, ModoQuantidade, OpcaoId, Refeicao } from '@/domain/tipos.ts'
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
import { MarcaSemDado } from '../adequacao/MarcaSemDado.tsx'

const ROTULO_OPCAO: Record<OpcaoId, string> = { principal: 'Principal', substituto1: 'Substituto 1', substituto2: 'Substituto 2' }
const OPCOES_ORDEM: readonly OpcaoId[] = ['principal', 'substituto1', 'substituto2']

interface CartaoRefeicaoProps {
  readonly refeicao: Refeicao
  readonly aoRenomear: (nome: string) => void
  readonly aoMudarHorario: (horario: string) => void
  readonly aoRemover: () => void
  readonly aoAdicionarItem: (opcao: OpcaoId, alimentoId: number, gramas: number, medida?: MedidaDoItem | null) => void
  /** Põe uma receita da conta na opção (spec receitas-com-calculo, D-274). Sem ele, a busca mostra só alimentos. */
  readonly aoAdicionarReceita?: ((opcao: OpcaoId, receita: Receita, gramas: number) => void) | undefined
  readonly aoMudarGramas: (opcao: OpcaoId, itemId: string, gramas: number) => void
  readonly aoRemoverItem: (opcao: OpcaoId, itemId: string) => void
  /** Escolhe a medida do item (spec alimentos-e-gramaturas, G2 e G3). */
  readonly aoMudarMedida?: ((opcao: OpcaoId, itemId: string, medida: MedidaDoItem | null) => void) | undefined
  /** Como o paciente lê as quantidades (D-376). */
  readonly modo?: ModoQuantidade | undefined
  /** "+ Nova medida…" no seletor da linha (D-387) e na entrada rápida, com o nome da medida que faltou (D-432). */
  readonly aoCriarMedida?: ((alimentoId: number, aoCriar: (medida: MedidaCaseira) => void, nomeInicial?: string) => void) | undefined
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
  aoAdicionarReceita,
  aoMudarGramas,
  aoRemoverItem,
  aoMudarMedida,
  modo,
  aoCriarMedida,
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
  const energia = totaisDeItens(itens, buscarAlimento).nutrientes.energia_kcal
  const kcal = energia.total

  return (
    <Card className="gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* M-023: um relógio só, o do próprio campo de horário (como o horário da próxima consulta, na ficha), apagado
            como os outros ícones de campo. */}
        <Input
          type="time"
          aria-label={`Horário de ${refeicao.nome}`}
          value={horarioTexto}
          onChange={(e) => {
            setHorarioTexto(e.target.value)
            if (/^([01]\d|2[0-3]):[0-5]\d$/.test(e.target.value)) aoMudarHorario(e.target.value)
          }}
          onBlur={() => setHorarioTexto(refeicao.horario)}
          className="w-28 shrink-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60"
        />
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
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <span className="numeros text-sm font-semibold text-heading">{`${formatarNumero(kcal, 0)} kcal`}</span>
          {/* D-248: item sem o dado de energia (produto apagado) deixa o total possivelmente subestimado. */}
          <MarcaSemDado semDado={energia.semDado} />
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
      </div>

      {/* D-481 (correção C): no celular, as três abas dividem a largura, sem rolar ("Substitut…" ficava cortada). */}
      <div
        role="tablist"
        aria-label={`Opções de ${refeicao.nome}`}
        className="inline-flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-surfacerow p-1 max-sm:grid max-sm:w-full max-sm:grid-cols-3 max-sm:rounded-2xl"
      >
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
                'inline-flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9 sm:pointer-coarse:min-h-11',
                'max-sm:min-w-0 max-sm:justify-center max-sm:rounded-xl max-sm:px-1 max-sm:text-center max-sm:leading-tight max-[379px]:text-xs',
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
          aoAdicionar={(alimentoId, gramas, medida) => aoAdicionarItem(opcaoAtiva, alimentoId, gramas, medida)}
          aoAdicionarReceita={aoAdicionarReceita ? (receita, gramas) => aoAdicionarReceita(opcaoAtiva, receita, gramas) : undefined}
          aoCriarMedida={aoCriarMedida}
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
                aoMudarMedida={aoMudarMedida ? (medida) => aoMudarMedida(opcaoAtiva, item.id, medida) : undefined}
                modo={modo}
                aoCriarMedida={aoCriarMedida}
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
        aoAdicionar={(opcao, alimentoId, gramas, medida) => aoAdicionarItem(opcao, alimentoId, gramas, medida)}
      />
    </Card>
  )
}
