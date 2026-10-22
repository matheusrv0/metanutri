import { ChevronRight, CircleDashed, Contrast, Copy, Plus, Search, X } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { categoriasDoCatalogo, composicaoDe, filtrarCatalogo, resumoDoCatalogo, type OrdemCatalogo } from '@/domain/catalogo.ts'
import { dadosDaCopiaDaBase, produtoDosDados } from '@/domain/alimentoProprio.ts'
import { medidasDoAlimento, PRIMEIRO_ID_PROPRIO, type MedidaCaseira } from '@/domain/busca.ts'
import { unidadeDo } from '@/domain/liquido.ts'
import { MEUS_ALIMENTOS_NOVOS, type DadosAlimentoProprio, type FonteAlimentoProprio, type Produto } from '@/domain/produtos.ts'
import { ALIMENTOS, alimentosComProdutos } from '@/domain/tabelas.ts'
import { NOME_DA_BASE } from '@/domain/baseMetanutri.ts'
import { descreverOrigemUsda } from '@/domain/complementoUsda.ts'
import { completudeDe, explicarCompletude, type NivelCompletude } from '@/domain/completude.ts'
import type { Alimento } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { cn } from '@/lib/utils'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@ds/componentes/overlay/sheet.tsx'
import { DialogoAlimentoProprio } from '../produtos/DialogoAlimentoProprio.tsx'
import { useMediaQuery } from '../estado/usarMediaQuery.ts'
import { useMedidasProprias } from '../estado/usarMedidasProprias.ts'
import { useMeusAlimentos } from '../estado/usarMeusAlimentos.ts'
import { DialogoNovaMedida } from './DialogoNovaMedida.tsx'
import { useUsoDaConta } from '../estado/usarUsoDaConta.ts'

const ORDENS: readonly { readonly valor: OrdemCatalogo; readonly rotulo: string }[] = [
  { valor: 'relevancia', rotulo: 'Relevância' },
  { valor: 'nome', rotulo: 'Nome' },
  { valor: 'energia', rotulo: 'Energia' },
  { valor: 'completude', rotulo: 'Mais nutrientes' },
]

const NIVEIS: readonly { readonly valor: NivelCompletude; readonly rotulo: string }[] = [
  { valor: 'completo', rotulo: 'Completos' },
  { valor: 'parcial', rotulo: 'Parte dos nutrientes' },
  { valor: 'minimo', rotulo: 'Poucos nutrientes' },
]

/** As listas de escolha usam o select do navegador, como o paciente da etapa 1 (Decisão 5). */
const SELECT = 'h-11 w-full rounded-md border border-input bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm'

const SELO: Readonly<Record<NivelCompletude, string>> = {
  completo: 'bg-lightprimary text-primary',
  parcial: 'bg-lightwarning text-warningtext',
  minimo: 'bg-lighterror text-errortext',
}

const ROTULO_NIVEL: Readonly<Record<NivelCompletude, string>> = {
  completo: 'completo',
  parcial: 'parte dos nutrientes',
  minimo: 'poucos nutrientes',
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
  /** "Copiar para Meus alimentos" (D-385); padrão: a constante da publicação. */
  readonly formularioNovo?: boolean
}

type Origem = 'todas' | 'base' | 'meus'

/** A fonte do alimento próprio, como a ficha escreve (D-385). */
function textoDaFonte(fonte: FonteAlimentoProprio | undefined, codigoBarras: string): string {
  if (!fonte) return codigoBarras ? 'Open Food Facts' : 'rótulo'
  if (fonte.tipo === 'outra') return fonte.texto.trim() || 'outra'
  return { rotulo: 'rótulo', 'open-food-facts': 'Open Food Facts', laboratorio: 'análise de laboratório', 'copia-da-base': 'cópia da base' }[fonte.tipo]
}

export function TelaAlimentos({ aoAbrirFontes, formularioNovo = MEUS_ALIMENTOS_NOVOS }: TelaAlimentosProps = {}) {
  const [termo, setTermo] = useState('')
  const [categoria, setCategoria] = useState<string | null>(null)
  const [nivel, setNivel] = useState<NivelCompletude | null>(null)
  const [ordem, setOrdem] = useState<OrdemCatalogo>('relevancia')
  const [quantos, setQuantos] = useState(PAGINA)
  const [aberto, setAberto] = useState<Alimento | null>(null)
  const [origem, setOrigem] = useState<Origem>('todas')
  const largo = useMediaQuery(LARGO)
  // D-385 e D-387 (spec alimentos-e-gramaturas): os alimentos e as medidas da conta, relidos a cada gravação.
  const meusAlimentos = useMeusAlimentos()
  const medidasProprias = useMedidasProprias()
  const [novaMedidaPara, setNovaMedidaPara] = useState<Alimento | null>(null)
  const [copiando, setCopiando] = useState<DadosAlimentoProprio | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const produtoDe = (a: Alimento): Produto | undefined => meusAlimentos.lista.find((p) => p.id === a.id)

  const categorias = useMemo(() => categoriasDoCatalogo(), [])
  const resumo = useMemo(() => resumoDoCatalogo(), [])
  // A15 e D-370 (spec alimentos-e-gramaturas): com termo, a ordem da entrada rápida, com o uso desta conta.
  const uso = useUsoDaConta(termo.trim() !== '' && ordem === 'relevancia')
  const daOrigem = useMemo(() => {
    void meusAlimentos.lista
    const todos = alimentosComProdutos()
    return origem === 'base' ? ALIMENTOS : origem === 'meus' ? todos.filter((a) => a.id >= PRIMEIRO_ID_PROPRIO) : todos
  }, [origem, meusAlimentos.lista])
  const lista = useMemo(() => filtrarCatalogo({ termo, categoria, nivel, ordem, uso }, daOrigem), [termo, categoria, nivel, ordem, uso, daOrigem])
  const acoesDaFicha = {
    versaoDasMedidas: medidasProprias.versao,
    aoCriarMedida: (a: Alimento) => setNovaMedidaPara(a),
    aoExcluirMedida: (a: Alimento, m: MedidaCaseira) => {
      const propria = medidasProprias.doAlimento(a.id).find((x) => x.nome === m.nome)
      if (propria) medidasProprias.excluir(propria.id)
    },
    aoCopiar: formularioNovo ? (a: Alimento) => setCopiando(dadosDaCopiaDaBase(a)) : undefined,
    fonteDe: (a: Alimento) => {
      const p = produtoDe(a)
      return p ? textoDaFonte(p.fonte, p.codigoBarras) : null
    },
  }
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
      setOrigem('todas')
    })

  const temFiltro = termo.trim() !== '' || categoria !== null || nivel !== null || origem !== 'todas'

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-5">
        <Card className="gap-4">
          <p className="flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
            {/* CA-794: o número e a unidade na mesma linha. */}
            {`${NOME_DA_BASE} · ${resumo.total} alimentos · valores por 100\u00a0g`}
            {aoAbrirFontes ? (
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={aoAbrirFontes}
                  className="inline-flex min-h-11 items-center font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Fontes da base
                </button>
              </span>
            ) : null}
          </p>

          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="relative min-w-0 lg:min-w-56 lg:flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                value={termo}
                onChange={(e) => mudarFiltro(() => setTermo(e.target.value))}
                placeholder="Buscar por nome: arroz integral, queijo minas…"
                aria-label="Buscar alimento na tabela"
                className="h-11 rounded-full pl-10 sm:h-11"
              />
            </div>
            <div className="flex flex-col gap-1 lg:w-44">
              <Label htmlFor="filtro-origem">Origem</Label>
              <select id="filtro-origem" value={origem} onChange={(e) => mudarFiltro(() => setOrigem(e.target.value as Origem))} className={SELECT}>
                <option value="todas">Todas</option>
                <option value="base">Base MetaNutri</option>
                <option value="meus">Meus alimentos</option>
              </select>
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
              <Label htmlFor="filtro-completude">Nutrientes disponíveis</Label>
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
                parte dos nutrientes
              </li>
              <li className="inline-flex items-center gap-1">
                <CircleDashed className="size-3.5 text-errortext" aria-hidden="true" />
                poucos nutrientes
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
                          {a.id >= PRIMEIRO_ID_PROPRIO ? <span className="rotulo ml-1.5 text-muted-foreground">meu</span> : null}
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
        <FichaDoAlimento alimento={aberto} acoes={acoesDaFicha} />
      </div>

      {/* Tela estreita: a ficha sobe numa gaveta, senão ficava abaixo de 597 linhas. */}
      <Sheet open={!largo && aberto !== null} onOpenChange={(abriu) => !abriu && setAberto(null)}>
        <SheetContent side="bottom" className="gap-0 p-0">
          {aberto ? (
            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 pb-6 pt-5">
              {/* O "Fechar" tem 44 px no celular (D-246): o título termina antes dele, com folga. */}
              <div className="flex flex-col gap-1 pr-8 max-sm:pr-11">
                <SheetTitle className="text-base leading-snug">{aberto.descricao}</SheetTitle>
                <SheetDescription>{descricaoDaFicha(aberto, acoesDaFicha.fonteDe(aberto))}</SheetDescription>
              </div>
              <CorpoDaFicha alimento={aberto} acoes={acoesDaFicha} />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Sempre montado: a região viva só anuncia o que muda dentro dela. */}
      <p role="status" className={mensagem ? 'text-sm text-muted-foreground xl:col-span-2' : 'sr-only'}>
        {mensagem}
      </p>

      <DialogoNovaMedida
        alimento={novaMedidaPara}
        unidade={unidadeDo(novaMedidaPara ?? undefined)}
        aoSalvar={(m) => {
          if (!novaMedidaPara) return null
          try {
            medidasProprias.salvar({ alimentoId: novaMedidaPara.id, nome: m.nome, gramas: m.gramas })
            setMensagem(`Medida “${m.nome}” salva em ${novaMedidaPara.descricao.trim()}.`)
            return null
          } catch (erro) {
            return erro instanceof Error ? erro.message : 'Não foi possível salvar a medida. Tente de novo.'
          }
        }}
        aoFechar={() => setNovaMedidaPara(null)}
      />

      <DialogoAlimentoProprio
        inicial={copiando ? { dados: copiando, editando: false } : null}
        aoSalvar={(dados) => {
          try {
            const salvo = meusAlimentos.salvar(produtoDosDados(dados))
            setCopiando(null)
            setMensagem(`“${salvo.nome}” está em Meus alimentos.`)
            return null
          } catch (erro) {
            return erro instanceof Error ? erro.message : 'Não foi possível salvar. Tente de novo.'
          }
        }}
        aoFechar={() => setCopiando(null)}
      />
    </div>
  )
}

interface AcoesDaFicha {
  /** Muda quando uma medida da conta muda: a ficha relê as medidas. */
  readonly versaoDasMedidas: number
  readonly aoCriarMedida: (alimento: Alimento) => void
  readonly aoExcluirMedida: (alimento: Alimento, medida: MedidaCaseira) => void
  /** "Copiar para Meus alimentos" (D-385); sem ele, o botão não aparece. */
  readonly aoCopiar: ((alimento: Alimento) => void) | undefined
  /** A fonte do alimento próprio; `null` para o da base. */
  readonly fonteDe: (alimento: Alimento) => string | null
}

/** "Cereais e derivados · valores por 100 g"; o próprio diz que foi cadastrado e de onde vieram os valores (D-385). */
function descricaoDaFicha(alimento: Alimento, fonte: string | null): string {
  const unidade = unidadeDo(alimento)
  if (alimento.id < PRIMEIRO_ID_PROPRIO) return `${alimento.categoria} · valores por 100\u00a0${unidade}`
  return `Cadastrado por você · fonte: ${fonte ?? 'rótulo'} · valores por 100\u00a0${unidade}`
}

/** Ficha ao lado da lista; vazia, explica o que vai aparecer. */
function FichaDoAlimento({ alimento, acoes }: { readonly alimento: Alimento | null; readonly acoes: AcoesDaFicha }) {
  if (!alimento) {
    return (
      <Card className="gap-3">
        <CardHeader>
          <CardTitle>Ficha do alimento</CardTitle>
          <CardDescription>Escolha um alimento da lista para ver a composição, as medidas caseiras e o que a tabela não mediu.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>{alimento.descricao}</CardTitle>
        <CardDescription>{descricaoDaFicha(alimento, acoes.fonteDe(alimento))}</CardDescription>
      </CardHeader>
      <CorpoDaFicha alimento={alimento} acoes={acoes} />
    </Card>
  )
}

/** Composição completa de um alimento, com o que falta dito por nome. Serve à ficha lateral e à gaveta. */
function CorpoDaFicha({ alimento, acoes }: { readonly alimento: Alimento; readonly acoes: AcoesDaFicha }) {
  const linhas = composicaoDe(alimento)
  const idComposicao = useId()
  const c = completudeDe(alimento)
  const explicacao = explicarCompletude(alimento)
  // As medidas da conta vêm primeiro, marcadas "sua" (D-387); a versão faz reler quando uma muda.
  const medidas = useMemo(() => {
    void acoes.versaoDasMedidas
    return medidasDoAlimento(alimento.id)
  }, [alimento.id, acoes.versaoDasMedidas])
  const daBase = alimento.id < PRIMEIRO_ID_PROPRIO
  const unidade = unidadeDo(alimento)

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', SELO[c.nivel])}>
          {`${c.preenchidos} de ${c.total} nutrientes`}
        </span>
        {alimento.preparo ? <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{alimento.preparo}</span> : null}
      </div>

      {explicacao ? <p className="text-xs leading-relaxed text-muted-foreground">{explicacao}</p> : null}

      <div className="border-t border-border pt-4">
        <p className="rotulo mb-2">Medidas caseiras</p>
        {medidas.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {medidas.slice(0, 8).map((m) => (
              <li key={`${m.propria === true ? 'p' : 'b'}-${m.nome}`} className="numeros inline-flex items-center gap-1 rounded-full border border-border py-1 pl-2.5 pr-1 text-xs text-muted-foreground">
                <span className="pr-1.5">{`${m.nome} · ${formatarNumero(m.gramas, m.gramas < 10 && !Number.isInteger(m.gramas) ? 1 : 0)} ${unidade}${m.propria === true ? ' · sua' : ''}`}</span>
                {m.propria === true ? (
                  <button
                    type="button"
                    onClick={() => acoes.aoExcluirMedida(alimento, m)}
                    aria-label={`Excluir a medida ${m.nome}`}
                    className="inline-flex size-6 items-center justify-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:size-9"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">Sem medida caseira cadastrada.</p>
        )}
        {daBase ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="lightprimary" size="sm" onClick={() => acoes.aoCriarMedida(alimento)}>
              <Plus aria-hidden="true" />
              Medida sua
            </Button>
            {acoes.aoCopiar ? (
              <Button variant="outline" size="sm" onClick={() => acoes.aoCopiar?.(alimento)}>
                <Copy aria-hidden="true" />
                Copiar para Meus alimentos
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="border-t border-border pt-4">
        <p id={idComposicao} className="rotulo mb-2">
          Composição
        </p>
        <ul aria-labelledby={idComposicao}>
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
                  {/* O valor é de alimento equivalente americano: a marca diz isso sem pesar (spec vitaminas-usda, D-308). */}
                  {l.usda ? (
                    <span className="ml-1.5 text-xs font-medium tracking-wide text-muted-foreground">
                      <span aria-hidden="true">USDA</span>
                      <span className="sr-only">valor do USDA</span>
                    </span>
                  ) : null}
                </span>
              )}
            </li>
          ))}
        </ul>
        {alimento.usda || !daBase ? null : (
          <p className="pt-2 text-xs leading-relaxed text-muted-foreground">Sem dado de vitamina D, vitamina E, folato, vitamina B12, selênio e gordura trans.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
        <p>
          {daBase ? `Fonte: ${NOME_DA_BASE}. ` : 'Cadastrado por você em Meus alimentos. '}
          <strong>Tr</strong> é traço: medido e desprezível. “Não analisado” é falta de medição, não ausência do nutriente.
        </p>
        {alimento.usda ? (
          <p>{`Os valores marcados USDA são do alimento equivalente nº ${alimento.usda.fdcId} do USDA FoodData Central (${descreverOrigemUsda(alimento.usda)}).`}</p>
        ) : null}
        {/* D-380 (spec alimentos-e-gramaturas): a TACO não publicou a energia e os macros; vieram do USDA. */}
        {alimento.usdaMacros && alimento.usdaMacros.fdcId !== alimento.usda?.fdcId ? (
          <p>{`A energia e os macros marcados USDA são do alimento equivalente nº ${alimento.usdaMacros.fdcId} do USDA FoodData Central (${descreverOrigemUsda(alimento.usdaMacros)}), porque a TACO não os publicou.`}</p>
        ) : alimento.usdaMacros ? (
          <p>A TACO não publicou a energia e os macros deste alimento: vieram do mesmo equivalente do USDA.</p>
        ) : null}
      </div>
    </>
  )
}
