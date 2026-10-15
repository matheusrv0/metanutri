import { LayoutTemplate, Plus, Printer } from 'lucide-react'
import { useId, useState } from 'react'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { dataDeHoje } from '@/domain/documentoDoPaciente.ts'
import type { Paciente } from '@/domain/pacientes.ts'
import { criarRepositorioModelosSuplemento, criarSuplemento, suplementoDoModelo, suplementosParaDocumento, type Suplemento } from '@/domain/suplementos.ts'
import { Card, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { useArmazenamento } from '../estado/contextoArmazenamento.ts'
import { DialogoDocumento } from '../exportar/DialogoDocumento.tsx'
import { FolhaSuplementos } from '../exportar/FolhaSuplementos.tsx'
import { DialogoModelosSuplemento } from './DialogoModelosSuplemento.tsx'
import { LinhaSuplemento } from './LinhaSuplemento.tsx'

interface CartaoSuplementosProps {
  readonly paciente: Paciente
  /** Quem assina a folha (D-167). */
  readonly assinatura: AssinaturaDoPlano | null
  readonly aoAlterar: (mudanca: Partial<Paciente>) => void
}

type Janela = { readonly tipo: 'modelos' } | { readonly tipo: 'imprimir'; readonly data: string }

const novoId = () => globalThis.crypto.randomUUID()

/**
 * Os suplementos do paciente (spec anamnese-e-prescricoes, US-AP2): digitados pelo nutricionista, nada sugerido
 * (D-164), com modelos da conta para reusar e a folha para imprimir.
 */
export function CartaoSuplementos({ paciente, assinatura, aoAlterar }: CartaoSuplementosProps) {
  const armazenamento = useArmazenamento()
  const [janela, setJanela] = useState<Janela | null>(null)
  const [mensagem, setMensagem] = useState('')
  const id = useId()
  const lista = paciente.suplementos

  const mudar = (suplementos: readonly Suplemento[]) => aoAlterar({ suplementos })

  const salvarModelo = (suplemento: Suplemento) => {
    const repositorio = criarRepositorioModelosSuplemento(armazenamento)
    const modelo = repositorio.salvarDe(suplemento)
    if (!modelo) return
    // CB-160: o navegador sem espaço não guarda o modelo.
    setMensagem(repositorio.persistente ? 'Modelo salvo.' : 'Este navegador não guardou o modelo.')
  }

  return (
    <Card role="region" aria-labelledby={`${id}-titulo`}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id={`${id}-titulo`}>Suplementos</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setJanela({ tipo: 'modelos' })}>
              <LayoutTemplate aria-hidden="true" />
              Modelos
            </Button>
            <Button size="sm" variant="outline" disabled={suplementosParaDocumento(lista).length === 0} onClick={() => setJanela({ tipo: 'imprimir', data: dataDeHoje() })}>
              <Printer aria-hidden="true" />
              Imprimir
            </Button>
          </div>
        </div>
      </CardHeader>

      {lista.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum suplemento.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map((s, i) => (
            <LinhaSuplemento
              key={s.id}
              suplemento={s}
              posicao={i + 1}
              aoMudar={(novo) => mudar(lista.map((x) => (x.id === s.id ? novo : x)))}
              aoTirar={() => mudar(lista.filter((x) => x.id !== s.id))}
              aoSalvarModelo={() => salvarModelo(s)}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="lightprimary" onClick={() => mudar([...lista, criarSuplemento(novoId())])}>
          <Plus aria-hidden="true" />
          Acrescentar suplemento
        </Button>
        <p role="status" className="text-xs text-muted-foreground">
          {mensagem}
        </p>
      </div>

      {janela?.tipo === 'modelos' ? (
        <DialogoModelosSuplemento
          aoUsar={(modelo) => {
            mudar([...lista, suplementoDoModelo(modelo, novoId())])
            setJanela(null)
          }}
          aoFechar={() => setJanela(null)}
        />
      ) : null}

      {janela?.tipo === 'imprimir' ? (
        <DialogoDocumento titulo="Suplementos para imprimir" aoFechar={() => setJanela(null)}>
          <FolhaSuplementos paciente={paciente.nome} suplementos={lista} assinatura={assinatura} data={janela.data} />
        </DialogoDocumento>
      ) : null}
    </Card>
  )
}
