import { CircleCheck, FolderOpen, Info, Plus, TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'
import type { ModoPlano } from '@/domain/tipos.ts'
import { EscolherModo } from '../caso/EscolherModo.tsx'
import { Alert } from '../componentes/alert.tsx'
import { Button } from '../componentes/button.tsx'
import { Card } from '../componentes/card.tsx'
import { useCasos } from '../estado/contextoCasos.ts'
import { CartaoCaso } from './CartaoCaso.tsx'
import { DialogoExcluir } from './DialogoExcluir.tsx'
import { DialogoRenomear } from './DialogoRenomear.tsx'

interface TelaCasosProps {
  readonly aoAbrir: (id: string) => void
  readonly aoNovoCaso: (modo: ModoPlano) => void
}

type Acao = { readonly tipo: 'renomear' | 'excluir'; readonly id: string; readonly nome: string }

const nomeVisivel = (nome: string) => nome.trim() || 'Plano sem nome'

/** Lista de planos salvos: abrir, criar, renomear, duplicar e excluir (CA-50), com avisos de CB-08 e CB-09. */
export function TelaCasos({ aoAbrir, aoNovoCaso }: TelaCasosProps) {
  const { casos, repositorio, atualizar, avisoArmazenamento, mudouEmOutraAba, dispensarAvisoOutraAba } = useCasos()
  const [acao, setAcao] = useState<Acao | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)

  const fechar = () => setAcao(null)

  const renomear = (nome: string) => {
    if (acao?.tipo !== 'renomear') return
    repositorio.renomear(acao.id, nome)
    atualizar()
    setMensagem(`Plano renomeado para “${nomeVisivel(nome)}”.`)
    fechar()
  }

  const duplicar = (id: string) => {
    const copia = repositorio.duplicar(id)
    atualizar()
    setMensagem(`Cópia criada: “${copia.caso.nome}”.`)
  }

  const excluir = () => {
    if (acao?.tipo !== 'excluir') return
    repositorio.excluir(acao.id)
    atualizar()
    setMensagem(`Plano “${acao.nome}” excluído.`)
    fechar()
  }

  return (
    <div className="flex flex-col gap-6">
      {avisoArmazenamento ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <p>{avisoArmazenamento} Para não perder o trabalho, exporte o plano em Word antes de fechar.</p>
        </Alert>
      ) : null}

      {mudouEmOutraAba ? (
        <Alert variant="info">
          <Info aria-hidden="true" />
          <p className="flex-1">A lista foi atualizada com mudanças feitas em outra aba do navegador.</p>
          <button type="button" onClick={dispensarAvisoOutraAba} aria-label="Fechar aviso" className="rounded-xs p-0.5 hover:bg-card/60">
            <X className="size-4" aria-hidden="true" />
          </button>
        </Alert>
      ) : null}

      {mensagem ? (
        <Alert variant="success">
          <CircleCheck aria-hidden="true" />
          <p className="flex-1">{mensagem}</p>
          <button type="button" onClick={() => setMensagem(null)} aria-label="Fechar aviso" className="rounded-xs p-0.5 hover:bg-card/60">
            <X className="size-4" aria-hidden="true" />
          </button>
        </Alert>
      ) : null}

      {casos.length === 0 ? (
        <Card className="items-center gap-3 py-12 text-center">
          <span className="flex size-11 items-center justify-center rounded-xs border border-primary/25 bg-lightprimary text-primary">
            <FolderOpen className="size-6" aria-hidden="true" />
          </span>
          <h2 className="card-title">Nenhum plano ainda</h2>
          <p className="max-w-[48ch] text-sm text-muted-foreground">
            Um plano guarda os dados da pessoa, o plano alimentar e a adequação de micronutrientes. Comece criando o primeiro.
          </p>
          <EscolherModo
            aoEscolher={aoNovoCaso}
            gatilho={
              <Button>
                <Plus aria-hidden="true" />
                Criar primeiro plano
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3" aria-label="Planos salvos">
          {casos.map((c) => (
            <li key={c.id}>
              <CartaoCaso
                caso={c}
                aoAbrir={() => aoAbrir(c.id)}
                aoRenomear={() => setAcao({ tipo: 'renomear', id: c.id, nome: c.nome })}
                aoDuplicar={() => duplicar(c.id)}
                aoExcluir={() => setAcao({ tipo: 'excluir', id: c.id, nome: nomeVisivel(c.nome) })}
              />
            </li>
          ))}
        </ul>
      )}

      <DialogoRenomear nomeAtual={acao?.tipo === 'renomear' ? acao.nome : null} aoConfirmar={renomear} aoFechar={fechar} />
      <DialogoExcluir nome={acao?.tipo === 'excluir' ? acao.nome : null} aoConfirmar={excluir} aoFechar={fechar} />
    </div>
  )
}
