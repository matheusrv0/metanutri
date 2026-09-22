import { ChevronRight, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { categoriasDoCatalogo, composicaoDe, filtrarCatalogo, resumoDoCatalogo, type OrdemCatalogo } from '@/domain/catalogo.ts'
import { medidasDoAlimento } from '@/domain/busca.ts'
import { completudeDe, explicarCompletude, type NivelCompletude } from '@/domain/completude.ts'
import type { Alimento } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { cn } from '@/lib/utils'
import { Button } from '../componentes/button.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '../componentes/card.tsx'
import { Input } from '../componentes/input.tsx'

const ORDENS: readonly { readonly valor: OrdemCatalogo; readonly rotulo: string }[] = [
  { valor: 'nome', rotulo: 'Nome' },
  { valor: 'energia', rotulo: 'Energia' },
  { valor: 'completude', rotulo: 'Mais completos' },
]

const NIVEIS: readonly { readonly valor: NivelCompletude; readonly rotulo: string }[] = [
  { valor: 'completo', rotulo: 'Completos' },
  { valor: 'parcial', rotulo: 'Dado parcial' },
  { valor: 'minimo', rotulo: 'Dado mínimo' },
]

const SELO: Readonly<Record<NivelCompletude, string>> = {
  completo: 'bg-lightprimary text-primary',
  parcial: 'bg-lightwarning text-warningtext',
  minimo: 'bg-lighterror text-errortext',
}

const ROTULO_NIVEL: Readonly<Record<NivelCompletude, string>> = {
  completo: 'completo',
  parcial: 'dado parcial',
  minimo: 'dado mínimo',
}

/** Quantos alimentos a lista mostra de uma vez; o resto entra pelo botão. */
const PAGINA = 40

/**
 * A tabela de composição inteira, navegável. Antes só dava para achar alimento
 * digitando dentro de uma refeição: não havia como olhar o que existe, nem ver
 * a composição completa de um alimento sem pô-lo num plano.
 */
export function TelaAlimentos() {
  const [termo, setTermo] = useState('')
  const [categoria, setCategoria] = useState<string | null>(null)
  const [nivel, setNivel] = useState<NivelCompletude | null>(null)
  const [ordem, setOrdem] = useState<OrdemCatalogo>('nome')
  const [quantos, setQuantos] = useState(PAGINA)
  const [aberto, setAberto] = useState<Alimento | null>(null)

  const categorias = useMemo(() => categoriasDoCatalogo(), [])
  const resumo = useMemo(() => resumoDoCatalogo(), [])
  const lista = useMemo(() => filtrarCatalogo({ termo, categoria, nivel, ordem }), [termo, categoria, nivel, ordem])
  const visiveis = lista.slice(0, quantos)

  const mudarFiltro = (acao: () => void) => {
    acao()
    setQuantos(PAGINA)
  }

  const limpar = () => mudarFiltro(() => {
    setTermo('')
    setCategoria(null)
    setNivel(null)
  })

  const temFiltro = termo.trim() !== '' || categoria !== null || nivel !== null

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-5">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Tabela de composição</CardTitle>
            <CardDescription>
              {`Os ${resumo.total} alimentos da TACO 4ª edição, com os 20 nutrientes que o sistema confere. Valores por 100 g.`}
            </CardDescription>
          </CardHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={termo}
              onChange={(e) => mudarFiltro(() => setTermo(e.target.value))}
              placeholder="Buscar por nome: arroz integral, queijo minas…"
              aria-label="Buscar alimento na tabela"
              className="rounded-full pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => mudarFiltro(() => setCategoria(null))}
              aria-pressed={categoria === null}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                categoria === null ? 'border-primary bg-lightprimary text-primary' : 'border-fio text-muted-foreground hover:border-fioforte hover:text-foreground',
              )}
            >
              {`Todas · ${resumo.total}`}
            </button>
            {categorias.map((c) => (
              <button
                key={c.nome}
                type="button"
                onClick={() => mudarFiltro(() => setCategoria(c.nome))}
                aria-pressed={categoria === c.nome}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  categoria === c.nome ? 'border-primary bg-lightprimary text-primary' : 'border-fio text-muted-foreground hover:border-fioforte hover:text-foreground',
                )}
              >
                {`${c.nome} · ${c.quantos}`}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-fio pt-4">
            <div className="flex items-center gap-1.5">
              <span className="rotulo">Ordenar</span>
              {ORDENS.map((o) => (
                <button
                  key={o.valor}
                  type="button"
                  onClick={() => setOrdem(o.valor)}
                  aria-pressed={ordem === o.valor}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    ordem === o.valor ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {o.rotulo}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="rotulo">Dado</span>
              {NIVEIS.map((n) => (
                <button
                  key={n.valor}
                  type="button"
                  onClick={() => mudarFiltro(() => setNivel(nivel === n.valor ? null : n.valor))}
                  aria-pressed={nivel === n.valor}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    nivel === n.valor ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {n.rotulo}
                </button>
              ))}
            </div>

            {temFiltro ? (
              <Button variant="ghost" size="sm" className="ml-auto" onClick={limpar}>
                <X aria-hidden="true" />
                Limpar filtros
              </Button>
            ) : null}
          </div>
        </Card>

        <Card className="gap-0 p-0">
          <div className="flex items-center justify-between gap-3 border-b border-fio px-5 py-3.5">
            <p className="text-sm font-medium">
              {lista.length === 0 ? 'Nenhum alimento' : `${lista.length} ${lista.length === 1 ? 'alimento' : 'alimentos'}`}
            </p>
            <p className="rotulo">por 100 g</p>
          </div>

          {lista.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-muted-foreground">Nenhum alimento com esses filtros.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={limpar}>
                Limpar filtros
              </Button>
            </div>
          ) : (
            <ul aria-label="Alimentos da tabela">
              {visiveis.map((a) => {
                const c = completudeDe(a)
                const kcal = a.nutrientes.energia_kcal
                return (
                  <li key={a.id} className="border-b border-fio last:border-0">
                    <button
                      type="button"
                      onClick={() => setAberto(a)}
                      aria-pressed={aberto?.id === a.id}
                      className={cn(
                        'flex w-full items-center gap-3 px-5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                        aberto?.id === a.id ? 'bg-lightprimary' : 'hover:bg-muted',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{a.descricao}</p>
                        <p className="truncate text-xs text-muted-foreground">{a.categoria}</p>
                      </div>
                      {c.nivel !== 'completo' ? (
                        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold', SELO[c.nivel])}>
                          {ROTULO_NIVEL[c.nivel]}
                        </span>
                      ) : null}
                      <span
                        className="numeros w-20 shrink-0 text-right text-sm font-medium"
                        title={kcal === null ? 'A tabela de composição não traz energia para este alimento.' : undefined}
                      >
                        {kcal === null ? '— kcal' : `${formatarNumero(kcal, 0)} kcal`}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {quantos < lista.length ? (
            <div className="border-t border-fio px-5 py-4 text-center">
              <Button variant="outline" size="sm" onClick={() => setQuantos((q) => q + PAGINA)}>
                {`Mostrar mais ${Math.min(PAGINA, lista.length - quantos)}`}
              </Button>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="xl:sticky xl:top-24 xl:self-start">
        <FichaDoAlimento alimento={aberto} />
      </div>
    </div>
  )
}

/** Composição completa de um alimento, com o que falta dito por nome. */
function FichaDoAlimento({ alimento }: { readonly alimento: Alimento | null }) {
  if (!alimento) {
    return (
      <Card className="gap-3">
        <CardHeader>
          <CardTitle>Ficha do alimento</CardTitle>
          <CardDescription>Escolha um alimento da lista para ver os 20 nutrientes, as medidas caseiras e o que a tabela não mediu.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const linhas = composicaoDe(alimento)
  const c = completudeDe(alimento)
  const explicacao = explicarCompletude(alimento)
  const medidas = medidasDoAlimento(alimento.id)

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>{alimento.descricao}</CardTitle>
        <CardDescription>{`${alimento.categoria} · valores por 100 g`}</CardDescription>
      </CardHeader>

      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', SELO[c.nivel])}>
          {`${c.preenchidos} de ${c.total} nutrientes`}
        </span>
        {alimento.preparo ? <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{alimento.preparo}</span> : null}
      </div>

      {explicacao ? <p className="text-xs leading-relaxed text-muted-foreground">{explicacao}</p> : null}

      {medidas.length > 0 ? (
        <div className="border-t border-fio pt-4">
          <p className="rotulo mb-2">Medidas caseiras · POF/IBGE</p>
          <ul className="flex flex-wrap gap-1.5">
            {medidas.slice(0, 6).map((m) => (
              <li key={m.nome} className="numeros rounded-full border border-fio px-2.5 py-1 text-xs text-muted-foreground">
                {`${m.nome} · ${formatarNumero(m.gramas, 0)} g`}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="border-t border-fio pt-4">
        <p className="rotulo mb-2">Composição</p>
        <ul>
          {linhas.map((l) => (
            <li key={l.chave} className="flex items-baseline justify-between gap-3 border-b border-fio py-2 last:border-0">
              <span className="text-sm">{l.nome}</span>
              {l.valor === null ? (
                <span className="text-xs text-muted-foreground" title="Não analisado pela TACO">
                  não analisado
                </span>
              ) : (
                <span className="numeros text-sm font-medium">
                  {l.traco && l.valor === 0 ? 'Tr' : `${formatarNumero(l.valor, l.valor < 10 ? 1 : 0)} ${l.unidade}`}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        Fonte: NEPA/UNICAMP. TACO, 4ª edição, 2011. <strong>Tr</strong> é traço: medido e desprezível. “Não analisado” é falta de
        medição, não ausência do nutriente.
      </p>
    </Card>
  )
}
