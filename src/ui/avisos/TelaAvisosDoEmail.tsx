// A página aberta pelo botão do e-mail (spec lado-do-paciente, seção 6 e DP-LP-20): o aceite dos avisos (S3) e o
// descadastro (o rodapé dos avisos, do S2 e do N1). Sem login. Abrir o endereço não muda nada: só o botão da página age,
// por POST (o antivírus do Microsoft 365 abre todo link que chega, D-89; CA-2241 e CA-2253).
import { Check, Link2Off } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { NOME_DO_AVISO, NOME_DO_AVISO_NA_FRASE, type TipoDeAviso } from '../../../supabase/functions/_shared/avisos/tipos.ts'
import { CHAVE_QUE_NAO_VALE, responderAviso, type AcaoDaPagina, type ClienteDosEmails, type PaginaDoAviso } from '@/domain/emailsDoLink.ts'
import { lerMeusPlanos } from '@/domain/meusPlanos.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Logo } from '@ds/componentes/display/Logo.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { armazenamentoLocal } from '../estado/armazenamentoLocal.ts'
import { obterSupabase } from '../estado/supabase.ts'
import { abrirLink, irParaOApp } from '../missoes/endereco.ts'

interface TelaAvisosDoEmailProps {
  readonly chave: string
  /** As funções do servidor; por padrão, o Supabase do app. Injetável no teste. */
  readonly cliente?: ClienteDosEmails | null
  /** "Abrir meu plano" depois do aceite; por padrão, o plano lembrado neste aparelho ou a tela de entrar. */
  readonly aoAbrirPlano?: (nutricionista: string) => void
}

const clientePadrao = (): ClienteDosEmails | null => obterSupabase() as unknown as ClienteDosEmails | null

/** O plano desta nutricionista lembrado no aparelho; sem ele, a tela de entrar (com "Sou paciente"). */
function abrirPlanoLembrado(nutricionista: string): void {
  const lembrado = lerMeusPlanos(armazenamentoLocal()).find((p) => p.nutricionista === nutricionista)
  if (lembrado) abrirLink(lembrado.token)
  else irParaOApp('#/entrar')
}

/** "o resumo da semana", "os e-mails deste plano", "o resumo da adesão". */
function oQueSai(aviso: string | null): string {
  if (aviso === 'plano' || aviso === 'semana' || aviso === 'lembrete') return NOME_DO_AVISO_NA_FRASE[aviso]
  if (aviso === 'n1') return 'o resumo da adesão'
  return 'os e-mails deste plano'
}

/** "Resumo da semana, Lembrete". */
const lista = (avisos: readonly TipoDeAviso[]): string => avisos.map((a) => NOME_DO_AVISO[a]).join(', ')

type Estado =
  | { readonly tipo: 'lendo' }
  | { readonly tipo: 'nao-vale' }
  | { readonly tipo: 'falhou'; readonly frase: string }
  | { readonly tipo: 'pagina'; readonly pagina: PaginaDoAviso; readonly paraTudo: boolean }

function Moldura({ children }: { readonly children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background px-4 py-8">
      <main className="mx-auto flex w-full max-w-md flex-col gap-8">
        <Logo tamanho={22} />
        {children}
      </main>
    </div>
  )
}

export function TelaAvisosDoEmail({ chave, cliente: clienteInjetado, aoAbrirPlano = abrirPlanoLembrado }: TelaAvisosDoEmailProps) {
  const id = useId()
  const [cliente] = useState(() => (clienteInjetado === undefined ? clientePadrao() : clienteInjetado))
  const [estado, setEstado] = useState<Estado>({ tipo: 'lendo' })
  const [marcados, setMarcados] = useState<readonly TipoDeAviso[]>([])
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Ler a chave não muda nada no servidor (CA-2241, CA-2253): só diz o que a página mostra.
  useEffect(() => {
    let vivo = true
    void responderAviso(cliente, { acao: 'ler', chave }).then((r) => {
      if (!vivo) return
      if (r.ok) {
        setEstado({ tipo: 'pagina', pagina: r.pagina, paraTudo: false })
        setMarcados(r.pagina.escolhidos)
      } else setEstado(r.status === 404 ? { tipo: 'nao-vale' } : { tipo: 'falhou', frase: r.erro })
    })
    return () => {
      vivo = false
    }
  }, [cliente, chave])

  const agir = async (acao: Exclude<AcaoDaPagina, 'ler'>) => {
    setOcupado(true)
    setErro(null)
    const r = await responderAviso(cliente, { acao, chave, ...(acao === 'confirmar' ? { avisos: marcados } : {}) })
    setOcupado(false)
    if (!r.ok) {
      if (r.status === 404) setEstado({ tipo: 'nao-vale' })
      else setErro(r.erro)
      return
    }
    setEstado({ tipo: 'pagina', pagina: r.pagina, paraTudo: acao === 'parar-todos' })
  }

  if (estado.tipo === 'lendo') {
    return (
      <Moldura>
        <p role="status" className="py-12 text-center text-sm text-muted-foreground">
          Abrindo…
        </p>
      </Moldura>
    )
  }

  if (estado.tipo === 'nao-vale' || estado.tipo === 'falhou') {
    return (
      <Moldura>
        <div className="flex flex-col items-center gap-4 pt-6 text-center">
          <span aria-hidden="true" className="grid size-15 place-content-center rounded-full bg-surfacesunken text-muted-foreground">
            <Link2Off className="size-7" />
          </span>
          <h1 className="font-titulo text-xl font-extrabold tracking-tight text-heading">{estado.tipo === 'nao-vale' ? CHAVE_QUE_NAO_VALE : estado.frase}</h1>
        </div>
      </Moldura>
    )
  }

  const { pagina, paraTudo } = estado
  const aviso = paraTudo ? null : pagina.aviso

  // O aceite (D-1226, CA-2241 e CA-2243): os avisos oferecidos, com os escolhidos marcados; só "Confirmar" aceita. Com
  // o e-mail digitado no link (D-1247), é "Confirmar o seu e-mail", que vale sem nenhum aviso marcado.
  if (pagina.tipo === 'aceite') {
    const doEmail = pagina.emailNovo !== null
    const pronto = doEmail
      ? pagina.escolhidos.length > 0
        ? `Pronto. Este e-mail vale no seu plano. Você vai receber: ${lista(pagina.escolhidos)}.`
        : 'Pronto. Este e-mail vale no seu plano.'
      : pagina.escolhidos.length > 0
        ? `Pronto. Você vai receber: ${lista(pagina.escolhidos)}.`
        : 'Pronto.'
    return (
      <Moldura>
        {pagina.feito ? (
          <div role="status" className="flex flex-col gap-5">
            <span aria-hidden="true" className="grid size-11 place-content-center rounded-full bg-lightsuccess text-successtext">
              <Check className="size-5" strokeWidth={3} />
            </span>
            <p className="text-lg text-heading">{pronto}</p>
            <Button size="lg" block onClick={() => aoAbrirPlano(pagina.nutricionista)}>
              Abrir meu plano
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void agir('confirmar')
            }}
            className="flex flex-col gap-5"
          >
            <h1 id={id} className="font-titulo text-2xl font-extrabold tracking-tight text-heading [overflow-wrap:anywhere]">
              {doEmail ? 'Confirmar o seu e-mail' : `Avisos de ${pagina.nutricionista} por e-mail`}
            </h1>
            {doEmail ? (
              <p className="-mt-2 text-base text-foreground [overflow-wrap:anywhere]">{`${pagina.emailNovo ?? ''} passa a valer no seu plano com ${pagina.nutricionista}.`}</p>
            ) : null}
            <fieldset aria-labelledby={doEmail ? `${id}-avisos` : id} className="flex flex-col">
              {doEmail && pagina.avisos.length > 0 ? (
                <legend id={`${id}-avisos`} className="mb-1.5 text-sm font-bold text-heading">
                  Avisos
                </legend>
              ) : null}
              {pagina.avisos.map((tipo) => (
                <label key={tipo} className="flex min-h-12 cursor-pointer items-center gap-3 text-base text-foreground">
                  <input
                    type="checkbox"
                    checked={marcados.includes(tipo)}
                    onChange={(e) => setMarcados((atuais) => (e.target.checked ? pagina.avisos.filter((t) => t === tipo || atuais.includes(t)) : atuais.filter((t) => t !== tipo)))}
                    className="size-6 shrink-0 cursor-pointer accent-[var(--link-acao)]"
                  />
                  <span>{NOME_DO_AVISO[tipo]}</span>
                </label>
              ))}
            </fieldset>
            {erro ? (
              <Alert variant="error" role="alert">
                {erro}
              </Alert>
            ) : null}
            <Button type="submit" size="lg" block loading={ocupado} disabled={!doEmail && marcados.length === 0}>
              Confirmar
            </Button>
          </form>
        )}
      </Moldura>
    )
  }

  // O descadastro (D-1235, CA-2253 e CA-2254): um botão; depois, "Parar todos" (só nos avisos do paciente) e "Desfazer".
  const ehAvisoDoPaciente = aviso === 'plano' || aviso === 'semana' || aviso === 'lembrete'
  return (
    <Moldura>
      {pagina.feito ? (
        <div role="status" className="flex flex-col gap-5">
          <span aria-hidden="true" className="grid size-11 place-content-center rounded-full bg-lightsuccess text-successtext">
            <Check className="size-5" strokeWidth={3} />
          </span>
          <p className="text-lg text-heading">{`Pronto. Você não recebe mais ${oQueSai(aviso)}.`}</p>
          {erro ? (
            <Alert variant="error" role="alert">
              {erro}
            </Alert>
          ) : null}
          <div className="flex flex-col items-center gap-1">
            {ehAvisoDoPaciente ? (
              <Button variant="link" size="lg" disabled={ocupado} onClick={() => void agir('parar-todos')} className="text-base font-bold text-heading underline">
                Parar todos os e-mails deste plano
              </Button>
            ) : null}
            <Button variant="link" size="lg" disabled={ocupado} onClick={() => void agir('desfazer')} className="text-base font-bold text-heading underline">
              Desfazer
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <h1 className="font-titulo text-2xl font-extrabold tracking-tight text-heading">{`Não receber mais ${oQueSai(aviso)}?`}</h1>
          {erro ? (
            <Alert variant="error" role="alert">
              {erro}
            </Alert>
          ) : null}
          <Button size="lg" block loading={ocupado} onClick={() => void agir('sair')}>
            Não quero mais receber
          </Button>
        </div>
      )}
    </Moldura>
  )
}
