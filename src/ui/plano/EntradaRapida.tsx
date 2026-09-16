import { Plus, Search } from 'lucide-react'
import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { buscarAlimentos, GRAMAS_PADRAO, type ResultadoBusca } from '@/domain/busca.ts'
import { ALIMENTOS } from '@/domain/tabelas.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { cn } from '@/lib/utils'
import { Input } from '../componentes/input.tsx'

interface EntradaRapidaProps {
  readonly rotulo: string
  readonly aoAdicionar: (alimentoId: number, gramas: number) => void
}

const kcalDe = (r: ResultadoBusca, gramas: number) => ((r.alimento.nutrientes.energia_kcal ?? 0) * gramas) / 100

/** CA-15 a CA-18 e CA-20: digitar quantidade e nome, escolher com as setas e adicionar com Enter. */
export function EntradaRapida({ rotulo, aoAdicionar }: EntradaRapidaProps) {
  const [texto, setTexto] = useState('')
  const [selecionado, setSelecionado] = useState(0)
  const idLista = useId()

  const { resultados, aviso } = useMemo(() => buscarAlimentos(texto, ALIMENTOS), [texto])
  const escolhido = resultados[Math.min(selecionado, resultados.length - 1)]
  const semResultado = texto.trim() !== '' && resultados.length === 0

  const adicionar = (r: ResultadoBusca | undefined) => {
    if (!r) return
    // CB-07: medida que não existe para o alimento não vira grama inventada.
    if (r.gramas === null) return
    aoAdicionar(r.alimento.id, r.gramas)
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
          placeholder="Ex.: 150 arroz integral ou 2 colher de sopa feijão"
          className="pl-10"
        />
      </div>

      {aviso ? <p className="text-xs text-warningtext">{aviso}</p> : null}
      {semResultado && !aviso ? <p className="text-xs text-warningtext">Nenhum alimento encontrado. Nada foi adicionado.</p> : null}

      {resultados.length > 0 ? (
        <ul id={idLista} role="listbox" aria-label={`Resultados para ${rotulo}`} className="flex flex-col border border-fioforte bg-card">
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
                    'flex w-full items-center gap-2 border-b border-fio px-3 py-2 text-left text-sm transition-colors last:border-0',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    atual ? 'bg-lightprimary text-primary' : 'hover:bg-muted',
                  )}
                >
                  <Plus className="size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{r.alimento.descricao}</span>
                  <span className="numeros shrink-0 text-xs text-muted-foreground">
                    {r.gramas === null
                      ? r.aviso ?? 'medida indisponível'
                      : `${formatarNumero(gramas, 0)} g${r.medida ? ` · ${r.medida.quantidade} ${r.medida.nome}` : ''} · ${formatarNumero(kcalDe(r, gramas), 0)} kcal`}
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
