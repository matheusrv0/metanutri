import { Apple, Barcode, Pencil, Plus, Trash } from 'lucide-react'
import { useMemo, useState } from 'react'
import { dadosDoProduto, dadosEmBranco, produtoDosDados } from '@/domain/alimentoProprio.ts'
import { LIMITE_ALIMENTOS_PROPRIOS, MEUS_ALIMENTOS_NOVOS, produtoComoAlimento, type DadosAlimentoProprio, type Produto } from '@/domain/produtos.ts'
import { planosComAlimento } from '@/domain/usoDaConta.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { DialogoExcluir } from '../casos/DialogoExcluir.tsx'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { useCasosOpcional } from '../estado/contextoCasos.ts'
import { useMeusAlimentos } from '../estado/usarMeusAlimentos.ts'
import { DialogoAlimentoProprio } from './DialogoAlimentoProprio.tsx'
import { DialogoProduto } from './DialogoProduto.tsx'

const TIPO: Readonly<Record<NonNullable<Produto['tipo']>, string>> = { alimento: 'Alimento', preparacao: 'Preparação', rotulo: 'Rótulo' }

interface TelaProdutosProps {
  /** O formulário novo de "Meus alimentos" (D-383); padrão: a constante da publicação. */
  readonly formularioNovo?: boolean
}

/**
 * "Meus alimentos" (spec alimentos-e-gramaturas, D-383 a D-385): o que a nutricionista cadastra e a base não tem. Com o
 * formulário novo desligado (publicação 1), é o cadastro pelo rótulo de antes, com o nome novo.
 */
export function TelaProdutos({ formularioNovo = MEUS_ALIMENTOS_NOVOS }: TelaProdutosProps = {}) {
  const { repositorio, lista, salvar, excluir } = useMeusAlimentos()
  const casos = useCasosOpcional()
  const [busca, setBusca] = useState('')
  const [editandoRotulo, setEditandoRotulo] = useState<Produto | 'novo' | null>(null)
  const [editando, setEditando] = useState<{ readonly dados: DadosAlimentoProprio; readonly editando: boolean; readonly id?: number } | null>(null)
  const [excluindo, setExcluindo] = useState<Produto | null>(null)
  // Última ação concluída: fica escrita na tela e o leitor de tela anuncia.
  const [mensagem, setMensagem] = useState<string | null>(null)

  const produtos = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return lista.filter((p) => (termo === '' ? true : `${p.nome} ${p.marca}`.toLowerCase().includes(termo)))
  }, [lista, busca])

  // D-385: editar avisa em quantos planos o alimento está.
  const emPlanos = useMemo(() => {
    if (!editando?.id || !casos) return 0
    return planosComAlimento(
      casos.casos.map((c) => casos.repositorio.obter(c.id)?.plano),
      editando.id,
    )
  }, [editando, casos])

  const noLimite = lista.length >= LIMITE_ALIMENTOS_PROPRIOS

  const confirmarExclusao = () => {
    if (!excluindo) return
    excluir(excluindo.id)
    setExcluindo(null)
    setMensagem(`Alimento “${excluindo.nome}” excluído.`)
  }

  const salvarDoFormulario = (dados: DadosAlimentoProprio): string | null => {
    try {
      const salvo = salvar(produtoDosDados(dados, editando?.id))
      setEditando(null)
      setMensagem(`Alimento “${salvo.nome}” salvo.`)
      return null
    } catch (erro) {
      return erro instanceof Error ? erro.message : 'Não foi possível salvar. Tente de novo.'
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Meus alimentos</CardTitle>
          <CardDescription>
            {formularioNovo
              ? 'O que a base não tem: um alimento da sua região, uma preparação ou um produto pelo rótulo. Cadastre uma vez e use nos planos como qualquer alimento.'
              : 'Produtos industrializados não estão na Base MetaNutri. Cadastre o rótulo uma vez e use o produto nos planos como qualquer alimento.'}
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <CampoTexto rotulo="Buscar" valor={busca} aoMudar={setBusca} placeholder="Nome ou marca…" />
          </div>
          <Button
            disabled={noLimite}
            onClick={() => (formularioNovo ? setEditando({ dados: dadosEmBranco('alimento'), editando: false }) : setEditandoRotulo('novo'))}
          >
            <Plus aria-hidden="true" />
            {formularioNovo ? 'Novo alimento' : 'Cadastrar pelo rótulo'}
          </Button>
        </div>
        {noLimite ? <p className="text-sm text-warningtext">{`Você chegou a ${LIMITE_ALIMENTOS_PROPRIOS.toLocaleString('pt-BR')} alimentos, o limite da conta. Exclua um que não usa mais para cadastrar outro.`}</p> : null}
        {/* Sempre montado: a região viva só anuncia o que muda dentro dela. */}
        <p role="status" className={mensagem ? 'text-sm text-muted-foreground' : 'sr-only'}>
          {mensagem}
        </p>
      </Card>

      {produtos.length === 0 ? (
        <Card className="items-center gap-3 py-12 text-center">
          <span className="flex size-11 items-center justify-center rounded-full border border-primary/25 bg-lightprimary text-primary">
            {formularioNovo ? <Apple className="size-6" aria-hidden="true" /> : <Barcode className="size-6" aria-hidden="true" />}
          </span>
          <h2 className="card-title">{busca.trim() ? 'Nenhum alimento com esse nome' : 'Nenhum alimento cadastrado'}</h2>
          <p className="max-w-[52ch] text-sm text-muted-foreground">
            {formularioNovo
              ? 'Valores por 100 g ou na porção do rótulo; as medidas caseiras que você cadastrar aparecem na linha do plano.'
              : 'Copie a tabela nutricional e a porção do rótulo. A conversão para 100 g é automática.'}
          </p>
        </Card>
      ) : (
        // M-001 (spec ajustes-mobile, D-800): coluna que encolhe também no celular. Com a coluna `auto`, um nome sem espaço
        // alargava cada cartão até 1.009 px e a página inteira rolava para o lado.
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2" aria-label="Alimentos cadastrados">
          {produtos.map((p) => {
            const alimento = produtoComoAlimento(p)
            const kcal = alimento.nutrientes.energia_kcal
            const unidade = alimento.unidade ?? 'g'
            const porCemNaBase = (p.base ?? 'porcao') === 'por100'
            const tipo = TIPO[p.tipo ?? 'rotulo']
            const subtitulo = [tipo, p.tipo === 'rotulo' || !p.tipo ? p.marca.trim() || 'Sem marca' : (p.grupo ?? '')].filter(Boolean).join(' · ')
            return (
              <li key={p.id} className="min-w-0">
                <Card className="gap-3 p-5">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      {/* D-801: o nome quebra em até 2 linhas (também sem espaço) e vai inteiro no `title`. */}
                      <h2 className="card-title line-clamp-2 break-words text-base" title={p.nome}>
                        {p.nome}
                      </h2>
                      <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{subtitulo}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="iconsm"
                      onClick={() => (formularioNovo ? setEditando({ dados: dadosDoProduto(p), editando: true, id: p.id }) : setEditandoRotulo(p))}
                      aria-label={`Editar ${p.nome}`}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="iconsm" onClick={() => setExcluindo(p)} aria-label={`Excluir ${p.nome}`}>
                      <Trash aria-hidden="true" />
                    </Button>
                  </div>
                  {/* M-001: no cartão estreito (celular e tablet), uma linha por dado; a porção com a medida caseira, em meia
                      coluna, virava uma palavra por linha. */}
                  <dl className="numeros grid grid-cols-1 gap-x-4 gap-y-1 border-t border-border pt-3 text-sm lg:grid-cols-2">
                    <div className="flex justify-between gap-3">
                      <dt className="shrink-0 text-muted-foreground">{porCemNaBase ? 'Valores' : 'Porção'}</dt>
                      <dd className="min-w-0 text-right [overflow-wrap:anywhere]">{porCemNaBase ? `por 100 ${unidade}` : `${formatarNumero(p.porcaoG, 0)} ${unidade}${p.medidaCaseira.trim() ? ` · ${p.medidaCaseira.trim()}` : ''}`}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="shrink-0 text-muted-foreground">{`Por 100 ${unidade}`}</dt>
                      <dd>{kcal === null ? '— kcal' : `${formatarNumero(kcal, 0)} kcal`}</dd>
                    </div>
                  </dl>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {repositorio.persistente ? null : (
        <Alert variant="warning">
          <Barcode aria-hidden="true" />
          <p>Este navegador não guarda dados: os alimentos valem só enquanto a aba estiver aberta.</p>
        </Alert>
      )}

      <DialogoProduto
        produto={editandoRotulo}
        aoFechar={() => setEditandoRotulo(null)}
        aoSalvar={(dados) => {
          try {
            const salvo = salvar(dados)
            setEditandoRotulo(null)
            setMensagem(`Produto “${salvo.nome}” salvo.`)
          } catch (erro) {
            setMensagem(erro instanceof Error ? erro.message : 'Não foi possível salvar. Tente de novo.')
          }
        }}
      />

      <DialogoAlimentoProprio inicial={editando} emPlanos={emPlanos} aoSalvar={salvarDoFormulario} aoFechar={() => setEditando(null)} />

      <DialogoExcluir
        nome={excluindo?.nome ?? null}
        descricao="Os planos que usam este alimento vão mostrar “Alimento excluído” no lugar dele, sem valores. Não é possível desfazer."
        acao="Excluir alimento"
        aoConfirmar={confirmarExclusao}
        aoFechar={() => setExcluindo(null)}
      />
    </div>
  )
}
