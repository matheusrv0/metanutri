import type { ReactNode } from 'react'
import { FRASE_PROPOSTA, linhaFinaDoDocumento } from '@/domain/documentoDoPaciente.ts'
import type { AssinaturaDaFolha } from '@/domain/folhaDieta.ts'
import { dataPorExtenso } from '@/domain/formatarData.ts'
import { lerPerfil } from '@/domain/perfil.ts'
import { Logo } from '@ds/componentes/display/Logo.tsx'
import { useArmazenamento } from '../estado/contextoArmazenamento.ts'
import { LinhasDeAssinatura } from './LinhasDeAssinatura.tsx'
import { regraDaLinhaFina } from './linhaFina.ts'
import { QuemAssina } from './QuemAssina.tsx'

interface FolhaDocumentoProps {
  readonly titulo: string
  readonly paciente: string
  /** A data do dia, AAAA-MM-DD. */
  readonly data: string
  readonly assinatura: AssinaturaDaFolha
  /** Conta de estudante: a frase de proposta do estágio logo abaixo do topo (CA-582). */
  readonly proposta: boolean
  readonly children: ReactNode
}

/**
 * A moldura das folhas curtas do paciente (spec anamnese-e-prescricoes, CA-576 e CA-580): o mesmo topo da dieta
 * impressa, com a logo, o título, o paciente, a data e quem assina, e as linhas de assinatura no fim.
 */
export function FolhaDocumento({ titulo, paciente, data, assinatura, proposta, children }: FolhaDocumentoProps) {
  const perfil = lerPerfil(useArmazenamento())
  const linha = [paciente.trim() || 'Paciente sem nome', dataPorExtenso(data)].filter(Boolean).join(' · ')
  const linhaFina = linhaFinaDoDocumento(titulo, paciente, assinatura)

  return (
    <article aria-label={titulo} className="folha-documento mx-auto flex max-w-[820px] flex-col gap-6 bg-card p-4 text-sm leading-relaxed text-foreground sm:p-10">
      {/* Se passar de uma página, as seguintes trazem o título, o paciente e quem assina (como a dieta, CA-316). */}
      <style>{regraDaLinhaFina(linhaFina.esquerda, linhaFina.direita)}</style>

      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          {perfil.logo ? <img src={perfil.logo} alt="" className="h-12 w-auto self-start" /> : <Logo variante="claro" tamanho={24} />}
          <div>
            <h2 className="font-titulo text-3xl font-bold leading-tight text-heading">{titulo}</h2>
            <p className="text-base text-muted-foreground">{linha}</p>
          </div>
        </div>
        <QuemAssina assinatura={assinatura} />
      </header>
      {/* Como na dieta (spec impressao-do-plano, CA-639): um fio fino no lugar da régua de cor. */}
      <div aria-hidden="true" className="-mt-2 border-t border-border" />

      {/* CA-640: a frase de estágio em negrito, sem caixa de fundo. */}
      {proposta ? <p className="font-semibold text-heading">{FRASE_PROPOSTA}</p> : null}

      {children}

      {/* A assinatura não fica sozinha no topo de uma página: vai junto com o último item. */}
      <div className="break-before-avoid break-inside-avoid">
        <LinhasDeAssinatura assinatura={assinatura} />
      </div>
    </article>
  )
}
