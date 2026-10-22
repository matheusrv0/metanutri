import { LayoutTemplate, Plus, Printer } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
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
  /** O exportar bloqueado pelo CRN (CA-290): a folha fica desligada com o mesmo aviso da dieta (CA-578, CA-581). */
  readonly bloqueio: string | null
  readonly aoAlterar: (mudanca: Partial<Paciente>) => void
  /** Abre com o foco no título: o Cobrir do ferro e do folato da gestante leva até aqui (spec sugestoes-com-criterio, D-476). */
  readonly focar?: boolean | undefined
}

type Janela = { readonly tipo: 'modelos' } | { readonly tipo: 'imprimir'; readonly data: string }

const novoId = () => globalThis.crypto.randomUUID()

/**
 * Os suplementos do paciente (spec anamnese-e-prescricoes, US-AP2): digitados pelo nutricionista, nada sugerido
 * (D-164), com modelos da conta para reusar e a folha para imprimir.
 */
export function CartaoSuplementos({ paciente, assinatura, bloqueio, aoAlterar, focar = false }: CartaoSuplementosProps) {
  const armazenamento = useArmazenamento()
  const id = useId()
  // D-476: a ficha aberta pelo Cobrir do ferro da gestante cai aqui, com o foco no título.
  useEffect(() => {
    if (!focar) return
    const titulo = document.getElementById(`${id}-titulo`)
    titulo?.scrollIntoView?.({ block: 'start' })
    titulo?.focus({ preventScroll: true })
  }, [focar, id])
  const [janela, setJanela] = useState<Janela | null>(null)
  const [mensagem, setMensagem] = useState('')
  const lista = paciente.suplementos

  const mudar = (suplementos: readonly Suplemento[]) => aoAlterar({ suplementos })
  // CA-578: o motivo do Imprimir desligado. Com a lista vazia, o próprio "Nenhum suplemento." explica.
  const semNome = suplementosParaDocumento(lista).length === 0
  const motivo = `${id}-motivo`

  const salvarModelo = (suplemento: Suplemento) => {
    const repositorio = criarRepositorioModelosSuplemento(armazenamento)
    const salvo = repositorio.salvarDe(suplemento)
    if (!salvo) return
    // CB-160: o navegador sem espaço não guarda o modelo. CA-573: o mesmo nome troca o modelo.
    setMensagem(!repositorio.persistente ? 'Não foi possível salvar o modelo.' : salvo.trocou ? 'Modelo atualizado.' : 'Modelo salvo.')
  }

  return (
    <Card role="region" aria-labelledby={`${id}-titulo`}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id={`${id}-titulo`} tabIndex={-1} className="outline-none">
            Suplementação prescrita
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setJanela({ tipo: 'modelos' })}>
              <LayoutTemplate aria-hidden="true" />
              Modelos
            </Button>
            <Button size="sm" variant="outline" disabled={semNome || bloqueio !== null} aria-describedby={bloqueio ? `${id}-bloqueio` : semNome ? motivo : undefined} onClick={() => setJanela({ tipo: 'imprimir', data: dataDeHoje() })}>
              <Printer aria-hidden="true" />
              Imprimir
            </Button>
          </div>
        </div>
      </CardHeader>

      {bloqueio ? (
        <p id={`${id}-bloqueio`} className="text-xs text-warningtext">
          {bloqueio}
        </p>
      ) : null}

      {lista.length === 0 ? (
        <p id={motivo} className="text-sm text-muted-foreground">
          Nenhum suplemento.
        </p>
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

      {lista.length > 0 && semNome ? (
        <p id={motivo} className="text-xs text-muted-foreground">
          Escreva o nome de um suplemento para imprimir.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="lightprimary" onClick={() => mudar([...lista, criarSuplemento(novoId())])}>
          <Plus aria-hidden="true" />
          Adicionar suplemento
        </Button>
        {/* Região viva, sem o papel "status": a barra da nuvem é o status da página. */}
        <p aria-live="polite" className="text-xs text-muted-foreground">
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
