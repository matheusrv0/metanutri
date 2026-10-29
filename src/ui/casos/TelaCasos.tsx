import { CircleCheck, FolderOpen, Info, Plus, Search, TriangleAlert, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ModoPlano } from '@/domain/tipos.ts'
import { EscolherModo } from '../caso/EscolherModo.tsx'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card } from '@ds/componentes/display/card.tsx'
import { useCasos } from '../estado/contextoCasos.ts'
import { usePacientesOpcional } from '../estado/contextoPacientes.ts'
import { CartaoCaso } from './CartaoCaso.tsx'
import { DialogoExcluir } from './DialogoExcluir.tsx'
import { DialogoRenomear } from './DialogoRenomear.tsx'

interface TelaCasosProps {
  readonly aoAbrir: (id: string) => void
  readonly aoNovoCaso: (modo: ModoPlano) => void
}

type Acao = { readonly tipo: 'renomear' | 'excluir'; readonly id: string; readonly nome: string }

const nomeVisivel = (nome: string) => nome.trim() || 'Plano sem nome'

/** "Reeducação" e "reeducacao" são a mesma busca. */
const paraBusca = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** Lista de planos salvos: abrir, criar, renomear, duplicar e excluir (CA-50), com avisos de CB-08 e CB-09. */
export function TelaCasos({ aoAbrir, aoNovoCaso }: TelaCasosProps) {
  const { casos, repositorio, atualizar, avisoArmazenamento, mudouEmOutraAba, dispensarAvisoOutraAba } = useCasos()
  const pacientes = usePacientesOpcional()
  const [acao, setAcao] = useState<Acao | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [busca, setBusca] = useState('')

  // M-007 (spec ajustes-mobile): o paciente de cada plano, para o cartão e para a busca.
  const nomeDoPaciente = useMemo(() => new Map((pacientes?.pacientes ?? []).map((p) => [p.id, p.nome.trim()])), [pacientes])
  const pacienteDe = (pacienteId: string | null) => (pacienteId ? (nomeDoPaciente.get(pacienteId) ?? null) : null)

  // M-030: com 30 planos, a lista passava de 4.800 px no celular. A busca acha pelo nome do plano ou do paciente.
  const termo = paraBusca(busca.trim())
  const visiveis = termo === '' ? casos : casos.filter((c) => paraBusca(`${c.nome} ${pacienteDe(c.pacienteId) ?? ''}`).includes(termo))

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
          <button type="button" onClick={dispensarAvisoOutraAba} aria-label="Fechar aviso" className="rounded-sm p-0.5 hover:bg-card/60">
            <X className="size-4" aria-hidden="true" />
          </button>
        </Alert>
      ) : null}

      {mensagem ? (
        <Alert variant="success">
          <CircleCheck aria-hidden="true" />
          <p className="flex-1">{mensagem}</p>
          <button type="button" onClick={() => setMensagem(null)} aria-label="Fechar aviso" className="rounded-sm p-0.5 hover:bg-card/60">
            <X className="size-4" aria-hidden="true" />
          </button>
        </Alert>
      ) : null}

      {casos.length === 0 ? (
        <Card className="items-center gap-3 py-12 text-center">
          <span className="flex size-11 items-center justify-center rounded-full border border-primary/25 bg-lightprimary text-primary">
            <FolderOpen className="size-6" aria-hidden="true" />
          </span>
          <h2 className="card-title">Nenhum plano ainda</h2>
          <p className="max-w-[48ch] text-sm text-muted-foreground">
            Cada plano reúne os dados do paciente, as refeições e a adequação. Crie o primeiro.
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
        <>
          <Card className="gap-4">
            <CampoTexto rotulo="Buscar plano" valor={busca} aoMudar={setBusca} placeholder="Nome do plano ou do paciente…" />
          </Card>
          {visiveis.length === 0 ? (
            <Card className="items-center gap-3 py-12 text-center">
              <span className="flex size-11 items-center justify-center rounded-full border border-primary/25 bg-lightprimary text-primary">
                <Search className="size-6" aria-hidden="true" />
              </span>
              <h2 className="card-title">Nenhum plano com esse nome</h2>
              <p className="max-w-[48ch] text-sm text-muted-foreground">Confira o nome ou busque pelo paciente.</p>
            </Card>
          ) : (
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 2xl:grid-cols-3" aria-label="Planos salvos">
              {visiveis.map((c) => (
                <li key={c.id} className="min-w-0">
                  <CartaoCaso
                    caso={c}
                    paciente={pacienteDe(c.pacienteId)}
                    aoAbrir={() => aoAbrir(c.id)}
                    aoRenomear={() => setAcao({ tipo: 'renomear', id: c.id, nome: c.nome })}
                    aoDuplicar={() => duplicar(c.id)}
                    aoExcluir={() => setAcao({ tipo: 'excluir', id: c.id, nome: nomeVisivel(c.nome) })}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <DialogoRenomear nomeAtual={acao?.tipo === 'renomear' ? acao.nome : null} aoConfirmar={renomear} aoFechar={fechar} />
      <DialogoExcluir nome={acao?.tipo === 'excluir' ? acao.nome : null} aoConfirmar={excluir} aoFechar={fechar} />
    </div>
  )
}
