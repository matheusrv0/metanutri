import { Plus, Search } from 'lucide-react'
import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { buscarAlimentos, type ResultadoBusca } from '@/domain/busca.ts'
import { completudeDe, explicarCompletude } from '@/domain/completude.ts'
import { ID_DE_RECEITA, textoDaPorcao } from '@/domain/receitaNoPlano.ts'
import { buscarReceitas, copiaParaOPlano, type Receita, type ResultadoReceita } from '@/domain/receitas.ts'
import { alimentosComProdutos, buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDeItens } from '@/domain/totais.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { cn } from '@/lib/utils'
import { Input } from '@ds/componentes/forms/input.tsx'
import { useReceitas } from '../estado/usarReceitas.ts'

interface EntradaRapidaProps {
  readonly rotulo: string
  readonly aoAdicionar: (alimentoId: number, gramas: number) => void
  /**
   * Põe uma receita da conta (spec receitas-com-calculo, D-274). Sem ele, a busca mostra só alimentos: é assim no
   * editor de receita e na janela de substituto.
   */
  readonly aoAdicionarReceita?: ((receita: Receita, gramas: number) => void) | undefined
  /** Aparece embaixo do campo enquanto ele está vazio, como as sugestões da refeição (CA-307). */
  readonly quandoVazio?: ReactNode
}

// Alimento sem energia na tabela mostra travessão, nunca zero (princípio do produto).
const kcalDe = (r: ResultadoBusca, gramas: number): string => {
  const porCem = r.alimento.nutrientes.energia_kcal
  return porCem === null ? '— kcal' : `${formatarNumero((porCem * gramas) / 100, 0)} kcal`
}

/** "1 unidade · 120 g · 204 kcal": a porção (quando fecha em meias medidas), o peso e as kcal pelos ingredientes. */
function quantidadeDaReceita(r: ResultadoReceita): string {
  if (r.gramas === null) return r.aviso ?? 'medida indisponível'
  const copia = copiaParaOPlano(r.receita)
  const energia = totaisDeItens([{ id: 'busca', alimentoId: ID_DE_RECEITA, gramas: r.gramas, receita: copia }], buscarAlimento).nutrientes.energia_kcal
  const kcal = energia.semDado > 0 && energia.total === 0 ? '— kcal' : `${formatarNumero(energia.total, 0)} kcal`
  const porcao = textoDaPorcao(copia, r.gramas)
  return [porcao, `${formatarNumero(r.gramas, 0)} g`, kcal].filter(Boolean).join(' · ')
}

/** Diz, na hora de escolher, o quanto a tabela sabe sobre este alimento. */
function MarcaDeCompletude({ alimento }: { readonly alimento: ResultadoBusca['alimento'] }) {
  const { nivel } = completudeDe(alimento)
  if (nivel === 'completo') return null
  const explicacao = explicarCompletude(alimento) ?? ''
  return (
    <span
      className={cn('rotulo shrink-0', nivel === 'minimo' ? 'text-errortext' : 'text-warningtext')}
      title={explicacao}
    >
      {nivel === 'minimo' ? 'dado mínimo' : 'dado parcial'}
    </span>
  )
}

/** Uma linha da lista: um alimento da tabela ou uma receita da conta. */
type Opcao = { readonly tipo: 'alimento'; readonly r: ResultadoBusca } | { readonly tipo: 'receita'; readonly r: ResultadoReceita }

const chaveDa = (o: Opcao): string => (o.tipo === 'alimento' ? `a-${o.r.alimento.id}` : `r-${o.r.receita.id}`)

/** CA-15 a CA-18 e CA-20: digitar quantidade e nome, escolher com as setas e adicionar com Enter. */
export function EntradaRapida({ rotulo, aoAdicionar, aoAdicionarReceita, quandoVazio }: EntradaRapidaProps) {
  const [texto, setTexto] = useState('')
  const [selecionado, setSelecionado] = useState(0)
  const idLista = useId()
  const { lista: receitas } = useReceitas()

  const { resultados, aviso } = useMemo(() => buscarAlimentos(texto, alimentosComProdutos()), [texto])
  // D-274: só onde a receita pode entrar (a refeição); a que começa pelo termo vem antes dos alimentos.
  const daReceita = useMemo(() => (aoAdicionarReceita ? buscarReceitas(texto, receitas) : []), [aoAdicionarReceita, texto, receitas])
  const opcoes: readonly Opcao[] = [
    ...daReceita.filter((r) => r.antesDosAlimentos).map((r): Opcao => ({ tipo: 'receita', r })),
    ...resultados.map((r): Opcao => ({ tipo: 'alimento', r })),
    ...daReceita.filter((r) => !r.antesDosAlimentos).map((r): Opcao => ({ tipo: 'receita', r })),
  ]
  const escolhido = opcoes[Math.min(selecionado, opcoes.length - 1)]
  const avisoDaBusca = daReceita.length > 0 ? null : aviso
  const semResultado = texto.trim() !== '' && opcoes.length === 0

  const limpar = () => {
    setTexto('')
    setSelecionado(0)
  }

  const adicionar = (o: Opcao | undefined) => {
    if (!o) return
    // CB-07: medida que não existe para o alimento (ou que não é a da porção) não vira grama inventada.
    if (o.r.gramas === null) return
    if (o.tipo === 'receita') aoAdicionarReceita?.(o.r.receita, o.r.gramas)
    else aoAdicionar(o.r.alimento.id, o.r.gramas)
    limpar()
  }

  const aoTeclar = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelecionado((i) => Math.min(i + 1, opcoes.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelecionado((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      adicionar(escolhido)
    } else if (e.key === 'Escape') {
      limpar()
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          role="combobox"
          aria-label={rotulo}
          aria-expanded={opcoes.length > 0}
          aria-controls={idLista}
          aria-autocomplete="list"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setSelecionado(0)
          }}
          onKeyDown={aoTeclar}
          placeholder="150 arroz integral ou 2 colher de sopa feijão…"
          className="pl-10"
        />
      </div>

      {texto.trim() === '' ? quandoVazio : null}

      {avisoDaBusca ? <p className="text-xs text-warningtext">{avisoDaBusca}</p> : null}
      {semResultado && !avisoDaBusca ? <p className="text-xs text-warningtext">Nenhum alimento encontrado. Nada foi adicionado.</p> : null}

      {opcoes.length > 0 ? (
        <ul id={idLista} role="listbox" aria-label={`Resultados para ${rotulo}`} className="flex flex-col border border-borderdefault bg-card">
          {opcoes.map((o, i) => {
            const atual = o === escolhido
            return (
              <li key={chaveDa(o)}>
                <button
                  type="button"
                  role="option"
                  aria-selected={atual}
                  onClick={() => adicionar(o)}
                  onMouseEnter={() => setSelecionado(i)}
                  className={cn(
                    'flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-sm transition-colors last:border-0',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    atual ? 'bg-lightprimary text-primary' : 'hover:bg-muted',
                  )}
                >
                  <Plus className="size-4 shrink-0" aria-hidden="true" />
                  {o.tipo === 'receita' ? (
                    <>
                      <span className="min-w-0 flex-1 truncate">{o.r.receita.nome}</span>
                      <span className="rotulo shrink-0 text-muted-foreground">Receita</span>
                      <span className="numeros shrink-0 text-xs text-muted-foreground">{quantidadeDaReceita(o.r)}</span>
                    </>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate">{o.r.alimento.descricao}</span>
                      <MarcaDeCompletude alimento={o.r.alimento} />
                      <span className="numeros shrink-0 text-xs text-muted-foreground">
                        {o.r.gramas === null
                          ? o.r.aviso ?? 'medida indisponível'
                          : `${formatarNumero(o.r.gramas, 0)} g${o.r.medida ? ` · ${o.r.medida.quantidade} ${o.r.medida.nome}` : ''} · ${kcalDe(o.r, o.r.gramas)}`}
                      </span>
                    </>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
