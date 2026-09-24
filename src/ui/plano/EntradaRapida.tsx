import { Plus, Search } from 'lucide-react'
import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { buscarAlimentos, GRAMAS_PADRAO, type ResultadoBusca } from '@/domain/busca.ts'
import { completudeDe, explicarCompletude } from '@/domain/completude.ts'
import { criarRepositorioFrequentes } from '@/domain/frequentes.ts'
import { alimentosComProdutos, buscarAlimento } from '@/domain/tabelas.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { cn } from '@/lib/utils'
import { Input } from '@ds/componentes/forms/input.tsx'
import { armazenamentoLocal } from '../estado/armazenamentoLocal.ts'

interface EntradaRapidaProps {
  readonly rotulo: string
  readonly aoAdicionar: (alimentoId: number, gramas: number) => void
  /** Mostra os alimentos mais usados como atalho e conta os usos. Só faz sentido ao montar a refeição. */
  readonly comAtalhos?: boolean
}

// Alimento sem energia na tabela mostra travessão, nunca zero (princípio do produto).
const kcalDe = (r: ResultadoBusca, gramas: number): string => {
  const porCem = r.alimento.nutrientes.energia_kcal
  return porCem === null ? '— kcal' : `${formatarNumero((porCem * gramas) / 100, 0)} kcal`
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

/** CA-15 a CA-18 e CA-20: digitar quantidade e nome, escolher com as setas e adicionar com Enter. */
export function EntradaRapida({ rotulo, aoAdicionar, comAtalhos = false }: EntradaRapidaProps) {
  const [texto, setTexto] = useState('')
  const [selecionado, setSelecionado] = useState(0)
  const [usos, setUsos] = useState(0)
  const idLista = useId()
  const frequentes = useMemo(() => criarRepositorioFrequentes(armazenamentoLocal()), [])

  const { resultados, aviso } = useMemo(() => buscarAlimentos(texto, alimentosComProdutos()), [texto])
  const escolhido = resultados[Math.min(selecionado, resultados.length - 1)]
  const semResultado = texto.trim() !== '' && resultados.length === 0

  // Atalho do dia a dia: os alimentos que você mais usa, na porção de sempre.
  const atalhos = useMemo(() => {
    void usos
    if (!comAtalhos || texto.trim() !== '') return []
    return frequentes
      .maisUsados()
      .map((f) => ({ ...f, alimento: buscarAlimento(f.alimentoId) }))
      .filter((f): f is { alimentoId: number; gramas: number; alimento: NonNullable<ReturnType<typeof buscarAlimento>> } => f.alimento !== undefined)
  }, [comAtalhos, frequentes, texto, usos])

  const registrar = (alimentoId: number, gramas: number) => {
    aoAdicionar(alimentoId, gramas)
    if (!comAtalhos) return
    frequentes.registrar(alimentoId, gramas)
    setUsos((n) => n + 1)
  }

  const adicionar = (r: ResultadoBusca | undefined) => {
    if (!r) return
    // CB-07: medida que não existe para o alimento não vira grama inventada.
    if (r.gramas === null) return
    registrar(r.alimento.id, r.gramas)
    setTexto('')
    setSelecionado(0)
  }

  const aoTeclar = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelecionado((i) => Math.min(i + 1, resultados.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelecionado((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      adicionar(escolhido)
    } else if (e.key === 'Escape') {
      setTexto('')
      setSelecionado(0)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          role="combobox"
          aria-label={rotulo}
          aria-expanded={resultados.length > 0}
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

      {atalhos.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rotulo shrink-0">Você usa muito</span>
          {atalhos.map((f) => (
            <button
              key={f.alimentoId}
              type="button"
              onClick={() => registrar(f.alimentoId, f.gramas)}
              title={`Adicionar ${formatarNumero(f.gramas, 0)} g de ${f.alimento.descricao}`}
              className="flex max-w-56 items-center gap-1 border border-border px-2 py-1 text-xs transition-colors hover:border-borderdefault hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-3 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 truncate">{f.alimento.descricao}</span>
              <span className="numeros shrink-0 text-muted-foreground">{`${formatarNumero(f.gramas, 0)} g`}</span>
            </button>
          ))}
        </div>
      ) : null}

      {aviso ? <p className="text-xs text-warningtext">{aviso}</p> : null}
      {semResultado && !aviso ? <p className="text-xs text-warningtext">Nenhum alimento encontrado. Nada foi adicionado.</p> : null}

      {resultados.length > 0 ? (
        <ul id={idLista} role="listbox" aria-label={`Resultados para ${rotulo}`} className="flex flex-col border border-borderdefault bg-card">
          {resultados.map((r, i) => {
            const gramas = r.gramas ?? GRAMAS_PADRAO
            const atual = r === escolhido
            return (
              <li key={r.alimento.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={atual}
                  onClick={() => adicionar(r)}
                  onMouseEnter={() => setSelecionado(i)}
                  className={cn(
                    'flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-sm transition-colors last:border-0',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    atual ? 'bg-lightprimary text-primary' : 'hover:bg-muted',
                  )}
                >
                  <Plus className="size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{r.alimento.descricao}</span>
                  <MarcaDeCompletude alimento={r.alimento} />
                  <span className="numeros shrink-0 text-xs text-muted-foreground">
                    {r.gramas === null
                      ? r.aviso ?? 'medida indisponível'
                      : `${formatarNumero(gramas, 0)} g${r.medida ? ` · ${r.medida.quantidade} ${r.medida.nome}` : ''} · ${kcalDe(r, gramas)}`}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
