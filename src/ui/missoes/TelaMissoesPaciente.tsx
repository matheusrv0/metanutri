// A tela que o paciente abre pelo link, no aparelho dele. Sem conta, sem menu e sem
// nada para aprender: a lista do dia e um toque para marcar. É a Fase 1 do
// `docs/plano-negocio.md`, e a métrica do produto nasce aqui. Com a dieta no link
// (spec dieta-no-link), uma segunda parte, "Meu plano", mostra o que comer. Com a marca
// da nutricionista (spec marca-no-link), a logo e a cor dela. O desenho do link aberto
// mora em `LinkDoPaciente`; aqui ficam a busca, a marcação e os avisos.
import { CircleAlert, Link2Off, WifiOff } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { diaLocal, marcarMissao, missoesDoDia, type Acompanhamento } from '@/domain/acompanhamento.ts'
import { separarMarca, SEM_MARCA, type MarcaDoLink } from '@/domain/marca.ts'
import { MarcacaoRecusada, type FonteAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { LinkDoPaciente, MolduraDoLink } from './LinkDoPaciente.tsx'

interface TelaMissoesPacienteProps {
  readonly token: string
  readonly fonte: FonteAcompanhamentos
  /** Injetável para o teste não depender do relógio da máquina. */
  readonly hoje?: string
}

function Aviso({ icone, titulo, texto, acao }: { readonly icone: ReactNode; readonly titulo: string; readonly texto: string; readonly acao?: ReactNode }) {
  return (
    <MolduraDoLink>
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <span aria-hidden="true" className="mx-auto mb-4 grid size-12 place-content-center rounded-full bg-muted text-muted-foreground">
          {icone}
        </span>
        <h1 className="font-titulo text-xl font-bold text-heading">{titulo}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{texto}</p>
        {acao ? <div className="mt-6">{acao}</div> : null}
      </div>
    </MolduraDoLink>
  )
}

const NAO_SALVOU = 'Não foi possível salvar. Confira a internet e marque de novo.'

/** M-3b: a nuvem recusou por um motivo dela (tentar de novo não resolve); senão, é a internet (D-232). */
const fraseDaFalha = (erro: unknown): string => (erro instanceof MarcacaoRecusada ? `${erro.motivo} Fale com quem montou seu plano.` : NAO_SALVOU)

interface Carga {
  readonly token: string
  /** Qual pedido respondeu: "Tentar de novo" pede outra vez (CA-753). */
  readonly tentativa: number
  /** O link sem a marca: é o que se marca e se grava (DP-ML-14). */
  readonly acompanhamento: Acompanhamento | null
  /** A marca da nutricionista, lida junto com o link (spec marca-no-link, D-952). */
  readonly marca: MarcaDoLink
  /** A nuvem não respondeu e o aparelho não tinha cópia (D-232): não dá para dizer que o link não existe. */
  readonly semConexao: boolean
}

export function TelaMissoesPaciente({ token, fonte, hoje = diaLocal() }: TelaMissoesPacienteProps) {
  // Guardar o token junto com o resultado deixa "carregando" ser derivado do render,
  // em vez de um segundo estado que o efeito teria de ligar e desligar.
  const [carga, setCarga] = useState<Carga | null>(null)
  const [tentativa, setTentativa] = useState(0)
  // D-232: a frase de quando a última marcação não chegou à nuvem; some quando uma marcação salva.
  const [naoSalvou, setNaoSalvou] = useState<string | null>(null)
  const carregando = carga === null || carga.token !== token || carga.tentativa !== tentativa
  const acompanhamento = carregando ? null : carga.acompanhamento

  useEffect(() => {
    let vivo = true
    fonte.porToken(token).then(
      (achado) => {
        if (!vivo) return
        const separado = achado ? separarMarca(achado) : null
        setCarga({ token, tentativa, acompanhamento: separado?.acompanhamento ?? null, marca: separado?.marca ?? SEM_MARCA, semConexao: false })
      },
      () => {
        if (vivo) setCarga({ token, tentativa, acompanhamento: null, marca: SEM_MARCA, semConexao: true })
      },
    )
    return () => {
      vivo = false
    }
  }, [token, fonte, tentativa])

  /**
   * Marca na hora e grava. A gravação falhando (D-232, CA-756), a tela relê o link e fica com o que a nuvem guardou
   * (M-4): a marca pode ter chegado por outra marcação, que leva a lista inteira (CB-236), ou a resposta pode ter se
   * perdido depois de gravar. O aviso só aparece se a marca não ficou lá. Sem conseguir reler, só esta missão volta como
   * estava. A marca nunca fica fingindo que salvou.
   */
  const alternar = (missaoId: string, feita: boolean) => {
    if (carga === null || carga.acompanhamento === null) return
    const novo = marcarMissao(carga.acompanhamento, hoje, missaoId, feita)
    if (novo === carga.acompanhamento) return
    setCarga({ ...carga, acompanhamento: novo })
    fonte.salvar(novo).then(
      () => setNaoSalvou(null),
      (erro: unknown) => {
        const frase = fraseDaFalha(erro)
        const desfazer = () => {
          setCarga((atual) => (atual?.acompanhamento ? { ...atual, acompanhamento: marcarMissao(atual.acompanhamento, hoje, missaoId, !feita) } : atual))
          setNaoSalvou(frase)
        }
        fonte.porToken(token).then((relido) => {
          if (relido === null) return desfazer()
          // DP-ML-14: o que se marca continua sem a marca; a marca da tela fica a que já estava.
          const daNuvem = separarMarca(relido).acompanhamento
          setCarga((atual) => (atual?.token === token && atual.acompanhamento ? { ...atual, acompanhamento: daNuvem } : atual))
          const ficou = missoesDoDia(daNuvem, hoje).some((m) => m.id === missaoId && m.feita === feita)
          setNaoSalvou(ficou ? null : frase)
        }, desfazer)
      },
    )
  }

  if (carregando) {
    return (
      <MolduraDoLink>
        <p className="py-16 text-center text-sm text-muted-foreground">Abrindo suas missões…</p>
      </MolduraDoLink>
    )
  }

  if (acompanhamento === null && carga.semConexao) {
    return (
      <Aviso
        icone={<WifiOff className="size-6" />}
        titulo="Não foi possível abrir suas missões"
        texto="Confira a internet do celular e tente de novo."
        acao={
          <Button size="lg" block onClick={() => setTentativa((n) => n + 1)}>
            Tentar de novo
          </Button>
        }
      />
    )
  }

  if (acompanhamento === null) {
    return fonte.naNuvem ? (
      <Aviso
        icone={<Link2Off className="size-6" />}
        titulo="Este link não existe mais"
        texto="Pode ter sido trocado por um novo. Peça o link atualizado para quem montou seu plano."
      />
    ) : (
      <Aviso
        icone={<CircleAlert className="size-6" />}
        titulo="Este link ainda não abre em outro aparelho"
        texto="O servidor da conta não está configurado nesta instalação. Por enquanto, as missões só aparecem no computador onde o plano foi montado."
      />
    )
  }

  return <LinkDoPaciente acompanhamento={acompanhamento} marca={carga.marca} hoje={hoje} naoSalvou={naoSalvou} aoAlternar={alternar} />
}
