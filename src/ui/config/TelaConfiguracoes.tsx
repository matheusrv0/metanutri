import { Download, Image, ShieldCheck, Trash, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  CHAVES_DE_DADOS,
  expandirChaves,
  gravarPerfil,
  lerPerfil,
  linhaDeResponsabilidade,
  montarBackup,
  restaurarBackup,
  type Perfil,
} from '@/domain/perfil.ts'
import { apagarAcompanhamentosDaNuvem } from '@/domain/fonteSupabase.ts'
import { apagarCopiaDaNuvem, apelidoDoAparelho, baixarCopia, enviarCopia, type ClienteCopia } from '@/domain/copiaNaNuvem.ts'
import { CloudDownload, CloudUpload } from 'lucide-react'
import { obterSupabase } from '../estado/supabase.ts'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { baixarBlob } from '../exportar/baixar.ts'

function armazenamento() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/**
 * CA-420: o que "Apagar tudo" conseguiu apagar da nuvem. Só diz "na nuvem" quando as duas partes
 * saíram; se uma falhou, diz qual ficou. Os erros já chegam traduzidos (D-98).
 */
function mensagemDeApagar(erroAcompanhamentos: string | null, erroCopia: string | null): string {
  if (erroAcompanhamentos && erroCopia) {
    return `Apagado só deste aparelho. Os acompanhamentos e a cópia completa não foram apagados da nuvem. ${erroAcompanhamentos}`
  }
  if (erroAcompanhamentos) return `Apagado deste aparelho e a cópia completa da nuvem. Os acompanhamentos não foram apagados. ${erroAcompanhamentos}`
  if (erroCopia) return `Apagado deste aparelho e os acompanhamentos da nuvem. A cópia completa não foi apagada. ${erroCopia}`
  return 'Tudo apagado, aqui e na nuvem. Recarregue a página.'
}

/** Perfil, marca nos documentos e o que fazer com os dados guardados neste aparelho. */
export function TelaConfiguracoes() {
  const [perfil, setPerfil] = useState<Perfil>(() => lerPerfil(armazenamento()))
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [confirmandoApagar, setConfirmandoApagar] = useState(false)
  const arquivoRef = useRef<HTMLInputElement | null>(null)

  const alterar = (mudanca: Partial<Perfil>) => {
    const novo = { ...perfil, ...mudanca }
    setPerfil(novo)
    gravarPerfil(armazenamento(), novo)
  }

  const escolherLogo = (arquivo: File | undefined) => {
    if (!arquivo) return
    if (arquivo.size > 500_000) {
      setMensagem('A imagem passa de 500 KB. Use uma logo menor para o documento não ficar pesado.')
      return
    }
    const leitor = new FileReader()
    leitor.onload = () => {
      alterar({ logo: typeof leitor.result === 'string' ? leitor.result : null })
      setMensagem('Logo guardada. Ela aparece na folha da dieta.')
    }
    leitor.readAsDataURL(arquivo)
  }

  const exportarTudo = () => {
    const backup = montarBackup(armazenamento(), [...CHAVES_DE_DADOS], new Date().toISOString())
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    baixarBlob(blob, `metanutri-backup-${new Date().toISOString().slice(0, 10)}.json`.replace('.docx', ''))
    setMensagem('Backup salvo. Guarde esse arquivo: é a cópia de tudo que está aqui.')
  }

  const importar = (arquivo: File | undefined) => {
    if (!arquivo) return
    const leitor = new FileReader()
    leitor.onload = () => {
      const { restaurados, erro } = restaurarBackup(armazenamento(), String(leitor.result ?? ''))
      setMensagem(erro ?? `${restaurados} ${restaurados === 1 ? 'conjunto restaurado' : 'conjuntos restaurados'}. Recarregue a página para ver.`)
    }
    leitor.readAsText(arquivo)
  }

  const [naNuvem, setNaNuvem] = useState(false)

  // O tipo do cliente do Supabase é fundo demais para o TypeScript casar com a
  // interface pequena que este módulo pede (TS2589). A forma em tempo de execução é
  // a mesma; o contrato de verdade está em `ClienteCopia`.
  const clienteCopia = (): ClienteCopia | null => obterSupabase() as unknown as ClienteCopia | null

  const enviarParaNuvem = () => {
    const cliente = clienteCopia()
    if (!cliente) return setMensagem('A conta na nuvem não está configurada neste MetaNutri.')
    setNaNuvem(true)
    const backup = montarBackup(armazenamento(), [...CHAVES_DE_DADOS], new Date().toISOString())
    void enviarCopia(cliente, backup, apelidoDoAparelho(globalThis.navigator.userAgent)).then(({ erro }) => {
      setNaNuvem(false)
      setMensagem(erro ?? `Cópia enviada. Ela substitui a anterior da sua conta: ${Object.keys(backup.dados).length} conjuntos de dados.`)
    })
  }

  const trazerDaNuvem = () => {
    const cliente = clienteCopia()
    if (!cliente) return setMensagem('A conta na nuvem não está configurada neste MetaNutri.')
    setNaNuvem(true)
    void baixarCopia(cliente).then(({ ok, erro }) => {
      setNaNuvem(false)
      if (!ok) return setMensagem(erro)
      const { restaurados, erro: erroRestauro } = restaurarBackup(armazenamento(), JSON.stringify(ok.backup))
      setMensagem(
        erroRestauro ??
          `${restaurados} ${restaurados === 1 ? 'conjunto veio' : 'conjuntos vieram'} da nuvem (${ok.aparelho}). Recarregue a página para ver.`,
      )
    })
  }

  const apagarTudo = () => {
    const guardado = armazenamento()
    // Expandido: sem isso os planos (metanutri:caso:<id>) ficavam no aparelho depois
    // de "apagar tudo", com nome e medida de paciente dentro.
    for (const chave of expandirChaves(guardado, [...CHAVES_DE_DADOS])) guardado?.removeItem(chave)
    setConfirmandoApagar(false)

    // Se a nuvem estiver ligada, apagar só o navegador deixaria o dado do paciente
    // vivo no servidor — e a política de privacidade promete o contrário. D-94: lá ficam
    // os acompanhamentos e a cópia completa, e as duas partes saem.
    const cliente = obterSupabase()
    const copia = clienteCopia()
    if (!cliente || !copia) return setMensagem('Tudo apagado deste aparelho. Recarregue a página.')
    setMensagem('Apagado deste aparelho. Apagando da nuvem…')
    void Promise.all([apagarAcompanhamentosDaNuvem(cliente), apagarCopiaDaNuvem(copia)]).then(([erroAcompanhamentos, erroCopia]) => {
      setMensagem(mensagemDeApagar(erroAcompanhamentos, erroCopia))
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {mensagem ? (
        <Alert variant="info">
          <ShieldCheck aria-hidden="true" />
          <p>{mensagem}</p>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Quem assina</CardTitle>
          <CardDescription>Estes dados saem no rodapé dos documentos que você entrega.</CardDescription>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto rotulo="Seu nome" valor={perfil.nome} aoMudar={(v) => alterar({ nome: v })} />
          <GrupoOpcoes<Perfil['tipo']>
            rotulo="Situação"
            opcoes={[
              { valor: 'estudante', rotulo: 'Estudante' },
              { valor: 'profissional', rotulo: 'Nutricionista' },
            ]}
            valor={perfil.tipo}
            aoEscolher={(tipo) => alterar({ tipo })}
          />
          {perfil.tipo === 'profissional' ? (
            <CampoTexto rotulo="CRN" valor={perfil.crn} aoMudar={(v) => alterar({ crn: v })} placeholder="CRN-6 12345…" />
          ) : (
            <CampoTexto
              rotulo="Responsável técnico"
              valor={perfil.responsavel}
              aoMudar={(v) => alterar({ responsavel: v })}
              dica="Quem assina junto com você no estágio."
            />
          )}
          <CampoTexto rotulo="Instituição" valor={perfil.instituicao} aoMudar={(v) => alterar({ instituicao: v })} />
          <CampoTexto rotulo="Telefone" valor={perfil.telefone} aoMudar={(v) => alterar({ telefone: v })} />
          <CampoTexto rotulo="E-mail" valor={perfil.email} aoMudar={(v) => alterar({ email: v })} />
        </div>
        <p className="border-t border-border pt-3 text-sm text-muted-foreground">
          No documento vai sair: <span className="text-foreground">{linhaDeResponsabilidade(perfil)}</span>
        </p>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marca</CardTitle>
          <CardDescription>A logo aparece no alto da folha da dieta. Fica só neste aparelho.</CardDescription>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-4">
          {perfil.logo ? (
            <img src={perfil.logo} alt="Sua logo" className="h-16 w-auto border border-border bg-card p-1" />
          ) : (
            <span className="flex size-16 items-center justify-center border border-dashed border-borderdefault text-muted-foreground">
              <Image className="size-6" aria-hidden="true" />
            </span>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-borderdefault px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary">
            <Upload className="size-4" aria-hidden="true" />
            Escolher imagem
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => escolherLogo(e.target.files?.[0])} />
          </label>
          {perfil.logo ? (
            <Button variant="ghost" onClick={() => alterar({ logo: null })}>
              Remover logo
            </Button>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cópia na nuvem</CardTitle>
          <CardDescription>
            Para trocar de aparelho sem passar arquivo. Precisa de conta. Não é automático de propósito: cada botão sobrescreve um lado, e você escolhe qual.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-3">
          <Button onClick={enviarParaNuvem} disabled={naNuvem}>
            <CloudUpload aria-hidden="true" />
            Enviar deste aparelho
          </Button>
          <Button variant="outline" onClick={trazerDaNuvem} disabled={naNuvem}>
            <CloudDownload aria-hidden="true" />
            Trazer para este aparelho
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          <strong>Enviar</strong> substitui a cópia da nuvem pelo que está aqui. <strong>Trazer</strong> escreve por cima do que está neste aparelho. Na dúvida,
          baixe o backup em arquivo antes.
        </p>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seus dados</CardTitle>
          <CardDescription>Tudo fica neste navegador. Backup é a única forma de levar para outro aparelho.</CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-3">
          <Button onClick={exportarTudo}>
            <Download aria-hidden="true" />
            Baixar backup
          </Button>
          <Button variant="outline" onClick={() => arquivoRef.current?.click()}>
            <Upload aria-hidden="true" />
            Restaurar backup
          </Button>
          <input ref={arquivoRef} type="file" accept="application/json" className="sr-only" onChange={(e) => importar(e.target.files?.[0])} />
        </div>
        <div className="border-t border-border pt-4">
          {confirmandoApagar ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="destructive" onClick={apagarTudo}>
                <Trash aria-hidden="true" />
                Apagar tudo mesmo
              </Button>
              <Button variant="ghost" onClick={() => setConfirmandoApagar(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setConfirmandoApagar(true)}>
              <Trash aria-hidden="true" />
              Apagar todos os dados deste aparelho
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
