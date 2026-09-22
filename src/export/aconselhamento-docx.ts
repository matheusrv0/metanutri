// Documento "Aconselhamento Nutricional" no formato do modelo de estágio (SPEC CA-44, CA-45, CA-47).
// Usa só a estrutura do modelo: nenhum nome de pessoa ou instituição do arquivo original entra aqui.
import { Document, Paragraph, TextRun } from 'docx'
import type { ResultadoAntropometria } from '../domain/antropometria.ts'
import { medidaEquivalente } from '../domain/busca.ts'
import { dataCompleta } from '../domain/formatarData.ts'
import { OPCOES, type BuscarAlimento, type Caso, type ItemPlano, type OpcaoId, type Plano } from '../domain/tipos.ts'
import { celula, celulaRotulo, formatarNumeroDocx, linha, paragrafo, subtitulo, tabela, texto, titulo } from './docx-comum.ts'

export interface DadosAconselhamento {
  readonly caso: Caso
  readonly plano: Plano
  readonly antropometria: ResultadoAntropometria
  readonly buscar: BuscarAlimento
  readonly orientacoes?: string
  readonly receitas?: string
}

const NOME_OPCAO: Readonly<Record<OpcaoId, string>> = {
  principal: 'Principal:',
  substituto1: 'Substituto 1:',
  substituto2: 'Substituto 2:',
}

/** "Arroz, tipo 1, cozido (6 colheres de sopa)"; sem medida caseira, em gramas (CA-45). */
export function descreverItem(item: ItemPlano, buscar: BuscarAlimento): string {
  const alimento = buscar(item.alimentoId)
  if (!alimento) throw new Error(`Alimento ${item.alimentoId} não existe na tabela.`)
  const medida = medidaEquivalente(item.alimentoId, item.gramas)
  const quantidade = medida ? medida.texto : `${formatarNumeroDocx(item.gramas, 0)} g`
  return `${alimento.descricao} (${quantidade})`
}

export function descreverOpcao(itens: readonly ItemPlano[], buscar: BuscarAlimento): string {
  return itens
    .filter((i) => i.gramas > 0)
    .map((i) => descreverItem(i, buscar))
    .join('; ')
}

function blocoTexto(conteudo: string | undefined): Paragraph[] {
  const linhas = texto(conteudo).split(/\r?\n/)
  return linhas.map((l) => paragrafo(l))
}

export function criarAconselhamento(dados: DadosAconselhamento): Document {
  const { caso, plano, antropometria, buscar } = dados
  const marcaSexo = `M(${caso.sexo === 'M' ? 'X' : ' '}) F(${caso.sexo === 'F' ? 'X' : ' '})`
  const idade = caso.idadeAnos === null ? '' : `${caso.idadeAnos} anos${caso.idadeMesesAdicionais ? ` e ${caso.idadeMesesAdicionais} meses` : ''}`

  const cabecalho = tabela([
    linha([celulaRotulo('Nome:', caso.nome, 2), celulaRotulo('Diagnóstico clínico:', caso.diagnosticoClinico, 2)]),
    linha([celulaRotulo('Idade:', idade), celulaRotulo('Sexo:', marcaSexo), celulaRotulo('Data da Consulta:', dataCompleta(caso.dataConsulta), 2)]),
    linha([
      celulaRotulo('Peso:', caso.pesoKg === null ? '' : `${formatarNumeroDocx(caso.pesoKg)} kg`),
      celulaRotulo('Estatura:', caso.estaturaCm === null ? '' : `${formatarNumeroDocx(caso.estaturaCm, 0)} cm`),
      celulaRotulo('Ocupação:', caso.ocupacao, 2),
    ]),
    linha([celulaRotulo('Estagiário(a):', caso.estagiario, 2), celulaRotulo('Preceptor(a):', caso.preceptor, 2)]),
  ])

  const a = antropometria
  const linhasAntropometria = [
    linha([celula('', { negrito: true }), celula('Resultado', { negrito: true }), celula('Diagnóstico', { negrito: true })]),
  ]
  if (a.imc) {
    linhasAntropometria.push(linha([celula('IMC'), celula(`${formatarNumeroDocx(a.imc.valor)} kg/m²`), celula(a.imc.grau ?? a.imc.classe)]))
  } else if (a.imcIdade) {
    linhasAntropometria.push(linha([celula('IMC para idade'), celula(`escore-z ${formatarNumeroDocx(a.imcIdade.z, 2)}`), celula(a.imcIdade.classe)]))
  } else if (a.gestacao) {
    linhasAntropometria.push(
      linha([celula('IMC pré-gestacional'), celula(`${formatarNumeroDocx(a.gestacao.imcPreGestacional)} kg/m²`), celula(a.gestacao.rotulo)]),
    )
  } else {
    linhasAntropometria.push(linha([celula('IMC'), celula(''), celula('')]))
  }
  if (a.estaturaIdade) {
    linhasAntropometria.push(linha([celula('Estatura para idade'), celula(`escore-z ${formatarNumeroDocx(a.estaturaIdade.z, 2)}`), celula(a.estaturaIdade.classe)]))
  }
  linhasAntropometria.push(
    linha([
      celula('CC (Circunferência da Cintura)'),
      celula(caso.circunferenciaCinturaCm === null ? '' : `${formatarNumeroDocx(caso.circunferenciaCinturaCm)} cm`),
      celula(a.cintura?.classe ?? ''),
    ]),
    linha([
      celula('CP (Circunferência da Panturrilha)'),
      celula(caso.circunferenciaPanturrilhaCm === null ? '' : `${formatarNumeroDocx(caso.circunferenciaPanturrilhaCm)} cm`),
      celula(a.panturrilha?.classe ?? ''),
    ]),
  )

  const refeicoes = plano.refeicoes.flatMap((r) => [
    tabela([
      linha([celula(`${r.horario} - ${r.nome}`, { negrito: true, colunas: 2 })]),
      ...OPCOES.map((o) => linha([celula(NOME_OPCAO[o], { negrito: true }), celula(descreverOpcao(r.opcoes[o], buscar))])),
    ]),
    new Paragraph({ text: '' }),
  ])

  return new Document({
    creator: 'MetaNutri',
    title: 'Aconselhamento Nutricional',
    styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
    sections: [
      {
        children: [
          titulo('ACONSELHAMENTO NUTRICIONAL'),
          cabecalho,
          subtitulo('ANTROPOMETRIA'),
          tabela(linhasAntropometria),
          subtitulo('PLANO ALIMENTAR'),
          ...refeicoes,
          subtitulo('ORIENTAÇÕES NUTRICIONAIS'),
          ...blocoTexto(dados.orientacoes),
          subtitulo('RECEITAS SAUDÁVEIS'),
          ...blocoTexto(dados.receitas),
          subtitulo('ASSINATURAS'),
          new Paragraph({ spacing: { before: 480 }, children: [new TextRun('Preceptor(a): ______________________________')] }),
          new Paragraph({ spacing: { before: 480 }, children: [new TextRun('Estagiário(a): ______________________________')] }),
          new Paragraph({ spacing: { before: 480 }, children: [new TextRun('Data: ____/____/________')] }),
        ],
      },
    ],
  })
}
