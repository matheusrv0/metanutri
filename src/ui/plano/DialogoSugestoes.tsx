import { ArrowDown, ArrowUp, Plus, TriangleAlert, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { buscarAlimentos, medidaEquivalente } from '@/domain/busca.ts'
import { NOME_DO_TIPO, SUGESTOES_PADRAO, sugestoesProntas, type SugestaoAlimento, type TipoRefeicao } from '@/domain/sugestoes.ts'
import { alimentosComProdutos, buscarAlimento } from '@/domain/tabelas.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'

interface DialogoSugestoesProps {
  readonly tipo: TipoRefeicao
  readonly lista: readonly SugestaoAlimento[]
  /** `false` quando o aparelho não guardou: o diálogo avisa e continua aberto (CB-70). */
  readonly aoSalvar: (lista: readonly SugestaoAlimento[]) => boolean
  readonly aoFechar: () => void
}

/** "4 colheres de sopa · 100 g"; sem medida caseira, só as gramas. */
function porcao(alimentoId: number, gramas: number): string {
  const medida = medidaEquivalente(alimentoId, gramas)
  const g = `${formatarNumero(gramas, 0)} g`
  return medida ? `${medida.texto} · ${g}` : g
}

const nomeDe = (alimentoId: number) => buscarAlimento(alimentoId)?.descricao ?? 'Alimento removido'

/**
 * CA-241 a CA-243: tirar, acrescentar, mudar a ordem e voltar à lista padrão.
 * Nada vale até Salvar. Montado só enquanto aberto: fechar descarta o rascunho.
 */
export function DialogoSugestoes({ tipo, lista, aoSalvar, aoFechar }: DialogoSugestoesProps) {
  const [rascunho, setRascunho] = useState<readonly SugestaoAlimento[]>(() =>
    sugestoesProntas(lista, buscarAlimento)
      .map(({ alimentoId, gramas }) => ({ alimentoId, gramas }))
      // O mesmo alimento não aparece duas vezes: fica a primeira ocorrência.
      .filter((s, i, todas) => todas.findIndex((o) => o.alimentoId === s.alimentoId) === i),
  )
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [naoSalvou, setNaoSalvou] = useState(false)
  /** Quem mexeu por último nas setas: o foco volta para ele depois de a lista se reordenar. */
  const [foco, setFoco] = useState<{ readonly alimentoId: number; readonly acao: 'subir' | 'descer'; readonly vez: number } | null>(null)
  const [elementoLista, setElementoLista] = useState<HTMLOListElement | null>(null)

  useEffect(() => {
    if (!foco || !elementoLista) return
    const botao = (acao: string) => elementoLista.querySelector<HTMLButtonElement>(`[data-sugestao="${foco.alimentoId}"][data-acao="${acao}"]`)
    const pedido = botao(foco.acao)
    const alvo = pedido && !pedido.disabled ? pedido : botao(foco.acao === 'subir' ? 'descer' : 'subir')
    alvo?.focus()
  }, [foco, elementoLista])

  /** Todo caminho que muda a lista passa por aqui: o aviso de "não salvou" deixa de valer. */
  const mudarRascunho = (nova: readonly SugestaoAlimento[]) => {
    setRascunho(nova)
    setNaoSalvou(false)
  }

  const { resultados, aviso } = buscarAlimentos(texto, alimentosComProdutos())
  const primeiro = resultados[0]
  const jaEstaNaLista = primeiro !== undefined && rascunho.some((s) => s.alimentoId === primeiro.alimento.id)

  const mover = (de: number, para: number) => {
    const nova = [...rascunho]
    const [item] = nova.splice(de, 1)
    if (!item) return
    nova.splice(para, 0, item)
    mudarRascunho(nova)
    setFoco((f) => ({ alimentoId: item.alimentoId, acao: para < de ? 'subir' : 'descer', vez: (f?.vez ?? 0) + 1 }))
  }

  const adicionar = (evento: FormEvent) => {
    evento.preventDefault()
    if (texto.trim() === '') return
    if (!primeiro) {
      setErro(aviso ?? 'Nenhum alimento encontrado com esse nome. Nada foi adicionado.')
      return
    }
    if (primeiro.gramas === null) {
      setErro(primeiro.aviso ?? 'Essa medida não existe para este alimento. Informe em gramas.')
      return
    }
    if (rascunho.some((s) => s.alimentoId === primeiro.alimento.id)) {
      setErro('Esse alimento já está na lista.')
      return
    }
    mudarRascunho([...rascunho, { alimentoId: primeiro.alimento.id, gramas: primeiro.gramas }])
    setTexto('')
    setErro(null)
  }

  const salvar = () => {
    if (aoSalvar(rascunho)) aoFechar()
    else setNaoSalvou(true)
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent className="max-h-[90vh] grid-cols-[minmax(0,1fr)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{`Sugestões para ${NOME_DO_TIPO[tipo]}`}</DialogTitle>
          <DialogDescription>Valem para todas as refeições deste tipo, em todos os seus planos.</DialogDescription>
        </DialogHeader>

        {rascunho.length === 0 ? (
          <p className="text-sm text-muted-foreground">A lista está vazia. A refeição vai mostrar só a busca.</p>
        ) : (
          <ol ref={setElementoLista} aria-label="Sugestões, na ordem em que aparecem" className="flex min-w-0 flex-col gap-2">
            {rascunho.map((s, i) => {
              const nome = nomeDe(s.alimentoId)
              return (
                <li key={s.alimentoId} className="flex min-w-0 items-center gap-1 rounded-lg bg-muted py-1 pl-4 pr-1">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-heading">{nome}</span>
                    <span className="numeros block text-xs text-muted-foreground">{porcao(s.alimentoId, s.gramas)}</span>
                  </span>
                  <Button variant="ghost" size="icon" aria-label={`Subir ${nome}`} data-sugestao={s.alimentoId} data-acao="subir" disabled={i === 0} onClick={() => mover(i, i - 1)}>
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Descer ${nome}`} data-sugestao={s.alimentoId} data-acao="descer" disabled={i === rascunho.length - 1} onClick={() => mover(i, i + 1)}>
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Tirar ${nome}`} onClick={() => mudarRascunho(rascunho.filter((_, j) => j !== i))}>
                    <X aria-hidden="true" />
                  </Button>
                </li>
              )
            })}
          </ol>
        )}

        <form onSubmit={adicionar} className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <Input
              aria-label="Alimento para acrescentar"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value)
                setErro(null)
              }}
              placeholder="1 concha feijão preto…"
              className="min-w-0 flex-1"
            />
            <Button type="submit" variant="outline">
              <Plus aria-hidden="true" />
              Adicionar
            </Button>
          </div>
          {erro ? (
            <p role="alert" className="text-xs text-errortext">
              {erro}
            </p>
          ) : primeiro && primeiro.gramas !== null ? (
            <p className="numeros text-xs text-muted-foreground">
              {jaEstaNaLista ? `Já está na lista: ${primeiro.alimento.descricao}` : `Vai entrar: ${primeiro.alimento.descricao} — ${porcao(primeiro.alimento.id, primeiro.gramas)}`}
            </p>
          ) : null}
        </form>

        {naoSalvou ? (
          <Alert variant="warning" role="alert">
            <TriangleAlert aria-hidden="true" />
            <p>Não deu para salvar neste aparelho. As sugestões continuam como estavam.</p>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => mudarRascunho(SUGESTOES_PADRAO[tipo])}>
            Voltar à lista padrão
          </Button>
          <Button variant="ghost" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button onClick={salvar}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
