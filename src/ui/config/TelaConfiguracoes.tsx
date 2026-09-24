import { Download, Image, ShieldCheck, Trash, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  CHAVES_DE_DADOS,
  gravarPerfil,
  lerPerfil,
  linhaDeResponsabilidade,
  montarBackup,
  restaurarBackup,
  type Perfil,
} from '@/domain/perfil.ts'
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

  const apagarTudo = () => {
    const guardado = armazenamento()
    for (const chave of CHAVES_DE_DADOS) guardado?.removeItem(chave)
    setConfirmandoApagar(false)
    setMensagem('Tudo apagado deste aparelho. Recarregue a página.')
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
