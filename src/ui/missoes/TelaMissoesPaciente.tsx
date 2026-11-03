// A tela que o paciente abre pelo link, no aparelho dele. Sem conta, sem menu e sem
// nada para aprender: a lista do dia e um toque para marcar. É a Fase 1 do
// `docs/plano-negocio.md`, e a métrica do produto nasce aqui. Com a dieta no link
// (spec dieta-no-link), o Plano mostra o que comer. Com a marca da nutricionista (spec
// marca-no-link), a logo e a cor dela. Com o lado do paciente (spec lado-do-paciente),
// o link é fixo por paciente, o aparelho lembra dele e o ícone "Meu plano" o instala.
// O desenho do link aberto mora em `LinkDoPaciente`; aqui ficam a busca, a marcação e os avisos.
import { CircleAlert, Link2Off, WifiOff } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { diaLocal, marcarMissao, missoesDoDia, type Acompanhamento } from '@/domain/acompanhamento.ts'
import { separarDadosDoLink, SEM_DADOS_DO_LINK, temAvisoOferecido, textoDosAvisosLigados, type DadosDoLink } from '@/domain/dadosDoLink.ts'
import { registrarAcesso, type ClienteDosEmails } from '@/domain/emailsDoLink.ts'
import { separarMarca, SEM_MARCA, type MarcaDoLink } from '@/domain/marca.ts'
import { esquecerPlano, lembrarPlano, trocarTokenLembrado } from '@/domain/meusPlanos.ts'
import { MarcacaoRecusada, type FonteAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Logo } from '@ds/componentes/display/Logo.tsx'
import { armazenamentoLocal } from '../estado/armazenamentoLocal.ts'
import { useAcompanhamentosOpcional } from '../estado/contextoAcompanhamentos.ts'
import { obterSupabase } from '../estado/supabase.ts'
import { irParaOApp } from './endereco.ts'
import { CartaoInstalar } from './link/CartaoInstalar.tsx'
import { FolhaAvisos } from './link/FolhaAvisos.tsx'
import { FolhaEsquecer } from './link/FolhaEsquecer.tsx'
import { FolhaInstalar } from './link/FolhaInstalar.tsx'
import { FolhaMeuPlano } from './link/FolhaMeuPlano.tsx'
import { FolhaReceberPorEmail } from './link/FolhaReceberPorEmail.tsx'
import { useMeuPlanoNaPagina } from './link/manifesto.ts'
import { useInstalar } from './link/usarInstalar.ts'
import { primeiroNomeDoLink } from './link/textosDoLink.ts'
import { LinkDoPaciente } from './LinkDoPaciente.tsx'
import { MolduraDoLink } from './MolduraDoLink.tsx'

interface TelaMissoesPacienteProps {
  readonly token: string
  readonly fonte: FonteAcompanhamentos
  /** Injetável para o teste não depender do relógio da máquina. */
  readonly hoje?: string
  /** A hora de agora (a refeição da hora, a consulta que passou); injetável no teste. */
  readonly agora?: Date
  /** As funções do servidor (registrar o acesso, os e-mails); por padrão, o Supabase do app. Nulo, sem servidor. */
  readonly cliente?: ClienteDosEmails | null
  /** Para onde "Esquecer neste aparelho" leva (o jsdom não navega). Por padrão, "Recuperar meu link". */
  readonly aoEsquecido?: () => void
}

/** As folhas do link (D-1212): "Meu plano" e as que abrem a partir dela. */
type Folha = 'mais' | 'email' | 'avisos' | 'esquecer' | null

function Aviso({ icone, titulo, texto, acao }: { readonly icone: ReactNode; readonly titulo: string; readonly texto: string | null; readonly acao?: ReactNode }) {
  return (
    <MolduraDoLink>
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <span aria-hidden="true" className="mx-auto mb-4 grid size-12 place-content-center rounded-full bg-muted text-muted-foreground">
          {icone}
        </span>
        <h1 className="font-titulo text-xl font-bold text-heading">{titulo}</h1>
        {texto ? <p className="mt-2 text-sm text-muted-foreground">{texto}</p> : null}
        {acao ? <div className="mt-6">{acao}</div> : null}
      </div>
    </MolduraDoLink>
  )
}

/** D-1222 e CA-2238: o link removido ou de endereço trocado. */
function LinkQueNaoAbre() {
  return (
    <MolduraDoLink>
      <div className="flex flex-col gap-10">
        <Logo tamanho={22} />
        <div className="flex flex-col items-center gap-4 pt-8 text-center">
          <span aria-hidden="true" className="grid size-15 place-content-center rounded-full bg-surfacesunken text-muted-foreground">
            <Link2Off className="size-7" />
          </span>
          <h1 className="font-titulo text-2xl font-extrabold tracking-tight text-heading">Este link não abre mais</h1>
          <Button size="lg" onClick={() => irParaOApp('#/recuperar-link')}>
            Recuperar pelo e-mail
          </Button>
          <p className="max-w-75 text-base text-muted-foreground">O link também está na mensagem da sua nutricionista no WhatsApp.</p>
        </div>
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
  /** O link sem a marca e sem os dados do link: é o que se marca e se grava (DP-ML-14). */
  readonly acompanhamento: Acompanhamento | null
  /** A marca da nutricionista, lida junto com o link (spec marca-no-link, D-952). */
  readonly marca: MarcaDoLink
  /** O nome da nutricionista, o e-mail mascarado e os avisos (spec lado-do-paciente). */
  readonly dados: DadosDoLink
  /** A nuvem não respondeu e o aparelho não tinha cópia (D-232): não dá para dizer que o link não existe. */
  readonly semConexao: boolean
}

const clientePadrao = (): ClienteDosEmails | null => obterSupabase() as unknown as ClienteDosEmails | null

export function TelaMissoesPaciente({ token, fonte, hoje = diaLocal(), agora, cliente: clienteInjetado, aoEsquecido = () => irParaOApp('#/recuperar-link') }: TelaMissoesPacienteProps) {
  // Guardar o token junto com o resultado deixa "carregando" ser derivado do render,
  // em vez de um segundo estado que o efeito teria de ligar e desligar.
  const [carga, setCarga] = useState<Carga | null>(null)
  const [tentativa, setTentativa] = useState(0)
  // D-232: a frase de quando a última marcação não chegou à nuvem; some quando uma marcação salva.
  const [naoSalvou, setNaoSalvou] = useState<string | null>(null)
  const [cliente] = useState(() => (clienteInjetado === undefined ? clientePadrao() : clienteInjetado))
  const carregando = carga === null || carga.token !== token || carga.tentativa !== tentativa
  const acompanhamento = carregando ? null : carga.acompanhamento
  // O token do link aberto: o do link fixo, quando o endereço era de um link antigo (D-1217).
  const tokenAberto = acompanhamento?.token ?? null
  // D-1219: o cartão Instalar e a folha com os passos.
  const instalar = useInstalar(hoje)
  const [folha, setFolha] = useState<Folha>(null)
  // A cópia do aparelho, que "Esquecer neste aparelho" apaga (CA-2228); sem o provedor (o teste da tela), não há cópia.
  const copiaDoAparelho = useAcompanhamentosOpcional()?.repositorio ?? null

  useEffect(() => {
    let vivo = true
    fonte.porToken(token).then(
      (achado) => {
        if (!vivo) return
        const separado = achado ? separarMarca(achado) : null
        const comDados = separado ? separarDadosDoLink(separado.acompanhamento) : null
        setCarga({ token, tentativa, acompanhamento: comDados?.link ?? null, marca: separado?.marca ?? SEM_MARCA, dados: comDados?.dados ?? SEM_DADOS_DO_LINK, semConexao: false })
      },
      () => {
        if (vivo) setCarga({ token, tentativa, acompanhamento: null, marca: SEM_MARCA, dados: SEM_DADOS_DO_LINK, semConexao: true })
      },
    )
    return () => {
      vivo = false
    }
  }, [token, fonte, tentativa])

  // D-1213: o "Meu plano" na página (o manifesto, o ícone e o nome), enquanto o link está aberto.
  useMeuPlanoNaPagina(tokenAberto)

  // D-1217: o endereço de um link antigo abre o link fixo; o endereço da página passa a ser o dele, sem recarregar.
  useEffect(() => {
    if (tokenAberto === null || tokenAberto === token) return
    globalThis.history?.replaceState(null, '', `/p/${tokenAberto}`)
    trocarTokenLembrado(armazenamentoLocal(), token, tokenAberto)
  }, [token, tokenAberto])

  // D-1218: o aparelho lembra o link aberto (sem a dieta e sem as missões).
  const nomeDaNutricionista = carregando ? '' : (carga.dados.nutricionista ?? '')
  const nomeDoPaciente = acompanhamento?.nome ?? ''
  useEffect(() => {
    if (tokenAberto === null) return
    lembrarPlano(armazenamentoLocal(), { token: tokenAberto, primeiroNome: primeiroNomeDoLink(nomeDoPaciente), nutricionista: nomeDaNutricionista, ultimoAcesso: hoje })
  }, [tokenAberto, nomeDoPaciente, nomeDaNutricionista, hoje])

  // D-1223 e CA-2239: o link registra o dia em que foi aberto (a nuvem guarda uma vez por dia, só a data). Sem internet,
  // o registro fica para quando ela voltar (CB-1205).
  useEffect(() => {
    if (tokenAberto === null || cliente === null || !fonte.naNuvem) return
    let vivo = true
    const registrar = () => {
      void registrarAcesso(cliente, tokenAberto).then((ok) => {
        if (!ok && vivo) globalThis.addEventListener('online', registrar, { once: true })
      })
    }
    registrar()
    return () => {
      vivo = false
      globalThis.removeEventListener('online', registrar)
    }
  }, [tokenAberto, cliente, fonte.naNuvem])

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
    // CA-2232: a primeira marcação neste aparelho faz o cartão Instalar aparecer.
    if (feita) instalar.registrarMarcacao()
    fonte.salvar(novo).then(
      () => setNaoSalvou(null),
      (erro: unknown) => {
        const frase = fraseDaFalha(erro)
        const desfazer = () => {
          setCarga((atual) => (atual?.acompanhamento ? { ...atual, acompanhamento: marcarMissao(atual.acompanhamento, hoje, missaoId, !feita) } : atual))
          setNaoSalvou(frase)
        }
        fonte.porToken(novo.token).then((relido) => {
          if (relido === null) return desfazer()
          // DP-ML-14: o que se marca continua sem a marca e sem os dados do link; os da tela ficam os que já estavam.
          const daNuvem = separarDadosDoLink(separarMarca(relido).acompanhamento).link
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
      <LinkQueNaoAbre />
    ) : (
      <Aviso
        icone={<CircleAlert className="size-6" />}
        titulo="Este link ainda não abre em outro aparelho"
        texto="O servidor da conta não está configurado nesta instalação. Por enquanto, as missões só aparecem no computador onde o plano foi montado."
      />
    )
  }

  const { dados, marca } = carga
  const primeiroNome = primeiroNomeDoLink(acompanhamento.nome)
  // "Juliana · com Ana Lima" (seção 6 da SPEC); sem um dos nomes, o que houver.
  const quem = [primeiroNome, dados.nutricionista ? `com ${dados.nutricionista}` : ''].filter(Boolean).join(' · ') || null
  /** CA-2256: o aviso que o paciente desligou (ou que voltou, quando o servidor não respondeu). */
  const mudarAviso = (tipo: keyof DadosDoLink['avisos'], estado: 'ligado' | 'desligado') =>
    setCarga((atual) => (atual ? { ...atual, dados: { ...atual.dados, avisos: { ...atual.dados.avisos, [tipo]: estado } } } : atual))

  /** CA-2228: esquecer apaga a lembrança e a cópia sem internet daquele link; o link continua valendo. */
  const esquecer = () => {
    esquecerPlano(armazenamentoLocal(), acompanhamento.token)
    copiaDoAparelho?.remover(acompanhamento.id)
    setFolha(null)
    aoEsquecido()
  }

  return (
    <>
      <LinkDoPaciente
        acompanhamento={acompanhamento}
        marca={marca}
        hoje={hoje}
        naoSalvou={naoSalvou}
        aoAlternar={alternar}
        dados={dados}
        {...(agora ? { agora } : {})}
        instalar={instalar.mostrarCartao ? <CartaoInstalar aoInstalar={instalar.instalar} aoAgoraNao={instalar.agoraNao} /> : null}
        aoAbrirMais={() => setFolha('mais')}
      />
      <FolhaMeuPlano
        aberta={folha === 'mais'}
        aoFechar={() => setFolha(null)}
        cor={marca.cor}
        quem={quem}
        aoInstalar={
          instalar.naFolha
            ? () => {
                setFolha(null)
                instalar.instalar()
              }
            : null
        }
        aoReceberPorEmail={() => setFolha('email')}
        // Sem e-mail no link, os avisos começam por receber o link por e-mail (o aceite precisa do endereço).
        avisos={temAvisoOferecido(dados.avisos) ? { estado: textoDosAvisosLigados(dados.avisos), aoAbrir: () => setFolha(dados.emailMascarado ? 'avisos' : 'email') } : null}
        aoEsquecer={() => setFolha('esquecer')}
      />
      <FolhaReceberPorEmail
        aberta={folha === 'email'}
        aoFechar={() => setFolha(null)}
        cor={marca.cor}
        token={acompanhamento.token}
        cliente={cliente}
        emailMascarado={dados.emailMascarado}
        avisos={dados.avisos}
      />
      <FolhaAvisos
        aberta={folha === 'avisos'}
        aoFechar={() => setFolha(null)}
        cor={marca.cor}
        token={acompanhamento.token}
        cliente={cliente}
        emailMascarado={dados.emailMascarado}
        nutricionista={dados.nutricionista}
        avisos={dados.avisos}
        aoMudar={mudarAviso}
      />
      <FolhaEsquecer aberta={folha === 'esquecer'} aoFechar={() => setFolha(null)} aoEsquecer={esquecer} cor={marca.cor} />
      <FolhaInstalar aberta={instalar.folhaAberta} aoFechar={instalar.fecharFolha} plataforma={instalar.plataforma} cor={marca.cor} />
    </>
  )
}
