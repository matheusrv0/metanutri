import { Barcode, Pencil, Plus, Trash } from 'lucide-react'
import { useMemo, useState } from 'react'
import { criarRepositorioProdutos, produtoComoAlimento, type Produto } from '@/domain/produtos.ts'
import { registrarProdutos } from '@/domain/tabelas.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { DialogoExcluir } from '../casos/DialogoExcluir.tsx'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { armazenamentoLocal } from '../estado/armazenamentoLocal.ts'
import { DialogoProduto } from './DialogoProduto.tsx'

/** Meus produtos: o que vem de rótulo e não existe na tabela de composição. */
export function TelaProdutos() {
  const repositorio = useMemo(() => criarRepositorioProdutos(armazenamentoLocal()), [])
  const [versao, setVersao] = useState(0)
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<Produto | 'novo' | null>(null)
  const [excluindo, setExcluindo] = useState<Produto | null>(null)
  // Última ação concluída: fica escrita na tela e o leitor de tela anuncia.
  const [mensagem, setMensagem] = useState<string | null>(null)

  const produtos = useMemo(() => {
    void versao
    const termo = busca.trim().toLowerCase()
    return repositorio.listar().filter((p) => (termo === '' ? true : `${p.nome} ${p.marca}`.toLowerCase().includes(termo)))
  }, [repositorio, versao, busca])

  const atualizar = () => setVersao((v) => v + 1)

  const excluir = () => {
    if (!excluindo) return
    repositorio.excluir(excluindo.id)
    setExcluindo(null)
    setMensagem(`Produto “${excluindo.nome}” excluído.`)
    atualizar()
  }

  // Mantém a busca de alimentos em dia com o que está cadastrado.
  registrarProdutos(repositorio.listar().map(produtoComoAlimento))

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Meus produtos</CardTitle>
          <CardDescription>
            Industrializado não está na tabela de composição. Cadastre pelo rótulo uma vez e use nos planos como qualquer alimento.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <CampoTexto rotulo="Buscar produto" valor={busca} aoMudar={setBusca} placeholder="Nome ou marca…" />
          </div>
          <Button onClick={() => setEditando('novo')}>
            <Plus aria-hidden="true" />
            Cadastrar pelo rótulo
          </Button>
        </div>
        {/* Sempre montado: a região viva só anuncia o que muda dentro dela. */}
        <p role="status" className={mensagem ? 'text-sm text-muted-foreground' : 'sr-only'}>
          {mensagem}
        </p>
      </Card>

      {produtos.length === 0 ? (
        <Card className="items-center gap-3 py-12 text-center">
          <span className="flex size-11 items-center justify-center rounded-full border border-primary/25 bg-lightprimary text-primary">
            <Barcode className="size-6" aria-hidden="true" />
          </span>
          <h2 className="card-title">{busca.trim() ? 'Nenhum produto com esse nome' : 'Nenhum produto cadastrado'}</h2>
          <p className="max-w-[52ch] text-sm text-muted-foreground">
            Pegue a embalagem, copie a tabela nutricional e a porção declarada. O sistema converte para 100 g sozinho.
          </p>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2" aria-label="Produtos cadastrados">
          {produtos.map((p) => {
            const alimento = produtoComoAlimento(p)
            const kcal = alimento.nutrientes.energia_kcal
            return (
              <li key={p.id}>
                <Card className="gap-3 p-5">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="card-title truncate text-base">{p.nome}</h2>
                      <p className="text-xs text-muted-foreground">{p.marca.trim() || 'Sem marca'}</p>
                    </div>
                    <Button variant="ghost" size="iconsm" onClick={() => setEditando(p)} aria-label={`Editar ${p.nome}`}>
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" size="iconsm" onClick={() => setExcluindo(p)} aria-label={`Excluir ${p.nome}`}>
                      <Trash aria-hidden="true" />
                    </Button>
                  </div>
                  <dl className="numeros grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border pt-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Porção</dt>
                      <dd>{`${formatarNumero(p.porcaoG, 0)} g${p.medidaCaseira.trim() ? ` · ${p.medidaCaseira.trim()}` : ''}`}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Por 100 g</dt>
                      <dd>{kcal === null ? '—' : `${formatarNumero(kcal, 0)} kcal`}</dd>
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
          <p>Este navegador não guarda dados: os produtos valem só enquanto a aba estiver aberta.</p>
        </Alert>
      )}

      <DialogoProduto
        produto={editando}
        aoFechar={() => setEditando(null)}
        aoSalvar={(dados) => {
          const salvo = repositorio.salvar(dados)
          atualizar()
          setEditando(null)
          setMensagem(`Produto “${salvo.nome}” salvo.`)
        }}
      />

      <DialogoExcluir
        nome={excluindo?.nome ?? null}
        descricao="Plano que usa este produto passa a mostrar “Alimento não encontrado” nessa linha. Não dá para desfazer."
        acao="Excluir produto"
        aoConfirmar={excluir}
        aoFechar={() => setExcluindo(null)}
      />
    </div>
  )
}
