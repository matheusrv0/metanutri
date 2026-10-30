import { Download, ShieldCheck, Upload } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { gravarPerfil, lerPerfil, linhaDeResponsabilidade, restaurarBackup, type Perfil } from '@/domain/perfil.ts'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { useArmazenamento } from '../estado/contextoArmazenamento.ts'
import { useNuvem } from '../estado/contextoNuvem.ts'
import { useOutraAbaGravou } from '../estado/usarOutraAba.ts'
import { baixarBackup } from './baixarBackup.ts'

/**
 * Perfil e o backup em arquivo, tudo da conta que está dentro (spec dados-por-conta, D-125).
 * Os dados vão para a nuvem sozinhos (spec dados-na-nuvem, D-129): os botões de enviar e trazer a cópia e o
 * "Apagar todos os seus dados deste aparelho" saíram (D-131, CA-482). O backup restaurado entra na cópia de
 * trabalho e sobe como qualquer mudança. A logo saiu daqui (spec marca-no-link, D-950): ela mora em Conta e assinatura ›
 * Sua marca, uma só para o link do paciente e o plano impresso.
 */
export function TelaConfiguracoes() {
  const armazenamento = useArmazenamento()
  const [perfil, setPerfil] = useState<Perfil>(() => lerPerfil(armazenamento))
  const [mensagem, setMensagem] = useState<string | null>(null)
  const arquivoRef = useRef<HTMLInputElement | null>(null)
  const naNuvem = useNuvem() !== null
  // CB-124: outra aba da conta gravou o perfil; os campos se refazem.
  const relerPerfil = useCallback(() => setPerfil(lerPerfil(armazenamento)), [armazenamento])
  useOutraAbaGravou('metanutri:perfil', relerPerfil)

  const alterar = (mudanca: Partial<Perfil>) => {
    const novo = { ...perfil, ...mudanca }
    setPerfil(novo)
    gravarPerfil(armazenamento, novo)
  }

  const exportarTudo = () => {
    baixarBackup(armazenamento)
    setMensagem('Backup salvo. Guarde esse arquivo: é a cópia de todos os seus dados.')
  }

  const importar = (arquivo: File | undefined) => {
    if (!arquivo) return
    const leitor = new FileReader()
    leitor.onload = () => {
      const { restaurados, erro } = restaurarBackup(armazenamento, String(leitor.result ?? ''))
      // Com a nuvem, o que foi restaurado sobe e vale para a conta toda (spec dados-na-nuvem, DP-27).
      const vale = naNuvem ? ' Vale para todos os aparelhos da sua conta.' : ''
      setMensagem(erro ?? `Backup restaurado (${restaurados} ${restaurados === 1 ? 'tipo de dado' : 'tipos de dado'}).${vale} Recarregue a página para ver.`)
    }
    leitor.readAsText(arquivo)
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
          <CardDescription>Estes dados aparecem no rodapé dos documentos.</CardDescription>
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
              rotulo="Preceptor(a)"
              valor={perfil.responsavel}
              aoMudar={(v) => alterar({ responsavel: v })}
              dica="Quem assina com você no estágio."
            />
          )}
          <CampoTexto rotulo="Instituição" valor={perfil.instituicao} aoMudar={(v) => alterar({ instituicao: v })} />
          <CampoTexto rotulo="Telefone" valor={perfil.telefone} aoMudar={(v) => alterar({ telefone: v })} />
          <CampoTexto rotulo="E-mail" valor={perfil.email} aoMudar={(v) => alterar({ email: v })} />
        </div>
        <p className="border-t border-border pt-3 text-sm text-muted-foreground">
          Como aparece no documento: <span className="text-foreground">{linhaDeResponsabilidade(perfil)}</span>
        </p>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seus dados</CardTitle>
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
      </Card>
    </div>
  )
}
