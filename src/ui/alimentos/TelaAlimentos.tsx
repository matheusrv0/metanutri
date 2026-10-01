import { ChevronRight, CircleDashed, Contrast, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { categoriasDoCatalogo, composicaoDe, filtrarCatalogo, resumoDoCatalogo, type OrdemCatalogo } from '@/domain/catalogo.ts'
import { medidasDoAlimento } from '@/domain/busca.ts'
import { NOME_DA_BASE } from '@/domain/baseMetanutri.ts'
import { completudeDe, explicarCompletude, type NivelCompletude } from '@/domain/completude.ts'
import type { Alimento } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { cn } from '@/lib/utils'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@ds/componentes/overlay/sheet.tsx'
import { useMediaQuery } from '../estado/usarMediaQuery.ts'

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

/** As listas de escolha usam o select do navegador, como o paciente da etapa 1 (Decisão 5). */
const SELECT = 'h-11 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

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

/** Acima disto a ficha fica ao lado da lista; abaixo, sobe numa gaveta. Mesmo corte do `xl:` do Tailwind. */
const LARGO = '(min-width: 1280px)'

/**
 * A tabela de composição inteira, navegável. Antes só dava para achar alimento
 * digitando dentro de uma refeição: não havia como olhar o que existe, nem ver
 * a composição completa de um alimento sem pô-lo num plano.
 */
interface TelaAlimentosProps {
  /** Abre a página Fontes da base (CA-323). */
  readonly aoAbrirFontes?: (() => void) | undefined
}

export function TelaAlimentos({ aoAbrirFontes }: TelaAlimentosProps = {}) {
  const [termo, setTermo] = useState('')
  const [categoria, setCategoria] = useState<string | null>(null)
  const [nivel, setNivel] = useState<NivelCompletude | null>(null)
  const [ordem, setOrdem] = useState<OrdemCatalogo>('nome')
  const [quantos, setQuantos] = useState(PAGINA)
  const [aberto, setAberto] = useState<Alimento | null>(null)
  const largo = useMediaQuery(LARGO)

  const categorias = useMemo(() => categoriasDoCatalogo(), [])
  const resumo = useMemo(() => resumoDoCatalogo(), [])
  const lista = useMemo(() => filtrarCatalogo({ termo, categoria, nivel, ordem }), [termo, categoria, nivel, ordem])
  const visiveis = lista.slice(0, quantos)

  const mudarFiltro = (acao: () => void) => {
    acao()
    setQuantos(PAGINA)
  }

  const limpar = () =>
    mudarFiltro(() => {
      setTermo('')
      setCategoria(null)
      setNivel(null)
    })

  const temFiltro = termo.trim() !== '' || categoria !== null || nivel !== null

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-5">
        <Card className="gap-4">
          <p className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
            {`${NOME_DA_BASE} · ${resumo.total} alimentos · valores por 100 g`}
            {aoAbrirFontes ? (
              <>
                {' · '}
                <button
                  type="button"
                  onClick={aoAbrirFontes}
                  className="inline-flex min-h-11 items-center font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Fontes da base
                </button>
              </>
            ) : null}
          </p>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="relative min-w-0 lg:flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                value={termo}
                onChange={(e) => mudarFiltro(() => setTermo(e.target.value))}
                placeholder="Buscar por nome: arroz integral, queijo minas…"
                aria-label="Buscar alimento na tabela"
                className="h-11 rounded-full pl-10"
              />
            </div>
            <div className="flex flex-col gap-1 lg:w-52">
              <Label htmlFor="filtro-grupo">Grupo</Label>
              <select id="filtro-grupo" value={categoria ?? ''} onChange={(e) => mudarFiltro(() => setCategoria(e.target.value || null))} className={SELECT}>
                <option value="">{`Todos · ${resumo.total}`}</option>
                {categorias.map((c) => (
                  <option key={c.nome} value={c.nome}>{`${c.nome} · ${c.quantos}`}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 lg:w-40">
              <Label htmlFor="filtro-ordem">Ordem</Label>
              <select id="filtro-ordem" value={ordem} onChange={(e) => setOrdem(e.target.value as OrdemCatalogo)} className={SELECT}>
                {ORDENS.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 lg:w-44">
              <Label htmlFor="filtro-completude">Completude do dado</Label>
              <select
                id="filtro-completude"
                value={nivel ?? ''}
                onChange={(e) => mudarFiltro(() => setNivel(e.target.value === '' ? null : (e.target.value as NivelCompletude)))}
                className={SELECT}
              >
                <option value="">Todos</option>
                {NIVEIS.map((n) => (
                  <option key={n.valor} value={n.valor}>
                    {n.rotulo}
                  </option>
                ))}
              </select>
            </div>
            {temFiltro ? (
              <Button variant="ghost" size="sm" className="self-start lg:self-end" onClick={limpar}>
                <X aria-hidden="true" />
                Limpar filtros
              </Button>
            ) : null}
          </div>
        </Card>

        <Card className="gap-0 p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            <p className="text-sm font-medium">
              {lista.length === 0 ? 'Nenhum alimento' : `${lista.length} ${lista.length === 1 ? 'alimento' : 'alimentos'}`}
            </p>
            <ul aria-label="Legenda" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <li className="inline-flex items-center gap-1">
                <Contrast className="size-3.5 text-warningtext" aria-hidden="true" />
                dado parcial
              </li>
              <li className="inline-flex items-center gap-1">
                <CircleDashed className="size-3.5 text-errortext" aria-hidden="true" />
                dado mínimo
              </li>
            </ul>
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
                  <li key={a.id} className="border-b border-border last:border-0">
                    <button
                      type="button"
                      onClick={() => setAberto(a)}
                      aria-pressed={aberto?.id === a.id}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5',
                        aberto?.id === a.id ? 'bg-lightprimary' : 'hover:bg-muted',
                      )}
                    >
                      <p className="min-w-0 flex-1 text-sm">
                        <span className="line-clamp-2">
                          {a.descricao} <span className="text-xs text-muted-foreground">{a.categoria}</span>
                        </span>
                      </p>
                      {c.nivel === 'parcial' ? <Contrast className="size-3.5 shrink-0 text-warningtext" aria-hidden="true" /> : null}
                      {c.nivel === 'minimo' ? <CircleDashed className="size-3.5 shrink-0 text-errortext" aria-hidden="true" /> : null}
                      {c.nivel !== 'completo' ? <span className="sr-only">{`, ${ROTULO_NIVEL[c.nivel]}`}</span> : null}
                      <span
                        className="numeros w-16 shrink-0 text-right text-sm font-medium sm:w-20"
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
            <div className="border-t border-border px-5 py-4 text-center">
              <Button variant="outline" size="sm" onClick={() => setQuantos((q) => q + PAGINA)}>
                {`Mostrar mais ${Math.min(PAGINA, lista.length - quantos)}`}
              </Button>
            </div>
          ) : null}
        </Card>
      </div>

      {/* Tela larga: a ficha acompanha a rolagem ao lado da lista. */}
      <div className="hidden xl:block xl:sticky xl:top-24 xl:self-start">
        <FichaDoAlimento alimento={aberto} />
      </div>

      {/* Tela estreita: a ficha sobe numa gaveta, senão ficava abaixo de 597 linhas. */}
      <Sheet open={!largo && aberto !== null} onOpenChange={(abriu) => !abriu && setAberto(null)}>
        <SheetContent side="bottom" className="gap-0 p-0">
          {aberto ? (
            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 pb-6 pt-5">
              <div className="flex flex-col gap-1 pr-8">
                <SheetTitle className="text-base leading-snug">{aberto.descricao}</SheetTitle>
                <SheetDescription>{`${aberto.categoria} · valores por 100 g`}</SheetDescription>
              </div>
              <CorpoDaFicha alimento={aberto} />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}

/** Ficha ao lado da lista; vazia, explica o que vai aparecer. */
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

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>{alimento.descricao}</CardTitle>
        <CardDescription>{`${alimento.categoria} · valores por 100 g`}</CardDescription>
      </CardHeader>
      <CorpoDaFicha alimento={alimento} />
    </Card>
  )
}

/** Composição completa de um alimento, com o que falta dito por nome. Serve à ficha lateral e à gaveta. */
function CorpoDaFicha({ alimento }: { readonly alimento: Alimento }) {
  const linhas = composicaoDe(alimento)
  const c = completudeDe(alimento)
  const explicacao = explicarCompletude(alimento)
  const medidas = medidasDoAlimento(alimento.id)

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', SELO[c.nivel])}>
          {`${c.preenchidos} de ${c.total} nutrientes`}
        </span>
        {alimento.preparo ? <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{alimento.preparo}</span> : null}
      </div>

      {explicacao ? <p className="text-xs leading-relaxed text-muted-foreground">{explicacao}</p> : null}

      {medidas.length > 0 ? (
        <div className="border-t border-border pt-4">
          <p className="rotulo mb-2">Medidas caseiras</p>
          <ul className="flex flex-wrap gap-1.5">
            {medidas.slice(0, 6).map((m) => (
              <li key={m.nome} className="numeros rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                {`${m.nome} · ${formatarNumero(m.gramas, 0)} g`}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="border-t border-border pt-4">
        <p className="rotulo mb-2">Composição</p>
        <ul>
          {linhas.map((l) => (
            <li key={l.chave} className="flex items-baseline justify-between gap-3 border-b border-border py-2 last:border-0">
              <span className="text-sm">{l.nome}</span>
              {l.valor === null ? (
                <span className="text-xs text-muted-foreground" title="Não analisado">
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
        Fonte: {NOME_DA_BASE}. <strong>Tr</strong> é traço: medido e desprezível. “Não analisado” é falta de medição, não ausência do
        nutriente.
      </p>
    </>
  )
}
