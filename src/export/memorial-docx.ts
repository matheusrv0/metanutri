// Documento "Memorial de cálculo": energia, macronutrientes e adequação (SPEC CA-46, CA-47).
import { Document } from 'docx'
import type { ResultadoAdequacao } from '../domain/adequacao.ts'
import type { ResultadoEnergia } from '../domain/energia.ts'
import type { ResultadoMacro, ResultadoMacros } from '../domain/macros.ts'
import type { Caso } from '../domain/tipos.ts'
import { tabelaAdequacaoParaCopiar } from './copiar-tabela.ts'
import { celula, formatarNumeroDocx, linha, paragrafo, subtitulo, tabela, texto, titulo } from './docx-comum.ts'

export interface DadosMemorial {
  readonly caso: Caso
  readonly energia: ResultadoEnergia
  readonly macros: ResultadoMacros
  readonly adequacao: ResultadoAdequacao
  readonly kcalPlano: number
}

const NOME_METODO: Readonly<Record<NonNullable<ResultadoEnergia['metodo']>, string>> = {
  mifflin: 'Mifflin-St Jeor',
  'harris-benedict': 'Harris-Benedict',
  'nasem-2023': 'Equações de EER do NASEM (2023)',
}

const ESTADO_MACRO = { abaixo: 'Abaixo', dentro: 'Dentro', acima: 'Acima' } as const

function linhaMacro(nome: string, m: ResultadoMacro) {
  const meta = m.meta ? `${formatarNumeroDocx(m.meta.min, m.meta.tipo === 'g_kg' ? 1 : 0)} a ${formatarNumeroDocx(m.meta.max, m.meta.tipo === 'g_kg' ? 1 : 0)} ${m.meta.tipo === 'g_kg' ? 'g/kg' : '%'}` : ''
  return linha([
    celula(nome),
    celula(`${formatarNumeroDocx(m.gramas)} g`),
    celula(m.pctKcal === null ? '' : `${formatarNumeroDocx(m.pctKcal)}%`),
    celula(m.gPorKg === null ? '' : `${formatarNumeroDocx(m.gPorKg, 2)} g/kg`),
    celula(meta),
    celula(m.estado ? ESTADO_MACRO[m.estado] : ''),
  ])
}

export function criarMemorial(dados: DadosMemorial): Document {
  const { caso, energia, macros, adequacao } = dados

  const energiaLinhas = [
    ['Método', energia.getManual ? 'GET definido manualmente' : energia.metodo ? NOME_METODO[energia.metodo] : ''],
    ['TMB', energia.tmb === null ? '' : `${formatarNumeroDocx(energia.tmb, 0)} kcal`],
    ['Fator de atividade', energia.metodo === 'nasem-2023' || energia.getManual ? '' : formatarNumeroDocx(energia.fator, 2)],
    ['Categoria de atividade (NASEM)', texto(energia.categoriaAtividade)],
    ...energia.adicionais.map((a) => [a.descricao, `${a.kcal > 0 ? '+' : ''}${formatarNumeroDocx(a.kcal, 0)} kcal`]),
    ['GET', energia.get === null ? '' : `${formatarNumeroDocx(energia.get, 0)} kcal`],
    ['kcal do plano', `${formatarNumeroDocx(dados.kcalPlano, 0)} kcal`],
  ]

  const adequacaoCopiada = tabelaAdequacaoParaCopiar(adequacao)
  const adequacaoTabela =
    adequacao.linhas.length === 0
      ? [paragrafo(adequacaoCopiada.texto)]
      : [
          tabela([
            linha(['Nutriente', 'Total', 'Referência', 'Tipo', 'Adequação', 'Estado'].map((c) => celula(c, { negrito: true }))),
            ...adequacaoCopiada.texto
              .split('\n')
              .slice(1)
              .filter((l) => l.includes('\t'))
              .map((l) => linha(l.split('\t').map((c) => celula(c)))),
          ]),
          ...(adequacao.linhas.some((l) => l.subestimado) ? [paragrafo('* 1 ou mais alimentos sem dado para este nutriente: o total pode estar subestimado.')] : []),
        ]

  return new Document({
    creator: 'MetaNutri',
    title: 'Memorial de cálculo',
    styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
    sections: [
      {
        children: [
          titulo('MEMORIAL DE CÁLCULO'),
          paragrafo(`Caso: ${texto(caso.nome)}`),
          subtitulo('ENERGIA'),
          tabela(energiaLinhas.map(([rotulo, valor]) => linha([celula(texto(rotulo), { negrito: true }), celula(texto(valor))]))),
          ...(energia.fonte ? [paragrafo(`Fonte: ${energia.fonte}`)] : []),
          subtitulo('DISTRIBUIÇÃO DE MACRONUTRIENTES'),
          tabela([
            linha(['Macronutriente', 'Gramas', '% das kcal', 'g/kg', 'Meta', 'Estado'].map((c) => celula(c, { negrito: true }))),
            linhaMacro('Proteína', macros.proteina),
            linhaMacro('Carboidrato', macros.carboidrato),
            linhaMacro('Gordura', macros.gordura),
          ]),
          subtitulo('ADEQUAÇÃO DE MICRONUTRIENTES'),
          ...(adequacao.estagio ? [paragrafo(`Estágio de vida das referências: ${adequacao.estagio.id}`)] : []),
          ...adequacaoTabela,
          paragrafo(`Referências: ${adequacao.fonte}`),
        ],
      },
    ],
  })
}
