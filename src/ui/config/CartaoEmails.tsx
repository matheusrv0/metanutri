// Configurações › E-mails (spec lado-do-paciente, D-1227, D-1231, CA-2266; protótipo AvisosNutri): o resumo da adesão às
// segundas, os avisos oferecidos aos pacientes novos e para onde vão as respostas dos pacientes. Grava em
// `config_de_emails` e publica o nome e o e-mail do Perfil, que assinam e recebem os e-mails (DP-LP-8).
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { diasEntre, estadoDoAcompanhamento, ultimaMarcacao } from '@/domain/acompanhamento.ts'
import { lerConfigDeEmails, salvarConfigDeEmails, type ConfigDeEmails } from '@/domain/emailsDoLink.ts'
import type { Perfil } from '@/domain/perfil.ts'
import { agoraEmBrasilia } from '@/domain/retorno.ts'
import { useAcompanhamentosOpcional } from '@/ui/estado/contextoAcompanhamentos.ts'
import { useClienteDosEmails } from '@/ui/estado/usarEmailsDoLink.ts'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Switch } from '@ds/componentes/forms/switch.tsx'
import { emailValido, normalizarEmail } from '../../../supabase/functions/_shared/avisos/email.ts'
import { nomeCurto } from '../../../supabase/functions/_shared/avisos/emails.ts'

interface CartaoEmailsProps {
  /** A conta que entrou; sem ela (o modo local), não há e-mails para configurar. */
  readonly usuarioId: string | null
  readonly perfil: Perfil
  /** "Editar no Perfil": o cursor vai para o E-mail de "Quem assina", nesta mesma tela. */
  readonly aoEditarEmail: () => void
  /** Injetável no teste: o "hoje" da prévia do resumo. */
  readonly agora?: Date
}

/** DP-LP-8: o nome e o e-mail de resposta que a configuração publica, a partir do Perfil. */
function doPerfil(perfil: Perfil): Pick<ConfigDeEmails, 'nome' | 'responderPara'> {
  const email = normalizarEmail(perfil.email)
  return { nome: perfil.nome.trim().slice(0, 120), responderPara: emailValido(email) ? email : null }
}

/** O resumo da adesão desta conta, do jeito do N1 (D-1231): os quatro números e quem parou de marcar. */
function usePreviaDoResumo(agora: Date) {
  const links = useAcompanhamentosOpcional()?.acompanhamentos ?? []
  const hoje = agoraEmBrasilia(agora).dia
  const estados = links.map((l) => ({ link: l, estado: estadoDoAcompanhamento(l, hoje) }))
  const conta = (e: string) => estados.filter((x) => x.estado === e).length
  const parados = estados
    .filter((x) => x.estado === 'sumindo')
    .map((x) => {
      const desde = ultimaMarcacao(x.link) ?? x.link.criadoEm.slice(0, 10)
      return { nome: nomeCurto(x.link.nome) || 'Paciente', dias: diasEntre(desde, hoje) }
    })
    .sort((a, b) => b.dias - a.dias)
  return { emDia: conta('em-dia'), atencao: conta('atencao'), pararam: conta('sumindo'), naoComecaram: conta('nao-comecou'), parados }
}

function Linha({ titulo, texto, controle }: { readonly titulo: string; readonly texto: string; readonly controle: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surfacesunken p-4">
      <span className="min-w-0 text-sm">
        <strong className="block font-semibold text-heading [overflow-wrap:anywhere]">{titulo}</strong>
        <span className="block text-xs text-muted-foreground">{texto}</span>
      </span>
      {controle}
    </div>
  )
}

export function CartaoEmails({ usuarioId, perfil, aoEditarEmail, agora = new Date() }: CartaoEmailsProps) {
  const cliente = useClienteDosEmails()
  const idTitulo = useId()
  const [config, setConfig] = useState<ConfigDeEmails | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const previa = usePreviaDoResumo(agora)
  const publicado = useRef<string | null>(null)

  useEffect(() => {
    if (cliente === null || usuarioId === null) return
    let vivo = true
    void lerConfigDeEmails(cliente, usuarioId).then((r) => {
      if (!vivo) return
      if (r.ok) setConfig(r.config)
      else setErro(r.erro)
    })
    return () => {
      vivo = false
    }
  }, [cliente, usuarioId])

  const gravar = async (nova: ConfigDeEmails) => {
    if (cliente === null || usuarioId === null) return
    setConfig(nova)
    const r = await salvarConfigDeEmails(cliente, usuarioId, nova)
    setErro(r.ok ? null : r.erro)
  }

  // DP-LP-8: o nome e o e-mail do Perfil sobem quando mudam (e ao abrir, se a nuvem tem outros), um pouco depois de a
  // pessoa parar de digitar.
  const { nome, responderPara } = doPerfil(perfil)
  useEffect(() => {
    if (config === null || cliente === null || usuarioId === null) return
    const chave = `${nome}|${responderPara ?? ''}`
    if (publicado.current === null && config.nome === nome && config.responderPara === responderPara) publicado.current = chave
    if (publicado.current === chave) return
    const espera = setTimeout(() => {
      publicado.current = chave
      void salvarConfigDeEmails(cliente, usuarioId, { ...config, nome, responderPara })
    }, 800)
    return () => clearTimeout(espera)
  }, [config, cliente, usuarioId, nome, responderPara])

  const indisponivel = cliente === null || usuarioId === null
  const atual = config

  return (
    <Card aria-labelledby={idTitulo}>
      <CardHeader>
        <CardTitle id={idTitulo}>E-mails</CardTitle>
        <CardDescription>O resumo da adesão para você e os avisos que os pacientes podem receber.</CardDescription>
      </CardHeader>
      {indisponivel || (atual === null && erro !== null) ? (
        <p className="text-sm text-muted-foreground">{erro ?? 'Indisponível no momento.'}</p>
      ) : atual === null ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          <section aria-label="Resumo da adesão" className="grid gap-4 pb-5 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <div>
              <h3 className="text-sm font-semibold text-heading">Resumo da adesão</h3>
              <p className="text-sm text-muted-foreground">Toda segunda, às 7h, para o seu e-mail.</p>
            </div>
            <div className="flex flex-col gap-3">
              <Linha
                titulo="Receber o resumo da adesão"
                texto="Os números da semana e quem parou de marcar, com o primeiro nome e a inicial."
                controle={<Switch aria-label="Receber o resumo da adesão" checked={atual.resumoDaAdesao} onCheckedChange={(v) => void gravar({ ...atual, nome, responderPara, resumoDaAdesao: v })} />}
              />
              <div role="group" aria-label="Prévia do resumo da adesão" className="rounded-xl bg-surfacesunken p-3">
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-sm">
                  <strong className="font-semibold text-heading">MetaNutri</strong>
                  <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(
                      [
                        ['Em dia', previa.emDia],
                        ['Atenção', previa.atencao],
                        ['Pararam', previa.pararam],
                        ['Não começaram', previa.naoComecaram],
                      ] as const
                    ).map(([rotulo, valor]) => (
                      <div key={rotulo} className="flex flex-col">
                        <dt className="order-2 text-xs text-muted-foreground">{rotulo}</dt>
                        <dd className={rotulo === 'Pararam' && valor > 0 ? 'numeros text-lg font-semibold text-errortext' : 'numeros text-lg font-semibold text-heading'}>{valor}</dd>
                      </div>
                    ))}
                  </dl>
                  {previa.parados.length > 0 ? (
                    <ul className="flex flex-col text-sm text-foreground">
                      {previa.parados.slice(0, 8).map((p) => (
                        <li key={`${p.nome}-${p.dias}`} className="[overflow-wrap:anywhere]">{`${p.nome} · ${p.dias} dias`}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section aria-label="Avisos aos pacientes" className="grid gap-4 py-5 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <div>
              <h3 className="text-sm font-semibold text-heading">Avisos aos pacientes</h3>
              <p className="text-sm text-muted-foreground">Plano atualizado, resumo da semana e lembrete. O paciente aceita pelo e-mail.</p>
            </div>
            <Linha
              titulo="Oferecer avisos aos pacientes novos"
              texto="Em cada ficha, você desliga o que não servir para aquele paciente."
              controle={<Switch aria-label="Oferecer avisos aos pacientes novos" checked={atual.oferecerAosNovos} onCheckedChange={(v) => void gravar({ ...atual, nome, responderPara, oferecerAosNovos: v })} />}
            />
          </section>

          <section aria-label="Respostas dos pacientes" className="grid gap-4 pt-5 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <div>
              <h3 className="text-sm font-semibold text-heading">Respostas dos pacientes</h3>
              <p className="text-sm text-muted-foreground">Quem responde a um e-mail do plano escreve para você.</p>
            </div>
            <Linha
              titulo={responderPara ?? 'O e-mail da sua conta'}
              texto={responderPara ? 'Do seu Perfil' : 'Sem e-mail no Perfil, as respostas vão para o e-mail da conta.'}
              controle={
                <Button variant="outline" size="sm" onClick={aoEditarEmail}>
                  Editar no Perfil
                </Button>
              }
            />
          </section>
          {erro ? <p className="pt-3 text-sm text-errortext">{erro}</p> : null}
        </div>
      )}
    </Card>
  )
}
