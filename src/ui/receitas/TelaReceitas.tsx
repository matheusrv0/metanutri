import { Copy, CookingPot, MoreHorizontal, Pencil, Plus, Trash } from 'lucide-react'
import { useState } from 'react'
import { textoDoRendimento } from '@/domain/receitaNoPlano.ts'
import { copiaParaOPlano, filtrarReceitas, totaisDaPorcao, type Receita } from '@/domain/receitas.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Card } from '@ds/componentes/display/card.tsx'
import { LinhaLista } from '@ds/componentes/display/LinhaLista.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ds/componentes/overlay/dropdown-menu.tsx'
import { DialogoExcluir } from '../casos/DialogoExcluir.tsx'
import { useReceitas } from '../estado/usarReceitas.ts'
import { EditorReceita } from './EditorReceita.tsx'

/**
 * "Rende 2 unidades (120 g cada) · 204 kcal por unidade"; energia que falta num ingrediente leva a marca †, e sem
 * nenhum dado de energia, travessão: falta de dado nunca é zero (CA-861).
 */
function detalheDa(receita: Receita): string {
  const copia = copiaParaOPlano(receita)
  const energia = totaisDaPorcao(copia, buscarAlimento).nutrientes.energia_kcal
  const nome = receita.nomeDaPorcao.trim() || 'porção'
  const kcal = energia.semDado > 0 && energia.total === 0 ? '— kcal' : `${formatarNumero(energia.total, 0)} kcal${energia.semDado > 0 ? '†' : ''}`
  return `${textoDoRendimento(copia)} · ${kcal} por ${nome}`
}

/** As receitas da conta (spec receitas-com-calculo, US-RC1): lista, busca e o editor no mesmo lugar (D-272). */
export function TelaReceitas() {
  const { repositorio, lista, recarregar } = useReceitas()
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<Receita | 'nova' | null>(null)
  const [excluindo, setExcluindo] = useState<Receita | null>(null)
  // Última ação concluída: fica escrita na tela e o leitor de tela anuncia.
  const [mensagem, setMensagem] = useState<string | null>(null)

  if (editando !== null) {
    return (
      <EditorReceita
        receita={editando === 'nova' ? null : editando}
        aoCancelar={() => setEditando(null)}
        aoSalvar={(dados) => {
          const salva = repositorio.salvar(editando === 'nova' ? dados : { ...dados, id: editando.id })
          recarregar()
          setEditando(null)
          setMensagem(`Receita “${salva.nome}” salva.`)
        }}
      />
    )
  }

  const visiveis = filtrarReceitas(lista, busca)

  const duplicar = (receita: Receita) => {
    const copia = repositorio.duplicar(receita.id)
    recarregar()
    if (copia) setMensagem(`Receita “${copia.nome}” criada.`)
  }

  const excluir = () => {
    if (!excluindo) return
    repositorio.excluir(excluindo.id)
    recarregar()
    setMensagem(`Receita “${excluindo.nome}” excluída.`)
    setExcluindo(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 basis-56">
            <CampoTexto rotulo="Buscar receita" valor={busca} aoMudar={setBusca} placeholder="Nome da receita…" />
          </div>
          <Button onClick={() => setEditando('nova')}>
            <Plus aria-hidden="true" />
            Nova receita
          </Button>
        </div>
        {/* Sempre montado: a região viva só anuncia o que muda dentro dela. */}
        <p role="status" className={mensagem ? 'text-sm text-muted-foreground' : 'sr-only'}>
          {mensagem}
        </p>

        {lista.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-full border border-primary/25 bg-lightprimary text-primary">
              <CookingPot className="size-6" aria-hidden="true" />
            </span>
            <p className="text-sm text-muted-foreground">Nenhuma receita ainda.</p>
          </div>
        ) : visiveis.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma receita com esse nome.</p>
        ) : (
          <ul aria-label="Receitas" className="flex flex-col gap-2">
            {visiveis.map((r) => (
              <li key={r.id}>
                <LinhaLista
                  titulo={r.nome}
                  detalhe={<span className="numeros">{detalheDa(r)}</span>}
                  fim={
                    <span className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="iconsm" onClick={() => setEditando(r)} aria-label={`Editar ${r.nome}`}>
                        <Pencil aria-hidden="true" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="iconsm" aria-label={`Mais ações de ${r.nome}`}>
                            <MoreHorizontal aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => duplicar(r)}>
                            <Copy aria-hidden="true" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setExcluindo(r)}>
                            <Trash aria-hidden="true" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {repositorio.persistente ? null : (
        <Alert variant="warning">
          <CookingPot aria-hidden="true" />
          <p>Este navegador não guarda dados: as receitas valem só enquanto a aba estiver aberta.</p>
        </Alert>
      )}

      <DialogoExcluir
        nome={excluindo?.nome ?? null}
        descricao="Os planos que já usam esta receita continuam com ela. Não dá para desfazer."
        acao="Excluir receita"
        aoConfirmar={excluir}
        aoFechar={() => setExcluindo(null)}
      />
    </div>
  )
}
