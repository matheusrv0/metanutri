import { Plus, Search } from 'lucide-react'
import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { buscarAlimentos, leituraDoResultado, PRIMEIRO_ID_PROPRIO, type MedidaCaseira, type ResultadoBusca } from '@/domain/busca.ts'
import { completudeDe, explicarCompletude } from '@/domain/completude.ts'
import { ID_DE_RECEITA, textoDaPorcao } from '@/domain/receitaNoPlano.ts'
import { buscarReceitas, copiaParaOPlano, type Receita, type ResultadoReceita } from '@/domain/receitas.ts'
import { alimentosComProdutos, buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDeItens } from '@/domain/totais.ts'
import type { MedidaDoItem } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { cn } from '@/lib/utils'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { useReceitas } from '../estado/usarReceitas.ts'
import { useUsoDaConta } from '../estado/usarUsoDaConta.ts'

interface EntradaRapidaProps {
  readonly rotulo: string
  /** Põe o alimento; com a medida que a pessoa digitou ou a das unidades (spec alimentos-e-gramaturas, G1 e D-371). */
  readonly aoAdicionar: (alimentoId: number, gramas: number, medida?: MedidaDoItem) => void
  /**
   * Põe uma receita da conta (spec receitas-com-calculo, D-274). Sem ele, a busca mostra só alimentos: é assim no
   * editor de receita e na janela de substituto.
   */
  readonly aoAdicionarReceita?: ((receita: Receita, gramas: number) => void) | undefined
  /** Aparece embaixo do campo enquanto ele está vazio, como as sugestões da refeição (CA-307). */
  readonly quandoVazio?: ReactNode
  /**
   * "+ Nova medida" para a medida digitada que o alimento não tem (spec alimentos-e-gramaturas, correção A, D-432): abre
   * a janela com o nome escrito; ao salvar, o alimento entra na medida nova.
   */
  readonly aoCriarMedida?: ((alimentoId: number, aoCriar: (medida: MedidaCaseira) => void, nomeInicial?: string) => void) | undefined
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
      {nivel === 'minimo' ? 'poucos nutrientes' : 'parte dos nutrientes'}
    </span>
  )
}

/** Uma linha da lista: um alimento da tabela ou uma receita da conta. */
type Opcao = { readonly tipo: 'alimento'; readonly r: ResultadoBusca } | { readonly tipo: 'receita'; readonly r: ResultadoReceita }

const chaveDa = (o: Opcao): string => (o.tipo === 'alimento' ? `a-${o.r.alimento.id}` : `r-${o.r.receita.id}`)

/** CA-15 a CA-18 e CA-20: digitar quantidade e nome, escolher com as setas e adicionar com Enter. */
export function EntradaRapida({ rotulo, aoAdicionar, aoAdicionarReceita, quandoVazio, aoCriarMedida }: EntradaRapidaProps) {
  const [texto, setTexto] = useState('')
  const [selecionado, setSelecionado] = useState(0)
  // D-432: Enter numa linha sem a medida não fica calado.
  const [nadaAdicionado, setNadaAdicionado] = useState(false)
  const idLista = useId()
  const { lista: receitas } = useReceitas()

  // D-370 (spec alimentos-e-gramaturas): o que a conta mais usa vem primeiro; os planos só são lidos quando há texto.
  const uso = useUsoDaConta(texto.trim() !== '')
  const { resultados, aviso } = useMemo(() => buscarAlimentos(texto, alimentosComProdutos(), { uso }), [texto, uso])
  // D-274: só onde a receita pode entrar (a refeição); a que começa pelo termo vem antes dos alimentos.
  const daReceita = useMemo(
    () => (aoAdicionarReceita ? buscarReceitas(texto, receitas, resultados.map((r) => r.alimento)) : []),
    [aoAdicionarReceita, texto, receitas, resultados],
  )
  const opcoes: readonly Opcao[] = [
    ...daReceita.filter((r) => r.antesDosAlimentos).map((r): Opcao => ({ tipo: 'receita', r })),
    ...resultados.map((r): Opcao => ({ tipo: 'alimento', r })),
    ...daReceita.filter((r) => !r.antesDosAlimentos).map((r): Opcao => ({ tipo: 'receita', r })),
  ]
  const escolhido = opcoes[Math.min(selecionado, opcoes.length - 1)]
  const avisoDaBusca = daReceita.length > 0 ? null : aviso
  const semResultado = texto.trim() !== '' && opcoes.length === 0
  // D-432: a linha escolhida pede uma medida que o alimento não tem.
  const semAMedida = escolhido?.tipo === 'alimento' && escolhido.r.gramas === null && escolhido.r.faltaMedida ? { alimento: escolhido.r.alimento, falta: escolhido.r.faltaMedida } : null

  const limpar = () => {
    setTexto('')
    setSelecionado(0)
    setNadaAdicionado(false)
  }

  const adicionar = (o: Opcao | undefined) => {
    if (!o) return
    // CB-07: medida que não existe para o alimento (ou que não é a da porção) não vira grama inventada; a tela diz.
    if (o.r.gramas === null) {
      setNadaAdicionado(true)
      return
    }
    if (o.tipo === 'receita') aoAdicionarReceita?.(o.r.receita, o.r.gramas)
    else if (o.r.medida) aoAdicionar(o.r.alimento.id, o.r.gramas, o.r.medida)
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
            setNadaAdicionado(false)
          }}
          onKeyDown={aoTeclar}
          placeholder="1 concha de feijão ou 150 arroz…"
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
                  onMouseEnter={() => {
                    setSelecionado(i)
                    setNadaAdicionado(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-sm transition-colors last:border-0',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    atual ? 'bg-lightprimary text-primary' : 'hover:bg-muted',
                  )}
                >
                  <Plus className="size-4 shrink-0" aria-hidden="true" />
                  {o.tipo === 'receita' ? (
                    // No celular, o nome numa linha e "Receita" com a quantidade embaixo: o nome não some.
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                      <span className="min-w-0 truncate sm:flex-1">{o.r.receita.nome}</span>
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="rotulo shrink-0 text-muted-foreground">Receita</span>
                        <span className="numeros min-w-0 truncate text-xs text-muted-foreground">{quantidadeDaReceita(o.r)}</span>
                      </span>
                    </span>
                  ) : o.r.gramas === null ? (
                    // D-432: sem a medida, o nome fica inteiro e o aviso vai numa linha própria, em qualquer largura.
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="min-w-0 break-words">{o.r.alimento.descricao}</span>
                      <span className="text-xs text-warningtext">{o.r.aviso ?? 'Medida indisponível.'}</span>
                    </span>
                  ) : (
                    <>
                      {/* No celular, o nome numa linha e a leitura embaixo: "1 concha e meia · 210 g · 160 kcal" (D-373). */}
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                        <span className="min-w-0 truncate sm:flex-1">{o.r.alimento.descricao}</span>
                        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                          {o.r.alimento.id >= PRIMEIRO_ID_PROPRIO ? <span className="rotulo shrink-0 text-muted-foreground">meu</span> : null}
                          <MarcaDeCompletude alimento={o.r.alimento} />
                          <span className="numeros min-w-0 whitespace-nowrap text-xs text-muted-foreground">{`${leituraDoResultado(o.r) ?? ''} · ${kcalDe(o.r, o.r.gramas)}`}</span>
                        </span>
                      </span>
                    </>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      {semAMedida || nadaAdicionado ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {nadaAdicionado ? (
            <p role="alert" className="text-xs font-medium text-warningtext">
              {semAMedida ? 'Nada foi adicionado: digite em gramas ou crie a medida.' : 'Nada foi adicionado: digite em gramas.'}
            </p>
          ) : null}
          {semAMedida && aoCriarMedida ? (
            <Button
              type="button"
              size="sm"
              variant="lightprimary"
              aria-label={`Nova medida “${semAMedida.falta.nome}” para ${semAMedida.alimento.descricao}`}
              onClick={() =>
                aoCriarMedida(
                  semAMedida.alimento.id,
                  (m) => {
                    const { quantidade } = semAMedida.falta
                    aoAdicionar(semAMedida.alimento.id, Math.round(quantidade * m.gramas * 10) / 10, { nome: m.nome, quantidade, gramasPorMedida: m.gramas })
                    limpar()
                  },
                  semAMedida.falta.nome,
                )
              }
            >
              <Plus aria-hidden="true" />
              Nova medida
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
