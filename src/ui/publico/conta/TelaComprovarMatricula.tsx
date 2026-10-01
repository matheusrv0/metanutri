import { FileText } from 'lucide-react'
import { useId, useRef, useState, type FormEvent } from 'react'
import { ACEITA_ARQUIVO, formatarDataLonga, MENSAGEM_ERRO_PEDIDO, mesAtual, validarPedido, type PedidoEstudante } from '@/domain/pedidoEstudante.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import type { ValorPedidoEstudante } from '../../estado/usarPedidoEstudante.ts'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { MolduraConta } from './MolduraConta.tsx'

interface TelaComprovarMatriculaProps {
  readonly email: string
  readonly pedido: PedidoEstudante | null
  readonly enviar: ValorPedidoEstudante['enviar']
  readonly aoEnviado: () => void
  readonly aoDepois: () => void
  readonly aoIrParaInicio: () => void
  /** Para os testes; na tela é o dia de hoje. */
  readonly hoje?: Date | undefined
}

const PERIODOS = Array.from({ length: 12 }, (_, i) => i + 1)
const BOTAO_TEXTO = 'inline-flex min-h-11 items-center self-center text-sm font-semibold text-primary underline-offset-4 hover:underline'

function Lado() {
  return (
    <>
      <div className="flex flex-col gap-3.5 rounded-3xl bg-card p-5">
        <p className="rotulo">Depois de enviar</p>
        <ol className="flex flex-col gap-3 text-sm">
          {['Você já usa o MetaNutri como Free.', 'Conferimos o comprovante em até 2 dias úteis.', 'Aprovado, o plano Estudante vale 12 meses ou até a formatura.'].map((t, i) => (
            <li key={t} className="flex gap-2.5">
              <span className="numeros grid size-6 shrink-0 place-content-center rounded-full bg-surfacerow text-xs font-semibold text-muted-foreground">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
      </div>
      <p className="text-xs text-muted-foreground">O comprovante é apagado 30 dias depois da análise.</p>
    </>
  )
}

/** Passo 2 da conta de estudante (spec conta-e-verificacao, US-B3; protótipo "Comprovar matrícula"). */
export function TelaComprovarMatricula({ email, pedido, enviar, aoEnviado, aoDepois, aoIrParaInicio, hoje = new Date() }: TelaComprovarMatriculaProps) {
  const id = useId()
  const anterior = pedido?.status === 'recusado' ? pedido : null
  const minimo = mesAtual(hoje)
  const [instituicao, setInstituicao] = useState(anterior?.instituicao ?? '')
  const [matricula, setMatricula] = useState(anterior?.matricula ?? '')
  const [periodo, setPeriodo] = useState<number | null>(anterior?.periodo ?? null)
  const [formatura, setFormatura] = useState(anterior && anterior.formatura >= minimo ? anterior.formatura : '')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  // Trava de verdade contra o clique duplo (CA-276).
  const enviandoRef = useRef(false)

  if (pedido?.status === 'em_analise') {
    return (
      <MolduraConta
        titulo="Comprovante em análise"
        subtitulo={`Enviado em ${formatarDataLonga(pedido.enviadoEm)}. Conferimos em até 2 dias úteis. Enquanto isso, use o MetaNutri como Free.`}
        aoIrParaInicio={aoIrParaInicio}
        lado={<Lado />}
      >
        <Button size="lg" block onClick={aoDepois}>
          Ir para o painel
        </Button>
      </MolduraConta>
    )
  }

  const enviarPedido = async (evento: FormEvent) => {
    evento.preventDefault()
    if (enviandoRef.current) return
    const problema = validarPedido({ instituicao, matricula, periodo, formatura, arquivo: arquivo ? { tipo: arquivo.type, tamanho: arquivo.size } : null }, hoje)
    if (problema || periodo === null || arquivo === null) {
      setErro(MENSAGEM_ERRO_PEDIDO[problema ?? 'arquivo-vazio'])
      return
    }
    enviandoRef.current = true
    setEnviando(true)
    setErro(null)
    const falha = await enviar({ instituicao, matricula, periodo, formatura }, arquivo)
    enviandoRef.current = false
    setEnviando(false)
    if (falha) {
      setErro(falha)
      return
    }
    aoEnviado()
  }

  return (
    <MolduraConta
      titulo="Comprove sua matrícula"
      subtitulo="Passo 2 de 2. Analisamos em até 2 dias úteis."
      passo={{ atual: 2, total: 2 }}
      aoIrParaInicio={aoIrParaInicio}
      lado={<Lado />}
    >
      <AvisoFormulario tipo="ok">E-mail da faculdade confirmado: {email}</AvisoFormulario>
      {anterior ? <AvisoFormulario tipo="erro">O comprovante anterior não foi aprovado. Motivo: {anterior.motivo}.</AvisoFormulario> : null}

      <form onSubmit={(e) => void enviarPedido(e)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-instituicao`}>Instituição</Label>
          <Input id={`${id}-instituicao`} value={instituicao} onChange={(e) => setInstituicao(e.target.value)} placeholder="Universidade Federal do Rio Grande do Norte (UFRN)" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-curso`}>Curso</Label>
            <Input id={`${id}-curso`} value="Nutrição" readOnly className="bg-surfacerow text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-matricula`}>Matrícula</Label>
            <Input id={`${id}-matricula`} value={matricula} onChange={(e) => setMatricula(e.target.value)} spellCheck={false} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-periodo`}>Período atual</Label>
            <select
              id={`${id}-periodo`}
              value={periodo ?? ''}
              onChange={(e) => setPeriodo(e.target.value ? Number(e.target.value) : null)}
              className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Escolha</option>
              {PERIODOS.map((p) => (
                <option key={p} value={p}>{`${p}º`}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-formatura`}>Previsão de formatura</Label>
            <Input id={`${id}-formatura`} type="month" min={minimo} value={formatura} onChange={(e) => setFormatura(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-arquivo`}>Comprovante de matrícula</Label>
          <label
            htmlFor={`${id}-arquivo`}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-borderstrong bg-surfacerow p-3.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
          >
            <span className="grid size-10 shrink-0 place-content-center rounded-md bg-lightprimary text-primary">
              <FileText className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-heading">{arquivo ? arquivo.name : 'Escolher arquivo'}</span>
              <span className="text-xs text-muted-foreground">{arquivo ? `${Math.max(1, Math.round(arquivo.size / 1024))} KB` : 'PDF, JPG ou PNG, até 5 MB'}</span>
            </span>
            <input id={`${id}-arquivo`} type="file" accept={ACEITA_ARQUIVO} className="sr-only" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
          </label>
          <p className="text-xs text-muted-foreground">Declaração ou atestado do semestre atual, com seu nome e a instituição.</p>
        </div>

        {erro ? <AvisoFormulario tipo="erro">{erro}</AvisoFormulario> : null}

        <Button type="submit" size="lg" block loading={enviando}>
          Enviar para análise
        </Button>
        <button type="button" onClick={aoDepois} className={BOTAO_TEXTO}>
          Fazer isso depois
        </button>
      </form>
    </MolduraConta>
  )
}
