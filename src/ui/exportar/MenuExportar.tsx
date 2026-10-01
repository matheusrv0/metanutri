import { ClipboardCopy, Download, FileText, Printer } from 'lucide-react'
import { useState } from 'react'
import { mostraReceitas, nutricionistaDoWord, type AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { calcularAdequacao } from '@/domain/adequacao.ts'
import { avaliarAntropometria } from '@/domain/antropometria.ts'
import { calcularEnergia } from '@/domain/energia.ts'
import { calcularMacros } from '@/domain/macros.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDoPlano } from '@/domain/totais.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
import { criarAconselhamento } from '@/export/aconselhamento-docx.ts'
import { tabelaAdequacaoParaCopiar } from '@/export/copiar-tabela.ts'
import { gerarBlob } from '@/export/docx-comum.ts'
import { criarMemorial } from '@/export/memorial-docx.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { usePacientesOpcional } from '../estado/contextoPacientes.ts'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ds/componentes/overlay/dropdown-menu.tsx'
import { baixarBlob, copiarTabela, nomeDeArquivo } from './baixar.ts'
import { DialogoImprimir } from './DialogoImprimir.tsx'

interface MenuExportarProps {
  readonly caso: Caso
  readonly plano: Plano
  /** Motivo para não exportar (CRN não encontrado depois do prazo, CA-290). */
  readonly bloqueio?: string | null | undefined
  /** Quem assina e a situação: o Word de nutricionista sai sem receitas e com uma assinatura só (CA-235, CA-252). */
  readonly assinatura?: AssinaturaDoPlano | null | undefined
}

/** CA-44 a CA-48: baixar os dois documentos Word e copiar a tabela de adequação. */
export function MenuExportar({ caso, plano, bloqueio, assinatura }: MenuExportarProps) {
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [imprimindo, setImprimindo] = useState(false)
  // Fora do app (teste isolado) não há ficha de paciente: a folha sai sem filtrar trocas.
  const restricoes = usePacientesOpcional()?.pacientes.find((p) => p.id === caso.pacienteId)?.restricoes

  const baixarAconselhamento = async () => {
    const documento = criarAconselhamento({
      caso,
      plano,
      antropometria: avaliarAntropometria(caso),
      buscar: buscarAlimento,
      orientacoes: caso.orientacoes,
      receitas: caso.receitas,
      nutricionista: nutricionistaDoWord(assinatura ?? null, caso),
      comReceitas: mostraReceitas(assinatura?.situacao ?? null, caso),
    })
    baixarBlob(await gerarBlob(documento), nomeDeArquivo(caso.nome, 'aconselhamento'))
    setMensagem('Aconselhamento baixado.')
  }

  const baixarMemorial = async () => {
    const totais = totaisDoPlano(plano, buscarAlimento)
    const documento = criarMemorial({
      caso,
      energia: calcularEnergia(caso, { fator: caso.energia.fator, formula: caso.energia.formula, getManual: caso.energia.getManual }),
      macros: calcularMacros(totais, caso, caso.metasMacros),
      adequacao: calcularAdequacao(totais, caso, caso.adequacao.preset),
      kcalPlano: totais.nutrientes.energia_kcal.total,
    })
    baixarBlob(await gerarBlob(documento), nomeDeArquivo(caso.nome, 'memorial-de-calculo'))
    setMensagem('Memorial de cálculo baixado.')
  }

  const copiar = async () => {
    const totais = totaisDoPlano(plano, buscarAlimento)
    const { html, texto } = tabelaAdequacaoParaCopiar(calcularAdequacao(totais, caso, caso.adequacao.preset))
    const copiado = await copiarTabela(html, texto)
    setMensagem(copiado ? 'Tabela copiada: cole no Word.' : 'O navegador não permitiu copiar. Use o Word exportado.')
  }

  return (
    <div className="flex items-center gap-2">
      {bloqueio ? (
        <p role="status" className="max-w-56 text-xs text-warningtext">
          {bloqueio}
        </p>
      ) : (
        <p role="status" className="hidden text-xs text-muted-foreground sm:block">
          {mensagem}
        </p>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" disabled={Boolean(bloqueio)}>
            <Download aria-hidden="true" />
            Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setImprimindo(true)}>
            <Printer aria-hidden="true" />
            Dieta para imprimir (PDF)
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void baixarAconselhamento()}>
            <FileText aria-hidden="true" />
            Aconselhamento em Word
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void baixarMemorial()}>
            <FileText aria-hidden="true" />
            Memorial de cálculo em Word
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void copiar()}>
            <ClipboardCopy aria-hidden="true" />
            Copiar tabela de adequação
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogoImprimir aberto={imprimindo} caso={caso} plano={plano} restricoes={restricoes} assinatura={assinatura} aoFechar={() => setImprimindo(false)} />
    </div>
  )
}
