import { ChevronDown, Search, TriangleAlert, X } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import {
  buscarSubstitutos,
  infoDoNutriente,
  MACROS_DA_BUSCA,
  mensagemSemCandidato,
  nutrienteInicial,
  OUTROS_NUTRIENTES_DA_BUSCA,
  type Candidato,
} from '@/domain/buscaDeSubstitutos.ts'
import { grupoDeSubstituicao } from '@/domain/grupoDeSubstituicao.ts'
import { unidadeDo } from '@/domain/liquido.ts'
import { medidaNaLinha } from '@/domain/medidaDoItem.ts'
import { vagaParaOpcao } from '@/domain/opcoesDoItem.ts'
import { chaveDasRestricoes, type RestricoesDoPaciente } from '@/domain/restricoes.ts'
import { alimentosParaSugerir, buscarAlimento } from '@/domain/tabelas.ts'
import type { Alimento, ChaveNutrienteAlimento, ItemPlano } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { ChipAlternavel } from '@ds/componentes/forms/ChipAlternavel.tsx'
import { Switch } from '@ds/componentes/forms/switch.tsx'
import { useBaseAmpliada } from '../estado/usarBaseAmpliada.ts'
import { useMeusAlimentos } from '../estado/usarMeusAlimentos.ts'
import { CartaoCandidato } from './CartaoCandidato.tsx'
import { JanelaComparar } from './JanelaComparar.tsx'

/** A tela mostra 6 e "Mostrar mais" (D-1109). */
const NA_PRIMEIRA_VISTA = 6

interface BuscaDeSubstitutosProps {
  readonly item: ItemPlano
  readonly alimento: Alimento
  readonly restricoes: RestricoesDoPaciente
  readonly aoAdicionarOpcao: (c: Candidato) => void
  readonly aoSubstituir: (c: Candidato) => void
}

/** "carboidrato", "carboidrato e proteína", "carboidrato, proteína e ferro". */
const listaComE = (nomes: readonly string[]): string => (nomes.length <= 1 ? (nomes[0] ?? '') : `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1) ?? ''}`)

const mesmaSelecao = (a: readonly ChaveNutrienteAlimento[], b: readonly ChaveNutrienteAlimento[]): boolean =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join()

/**
 * "Buscar substitutos" (spec busca-substitutos, D-1103 a D-1111): os nutrientes, o filtro do grupo, "Buscar alimentos"
 * e a lista. Ao abrir, o macro dominante já vem marcado e a lista já aparece (CA-2102).
 */
export function BuscaDeSubstitutos({ item, alimento, restricoes, aoAdicionarOpcao, aoSubstituir }: BuscaDeSubstitutosProps) {
  const inicial = nutrienteInicial(alimento)
  const [selecionados, setSelecionados] = useState<readonly ChaveNutrienteAlimento[]>([inicial])
  const [buscados, setBuscados] = useState<readonly ChaveNutrienteAlimento[]>([inicial])
  const [mesmoGrupo, setMesmoGrupo] = useState(true)
  const [grupoBuscado, setGrupoBuscado] = useState(true)
  const [todos, setTodos] = useState(false)
  const [comparando, setComparando] = useState<Candidato | null>(null)
  const idRotulo = useId()
  const idOutro = useId()

  // CB-709 (spec base-ampliada) e D-1117: a lista se refaz quando a base ampliada chega e quando Meus alimentos muda.
  const { estado: estadoDaBase, versao: versaoDaBase } = useBaseAmpliada()
  const meus = useMeusAlimentos().lista
  const chaveRestricoes = chaveDasRestricoes(restricoes)
  const resultado = useMemo(
    () => {
      void versaoDaBase
      void meus
      return buscarSubstitutos(
        { alimentoId: item.alimentoId, gramas: item.gramas },
        { nutrientes: buscados, mesmoGrupo: grupoBuscado, alimentos: alimentosParaSugerir(), restricoes },
        buscarAlimento,
      )
    },
    // As restrições chegam num objeto novo a cada desenho; a chave delas é a dependência estável (como no Cobrir).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item.alimentoId, item.gramas, buscados, grupoBuscado, chaveRestricoes, versaoDaBase, meus],
  )

  const mudou = !mesmaSelecao(selecionados, buscados) || mesmoGrupo !== grupoBuscado
  const alternar = (chave: ChaveNutrienteAlimento) => setSelecionados((atual) => (atual.includes(chave) ? atual.filter((k) => k !== chave) : [...atual, chave]))
  const buscar = () => {
    if (selecionados.length === 0) return
    setBuscados(selecionados)
    setGrupoBuscado(mesmoGrupo)
    setTodos(false)
  }
  const grupo = grupoDeSubstituicao(alimento).nome
  const outros = OUTROS_NUTRIENTES_DA_BUSCA.filter((k) => !selecionados.includes(k))
  const candidatos = resultado.tipo === 'lista' ? resultado.candidatos : []
  const visiveis = todos ? candidatos : candidatos.slice(0, NA_PRIMEIRA_VISTA)
  const nomesBuscados = listaComE(buscados.map((k) => infoDoNutriente(k).curto))
  const unidade = unidadeDo(alimento)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <span id={idRotulo} className="text-sm font-semibold text-foreground">
          Selecione um ou mais nutrientes
        </span>
        <div role="group" aria-labelledby={idRotulo} className="flex flex-wrap gap-2">
          {MACROS_DA_BUSCA.map((chave) => (
            <ChipAlternavel key={chave} ligado={selecionados.includes(chave)} aoAlternar={() => alternar(chave)}>
              {infoDoNutriente(chave).nome}
            </ChipAlternavel>
          ))}
        </div>

        {/* A lista nativa: no celular abre do jeito do aparelho, e o teclado funciona em todo lugar (como "Adicionar em", no Cobrir). */}
        <label htmlFor={idOutro} className="sr-only">
          Outro nutriente
        </label>
        <div className="relative flex min-h-11 items-center rounded-md border border-input bg-card py-2 pl-3 pr-9 text-base text-muted-foreground has-[:focus-visible]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring sm:min-h-10 sm:text-sm sm:pointer-coarse:min-h-11 sm:pointer-coarse:text-base">
          <span aria-hidden="true" className="flex min-w-0 items-center gap-2">
            <Search className="size-4 shrink-0" />
            <span className="truncate">Outro nutriente: fibra, cálcio, potássio…</span>
          </span>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2" />
          <select
            id={idOutro}
            value=""
            onChange={(e) => {
              const chave = OUTROS_NUTRIENTES_DA_BUSCA.find((k) => k === e.target.value)
              if (chave) setSelecionados((atual) => (atual.includes(chave) ? atual : [...atual, chave]))
            }}
            className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
          >
            <option value="">Outro nutriente</option>
            {outros.map((k) => (
              <option key={k} value={k}>
                {infoDoNutriente(k).nome}
              </option>
            ))}
          </select>
        </div>

        {selecionados.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-foreground">Nutrientes selecionados</span>
            <ul aria-label="Nutrientes selecionados" className="flex flex-wrap gap-2">
              {selecionados.map((k) => (
                <li key={k}>
                  <Badge variant="muted" className="gap-0.5 py-0 pl-3 pr-0 text-sm font-medium text-foreground">
                    {infoDoNutriente(k).nome}
                    <Button variant="ghost" size="iconsm" className="sm:size-7" aria-label={`Tirar ${infoDoNutriente(k).nome}`} onClick={() => alternar(k)}>
                      <X aria-hidden="true" />
                    </Button>
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <label className="flex items-center gap-3 text-sm text-foreground max-sm:min-h-11">
          <Switch checked={mesmoGrupo} onCheckedChange={setMesmoGrupo} aria-label={`Só do mesmo grupo: ${grupo}`} />
          <span className="min-w-0 break-words">{`Só do mesmo grupo: ${grupo}`}</span>
        </label>

        <div>
          <Button disabled={selecionados.length === 0} onClick={buscar}>
            Buscar alimentos
          </Button>
        </div>
      </div>

      <section aria-label="Substitutos encontrados" className="flex flex-col gap-3 border-t border-border pt-4">
        <div aria-live="polite" className="flex flex-col gap-0.5">
          {resultado.tipo === 'lista' ? (
            <>
              <p className="font-semibold text-heading">{`${candidatos.length} ${candidatos.length === 1 ? 'alimento' : 'alimentos'}`}</p>
              <p className="text-sm text-muted-foreground">
                {`Mesma quantidade de ${nomesBuscados} que ${formatarNumero(item.gramas, 0)} ${unidade} · ${grupoBuscado ? 'mesmo grupo' : 'todos os grupos'}`}
              </p>
            </>
          ) : null}
        </div>

        {mudou ? (
          <Alert variant="warning">
            <TriangleAlert aria-hidden="true" />
            <p>Os nutrientes mudaram. Busque de novo para atualizar a lista.</p>
          </Alert>
        ) : null}

        {estadoDaBase === 'carregando' ? <p className="text-xs text-muted-foreground">Parte da base ainda está carregando; a lista pode crescer.</p> : null}
        {estadoDaBase === 'erro' ? <p className="text-xs text-warningtext">Parte da base não carregou; a lista pode estar incompleta.</p> : null}

        {resultado.tipo === 'sem-alvo' ? (
          <p className="rounded-lg bg-muted p-3.5 text-sm text-foreground">{resultado.motivo}</p>
        ) : candidatos.length === 0 ? (
          <p className="rounded-lg bg-muted p-3.5 text-sm text-foreground">{mensagemSemCandidato(resultado.restricaoTirou)}</p>
        ) : (
          <ul aria-label="Candidatos" className="flex flex-col">
            {visiveis.map((c) => (
              <CartaoCandidato
                key={c.alimento.id}
                candidato={c}
                vaga={vagaParaOpcao(item, c.alimento.id)}
                aoComparar={() => setComparando(c)}
                aoAdicionarOpcao={() => aoAdicionarOpcao(c)}
                aoSubstituir={() => aoSubstituir(c)}
              />
            ))}
          </ul>
        )}

        {candidatos.length > NA_PRIMEIRA_VISTA ? (
          <Button variant="link" size="sm" className="self-center max-sm:min-h-11" onClick={() => setTodos((v) => !v)}>
            {todos ? 'Mostrar menos' : `Mostrar mais ${candidatos.length - NA_PRIMEIRA_VISTA}`}
          </Button>
        ) : null}
      </section>

      <JanelaComparar
        original={{ alimento, gramas: item.gramas, textoDaMedida: medidaNaLinha(item)?.texto ?? null }}
        substituto={comparando}
        escolhidos={buscados}
        vaga={comparando ? vagaParaOpcao(item, comparando.alimento.id) : 'livre'}
        aoAdicionarOpcao={() => {
          if (comparando) aoAdicionarOpcao(comparando)
          setComparando(null)
        }}
        aoSubstituir={() => {
          if (comparando) aoSubstituir(comparando)
          setComparando(null)
        }}
        aoFechar={() => setComparando(null)}
      />
    </div>
  )
}
