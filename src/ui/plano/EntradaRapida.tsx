import { Plus, Search } from 'lucide-react'
import { useEffect, useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { produtoDosDados } from '@/domain/alimentoProprio.ts'
import { buscarAlimentos, leituraDoResultado, leituraDoTexto, PRIMEIRO_ID_PROPRIO, type MedidaCaseira, type ResultadoBusca } from '@/domain/busca.ts'
import {
  alimentoProvisorio,
  buscarNoCatalogo,
  copiaExistente,
  dadosDaCopia,
  LETRAS_PARA_O_CATALOGO,
  letrasDaBusca,
  rotuloDoCatalogo,
  type ProdutoDoIndice,
} from '@/domain/catalogoOff.ts'
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
import { useBaseAmpliada } from '../estado/usarBaseAmpliada.ts'
import { detalheDoProdutoDoCatalogo, VERSAO_DO_CATALOGO } from '../estado/catalogoOff.ts'
import { useCatalogoOff } from '../estado/usarCatalogoOff.ts'
import { useMeusAlimentos } from '../estado/usarMeusAlimentos.ts'
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
  /**
   * A porção que cada resultado mostra no lugar da digitada: na janela de substituto, a equivalente (spec
   * alimentos-e-gramaturas, correção C, D-486). `null` mantém a da busca.
   */
  readonly porcaoDoResultado?: ((alimentoId: number) => { readonly gramas: number; readonly medida: MedidaDoItem | null } | null) | undefined
}

// Alimento sem energia na tabela mostra travessão, nunca zero (princípio do produto).
const kcalDe = (r: ResultadoBusca, gramas: number): string => {
  const porCem = r.alimento.nutrientes.energia_kcal
  return porCem === null ? '— kcal' : `${formatarNumero((porCem * gramas) / 100, 0)} kcal`
}

/** "1 concha e meia · 210 g · 160 kcal" (D-373), ou a porção que o resultado vai ter quando outra vale (D-486). */
function leituraComKcal(r: ResultadoBusca, gramas: number, outra: { readonly gramas: number; readonly medida: MedidaDoItem | null } | null): string {
  const porcao = outra ? { ...r, gramas: outra.gramas, medida: outra.medida } : { ...r, gramas }
  return `${leituraDoResultado(porcao) ?? ''} · ${kcalDe(r, porcao.gramas)}`
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

/**
 * Diz, na hora de escolher, quando a tabela sabe pouco deste alimento. "Parte dos nutrientes" (arroz, feijão, ovo) fica
 * só na Tabela de alimentos: na entrada rápida ela aparecia em quase todo alimento básico e virava ruído (D-437).
 */
function MarcaDeCompletude({ alimento }: { readonly alimento: ResultadoBusca['alimento'] }) {
  const { nivel } = completudeDe(alimento)
  if (nivel !== 'minimo') return null
  return (
    <span className="rotulo shrink-0 text-errortext" title={explicarCompletude(alimento) ?? ''}>
      poucos nutrientes
    </span>
  )
}

/** Uma linha da lista: um alimento da tabela ou uma receita da conta. */
/** D-767: a espera do catálogo depois da última tecla. */
const ESPERA_DO_CATALOGO_MS = 150

type Opcao =
  | { readonly tipo: 'alimento'; readonly r: ResultadoBusca }
  | { readonly tipo: 'receita'; readonly r: ResultadoReceita }
  // Spec base-ampliada, fase 2 (D-758): o produto do catálogo de rótulos, com a leitura do texto para ele.
  | { readonly tipo: 'catalogo'; readonly p: ProdutoDoIndice; readonly r: ResultadoBusca }

const chaveDa = (o: Opcao): string => (o.tipo === 'alimento' ? `a-${o.r.alimento.id}` : o.tipo === 'catalogo' ? `c-${o.p.codigo}` : `r-${o.r.receita.id}`)

/** CA-15 a CA-18 e CA-20: digitar quantidade e nome, escolher com as setas e adicionar com Enter. */
export function EntradaRapida({ rotulo, aoAdicionar, aoAdicionarReceita, quandoVazio, aoCriarMedida, porcaoDoResultado }: EntradaRapidaProps) {
  const [texto, setTexto] = useState('')
  const [selecionado, setSelecionado] = useState(0)
  // D-432: Enter numa linha sem a medida não fica calado.
  const [nadaAdicionado, setNadaAdicionado] = useState(false)
  const idLista = useId()
  const { lista: receitas } = useReceitas()

  // D-370 (spec alimentos-e-gramaturas): o que a conta mais usa vem primeiro; os planos só são lidos quando há texto.
  const uso = useUsoDaConta(texto.trim() !== '')
  // Spec base-ampliada, CA-1716: quando a base ampliada chega, a lista se refaz.
  const { versao: versaoDaBase } = useBaseAmpliada()
  const { resultados, aviso } = useMemo(() => {
    void versaoDaBase
    return buscarAlimentos(texto, alimentosComProdutos(), { uso })
  }, [texto, uso, versaoDaBase])
  // D-274: só onde a receita pode entrar (a refeição); a que começa pelo termo vem antes dos alimentos.
  const daReceita = useMemo(
    () => (aoAdicionarReceita ? buscarReceitas(texto, receitas, resultados.map((r) => r.alimento)) : []),
    [aoAdicionarReceita, texto, receitas, resultados],
  )
  // Spec base-ampliada, fase 2 (D-758, CA-1764): o índice do catálogo só é pedido com 3 letras ou mais.
  // D-767: o catálogo (23 mil nomes) busca de novo uns 150 ms depois da última tecla, não a cada tecla.
  const [textoDoCatalogo, setTextoDoCatalogo] = useState('')
  useEffect(() => {
    const espera = setTimeout(() => setTextoDoCatalogo(texto), ESPERA_DO_CATALOGO_MS)
    return () => clearTimeout(espera)
  }, [texto])
  const comLetras = letrasDaBusca(textoDoCatalogo) >= LETRAS_PARA_O_CATALOGO
  const catalogo = useCatalogoOff(comLetras)
  const meusAlimentos = useMeusAlimentos()
  const [erroDoProduto, setErroDoProduto] = useState<string | null>(null)
  // A espera vale para buscar de novo, não para sumir: sem 3 letras no campo agora, o catálogo some na hora.
  const campoComLetras = letrasDaBusca(texto) >= LETRAS_PARA_O_CATALOGO
  const doCatalogo = useMemo(() => {
    if (!comLetras || !campoComLetras || !catalogo.indice) return []
    // CA-1757: o produto que a conta já copiou aparece como "meu", pela busca de sempre; não se repete aqui.
    return buscarNoCatalogo(catalogo.indice, textoDoCatalogo)
      .filter((p) => copiaExistente(meusAlimentos.lista, p.codigo) === undefined)
      .map((p, i): Opcao => {
        const alimento = alimentoProvisorio(p, i)
        return { tipo: 'catalogo', p, r: { alimento, ...leituraDoTexto(textoDoCatalogo, alimento) } }
      })
  }, [comLetras, campoComLetras, catalogo.indice, textoDoCatalogo, meusAlimentos.lista])
  const opcoes: readonly Opcao[] = [
    ...daReceita.filter((r) => r.antesDosAlimentos).map((r): Opcao => ({ tipo: 'receita', r })),
    ...resultados.map((r): Opcao => ({ tipo: 'alimento', r })),
    ...daReceita.filter((r) => !r.antesDosAlimentos).map((r): Opcao => ({ tipo: 'receita', r })),
    ...doCatalogo,
  ]
  const escolhido = opcoes[Math.min(selecionado, opcoes.length - 1)]
  // O produto do catálogo também é resultado: o aviso de "nenhum alimento" só vale sem ele.
  const avisoDaBusca = daReceita.length > 0 || doCatalogo.length > 0 ? null : aviso
  const semResultado = texto.trim() !== '' && opcoes.length === 0
  // D-432: a linha escolhida pede uma medida que o alimento não tem.
  const semAMedida = escolhido?.tipo === 'alimento' && escolhido.r.gramas === null && escolhido.r.faltaMedida ? { alimento: escolhido.r.alimento, falta: escolhido.r.faltaMedida } : null
  // CB-750: sem o índice, a busca segue com a base, e uma linha discreta diz por quê.
  const catalogoSemRede = comLetras && catalogo.estado === 'erro'

  const limpar = () => {
    setTexto('')
    setSelecionado(0)
    setNadaAdicionado(false)
    setErroDoProduto(null)
  }

  /**
   * D-756 e CA-1756: o produto do catálogo entra como cópia em Meus alimentos (a que a conta já tem, ou uma nova), e o
   * item aponta para a cópia. Sem a fatia, nada entra e nada é gravado (CB-751).
   */
  const adicionarDoCatalogo = async (p: ProdutoDoIndice, gramas: number, medida: MedidaDoItem | undefined) => {
    setErroDoProduto(null)
    let copia = copiaExistente(meusAlimentos.lista, p.codigo)
    if (!copia) {
      try {
        const detalhe = await detalheDoProdutoDoCatalogo(p)
        copia = meusAlimentos.salvar(produtoDosDados(dadosDaCopia(rotuloDoCatalogo(p, detalhe, VERSAO_DO_CATALOGO))))
      } catch (erro) {
        // D-768: Meus alimentos no limite diz o limite; tentar de novo não resolveria.
        setErroDoProduto(erro instanceof RangeError ? erro.message : 'Não foi possível carregar o produto. Tente de novo.')
        return
      }
    }
    if (medida) aoAdicionar(copia.id, gramas, medida)
    else aoAdicionar(copia.id, gramas)
    limpar()
  }

  const adicionar = (o: Opcao | undefined) => {
    if (!o) return
    // CB-07: medida que não existe para o alimento (ou que não é a da porção) não vira grama inventada; a tela diz.
    if (o.r.gramas === null) {
      setNadaAdicionado(true)
      return
    }
    if (o.tipo === 'catalogo') {
      void adicionarDoCatalogo(o.p, o.r.gramas, o.r.medida ?? undefined)
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
      {catalogoSemRede ? <p className="text-xs text-muted-foreground">Os produtos de marca precisam de internet no primeiro uso.</p> : null}
      {erroDoProduto ? (
        <p role="alert" className="text-xs font-medium text-warningtext">
          {erroDoProduto}
        </p>
      ) : null}

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
                  {o.tipo === 'catalogo' ? (
                    // D-758: o produto do catálogo diz a marca e a porção do rótulo.
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="min-w-0 break-words">{o.p.nome}</span>
                      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="rotulo shrink-0">rótulo</span>
                        {/* D-764: as kcal por 100 g diferenciam os produtos parecidos (e o genérico sem marca). */}
                        <span className="min-w-0 break-words">{[o.p.marca, o.p.porcaoTexto, `${Math.round(o.p.kcal)} kcal/100 ${o.p.unidade}`].filter((t) => t !== '').join(' · ')}</span>
                        {o.r.gramas === null ? <span className="text-warningtext">{o.r.aviso ?? 'Medida indisponível.'}</span> : <span className="numeros whitespace-nowrap">{leituraDoResultado(o.r)}</span>}
                      </span>
                    </span>
                  ) : o.tipo === 'receita' ? (
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
                        {/* D-481 (correção C): no celular o nome quebra linha; "Ovo, de galinha, inteiro, cozido/10minut…" cortava o preparo. */}
                        <span className="min-w-0 break-words sm:flex-1 sm:truncate">{o.r.alimento.descricao}</span>
                        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                          {o.r.alimento.id >= PRIMEIRO_ID_PROPRIO ? <span className="rotulo shrink-0 text-muted-foreground">meu</span> : null}
                          <MarcaDeCompletude alimento={o.r.alimento} />
                          <span className="numeros min-w-0 whitespace-nowrap text-xs text-muted-foreground">{leituraComKcal(o.r, o.r.gramas, porcaoDoResultado?.(o.r.alimento.id) ?? null)}</span>
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
