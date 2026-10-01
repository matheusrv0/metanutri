import { Check, ExternalLink, FileText, GraduationCap, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import type { PedidoParaAprovar } from '@/domain/aprovacoes.ts'
import { formatarDataLonga, formatarMesAno, MOTIVOS_RECUSA } from '@/domain/pedidoEstudante.ts'
import { cn } from '@/lib/utils'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import type { ValorAprovacoes } from '../estado/usarAprovacoes.ts'

interface AbaEstudantesProps {
  readonly pedidos: readonly PedidoParaAprovar[]
  readonly decidirPedido: ValorAprovacoes['decidirPedido']
  readonly abrirComprovante: ValorAprovacoes['abrirComprovante']
}

const OUTRO = 'Outro motivo'
const CONFERIR = ['Nome igual ao da conta', 'Curso de Nutrição', 'Semestre atual', 'Mesma instituição do e-mail']

function Dado({ rotulo, valor }: { readonly rotulo: string; readonly valor: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="text-sm font-semibold text-heading">{valor}</dd>
    </div>
  )
}

/** Fila de comprovantes, do mais antigo para o mais novo (CA-293 a CA-295). */
export function AbaEstudantes({ pedidos, decidirPedido, abrirComprovante }: AbaEstudantesProps) {
  const id = useId()
  const [abertoId, setAbertoId] = useState<string | null>(null)
  const [motivo, setMotivo] = useState<string | null>(null)
  const [outro, setOutro] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [decidindo, setDecidindo] = useState(false)
  const decidindoRef = useRef(false)

  const aberto = pedidos.find((p) => p.id === abertoId) ?? pedidos[0] ?? null

  if (!aberto) {
    return <p className="rounded-3xl bg-card p-6 text-sm text-muted-foreground">Nenhum comprovante esperando você.</p>
  }

  const escolher = (pedidoId: string) => {
    setAbertoId(pedidoId)
    setMotivo(null)
    setOutro('')
    setErro(null)
  }

  const decidir = async (aprovar: boolean) => {
    if (decidindoRef.current) return
    const texto = motivo === OUTRO ? outro.trim() : motivo
    if (!aprovar && !texto) {
      setErro('Escolha o motivo da recusa.')
      return
    }
    decidindoRef.current = true
    setDecidindo(true)
    const falha = await decidirPedido(aberto.id, aprovar, aprovar ? null : texto)
    decidindoRef.current = false
    setDecidindo(false)
    setErro(falha)
    if (!falha) escolher('')
  }

  const abrir = async () => {
    if (!aberto.arquivo) return
    const url = await abrirComprovante(aberto.arquivo)
    if (url) globalThis.open(url, '_blank', 'noopener,noreferrer')
    else setErro('Não deu para abrir o comprovante agora. Tente de novo.')
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
      <ul className="flex flex-col gap-2 rounded-3xl bg-card p-3" aria-label="Comprovantes em análise">
        {pedidos.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => escolher(p.id)}
              aria-current={p.id === aberto.id}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                p.id === aberto.id ? 'bg-card ring-2 ring-primary' : 'bg-surfacerow hover:bg-muted',
              )}
            >
              <span className="grid size-9 shrink-0 place-content-center rounded-md bg-lightprimary text-primary">
                <GraduationCap className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-heading">{p.nome || p.email}</span>
                <span className="text-xs text-muted-foreground">{`${p.instituicao} · ${formatarDataLonga(p.enviadoEm)}`}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-5 rounded-3xl bg-card p-5" aria-labelledby={`${id}-nome`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id={`${id}-nome`} className="text-2xl font-bold">
              {aberto.nome || 'Sem nome'}
            </h2>
            <p className="text-sm text-muted-foreground">{aberto.email}</p>
          </div>
          <Badge variant="lightSuccess">
            <Check className="size-3" aria-hidden="true" />
            E-mail da faculdade confirmado
          </Badge>
        </div>

        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_13rem]">
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-x-5 gap-y-3.5">
              <Dado rotulo="Instituição" valor={aberto.instituicao} />
              <Dado rotulo="Curso" valor="Nutrição" />
              <Dado rotulo="Matrícula" valor={aberto.matricula} />
              <Dado rotulo="Período" valor={`${aberto.periodo}º`} />
              <Dado rotulo="Previsão de formatura" valor={formatarMesAno(aberto.formatura)} />
              <Dado rotulo="Enviado em" valor={formatarDataLonga(aberto.enviadoEm)} />
            </dl>
            <fieldset className="flex flex-col gap-2 border-t border-border pt-3.5">
              <legend className="rotulo pb-2">Confira no comprovante</legend>
              {CONFERIR.map((item) => (
                <label key={item} className="flex items-center gap-2.5 text-sm">
                  <input type="checkbox" className="size-4 accent-[var(--brand-primary)]" />
                  {item}
                </label>
              ))}
            </fieldset>
          </div>
          <div className="flex flex-col gap-2">
            <div className="grid aspect-[3/4] place-content-center rounded-md border border-border bg-surfacerow text-muted-foreground">
              <FileText className="size-8" aria-hidden="true" />
            </div>
            {aberto.arquivo ? (
              <Button variant="outline" size="sm" onClick={() => void abrir()}>
                <ExternalLink aria-hidden="true" />
                Abrir o comprovante
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">O arquivo já foi apagado.</p>
            )}
          </div>
        </div>

        <fieldset className="flex flex-col gap-2.5 border-t border-border pt-4">
          <legend className="rotulo pb-2.5">Se for recusar, o motivo</legend>
          <div className="flex flex-wrap gap-1.5">
            {[...MOTIVOS_RECUSA, OUTRO].map((m) => (
              <label
                key={m}
                className={cn(
                  'inline-flex min-h-9 cursor-pointer items-center rounded-full border px-3 text-xs font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                  motivo === m ? 'border-primary bg-lightprimary text-primary' : 'border-borderdefault bg-card text-foreground',
                )}
              >
                <input type="radio" name={`${id}-motivo`} value={m} checked={motivo === m} onChange={() => setMotivo(m)} className="sr-only" />
                {m}
              </label>
            ))}
          </div>
          {motivo === OUTRO ? <Input aria-label="Motivo" value={outro} onChange={(e) => setOutro(e.target.value)} maxLength={200} /> : null}
        </fieldset>

        {erro ? (
          <p role="alert" className="rounded-xl bg-lighterror p-3 text-sm text-errortext">
            {erro}
          </p>
        ) : null}

        <div className="flex justify-end gap-2.5">
          <Button variant="lighterror" onClick={() => void decidir(false)} disabled={decidindo}>
            <X aria-hidden="true" />
            Recusar
          </Button>
          <Button onClick={() => void decidir(true)} loading={decidindo}>
            <Check aria-hidden="true" />
            Aprovar
          </Button>
        </div>
      </section>
    </div>
  )
}
