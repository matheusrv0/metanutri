import JSZip from 'jszip'
import { calcularAdequacao } from '../domain/adequacao.ts'
import { avaliarAntropometria } from '../domain/antropometria.ts'
import { criarCasoVazio } from '../domain/caso.ts'
import { calcularEnergia } from '../domain/energia.ts'
import { calcularMacros } from '../domain/macros.ts'
import { adicionarItem, criarPlanoPadrao } from '../domain/plano.ts'
import { buscarAlimento } from '../domain/tabelas.ts'
import { totaisDoPlano } from '../domain/totais.ts'
import type { Caso, Plano } from '../domain/tipos.ts'
import { criarAconselhamento, descreverItem } from './aconselhamento-docx.ts'
import { gerarBytes } from './docx-comum.ts'
import { criarMemorial } from './memorial-docx.ts'

async function textoDoDocx(bytes: Uint8Array): Promise<{ texto: string; tabelas: number }> {
  const zip = await JSZip.loadAsync(bytes)
  const xml = (await zip.file('word/document.xml')?.async('string')) ?? ''
  const texto = xml
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
  return { texto, tabelas: (xml.match(/<w:tbl>/g) ?? []).length }
}

const ids = () => {
  let n = 0
  return () => `id${++n}`
}

function montarCaso(parcial: Partial<Caso> = {}): { caso: Caso; plano: Plano } {
  const gerar = ids()
  const caso: Caso = {
    ...criarCasoVazio('c1'),
    // Os textos abaixo são do plano em "Só medida" (spec alimentos-e-gramaturas, D-376: o plano de antes lê assim).
    quantidades: 'medida-caseira',
    nome: 'Paciente Exemplo',
    diagnosticoClinico: 'Hipertensão',
    dataConsulta: '2026-09-15',
    sexo: 'F',
    idadeAnos: 45,
    pesoKg: 72,
    estaturaCm: 160,
    ocupacao: 'Professora',
    estagiario: 'Estagiária Exemplo',
    preceptor: 'Preceptora Exemplo',
    circunferenciaCinturaCm: 90,
    ...parcial,
  }
  let plano = criarPlanoPadrao(gerar)
  const almoco = plano.refeicoes.find((r) => r.nome === 'Almoço')?.id ?? ''
  const jantar = plano.refeicoes.find((r) => r.nome === 'Jantar')?.id ?? ''
  plano = adicionarItem(plano, almoco, 'principal', { alimentoId: 3, gramas: 150 }, gerar) // arroz: 6 colheres de sopa
  plano = adicionarItem(plano, almoco, 'principal', { alimentoId: 561, gramas: 140 }, gerar) // feijão: 1 concha
  plano = adicionarItem(plano, almoco, 'substituto1', { alimentoId: 91, gramas: 350 }, gerar) // batata
  plano = adicionarItem(plano, jantar, 'principal', { alimentoId: 40, gramas: 80 }, gerar) // macarrão cru: sem medida caseira
  return { caso, plano }
}

describe('Aconselhamento em Word (CA-44, CA-45, CA-47)', () => {
  it('segue a estrutura do modelo: cabeçalho, antropometria, refeições com 3 opções, orientações, receitas e assinaturas', async () => {
    const { caso, plano } = montarCaso()
    const doc = criarAconselhamento({
      caso,
      plano,
      antropometria: avaliarAntropometria(caso),
      buscar: buscarAlimento,
      orientacoes: 'Beber água ao longo do dia.',
      receitas: 'Salada de grão-de-bico.',
    })
    const { texto, tabelas } = await textoDoDocx(await gerarBytes(doc))

    expect(texto).toContain('ACONSELHAMENTO NUTRICIONAL')
    for (const t of ['Nome: Paciente Exemplo', 'Diagnóstico clínico: Hipertensão', 'Idade: 45 anos', 'Sexo: M( ) F(X)', 'Data da Consulta: 15/09/2026', 'Peso: 72,0 kg', 'Estatura: 160 cm', 'Ocupação: Professora', 'Estagiário(a): Estagiária Exemplo', 'Preceptor(a): Preceptora Exemplo']) {
      expect(texto).toContain(t)
    }
    expect(texto).toContain('ANTROPOMETRIA')
    expect(texto).toMatch(/IMC.*28,1 kg\/m².*Sobrepeso/s)
    expect(texto).toMatch(/CC \(Circunferência da Cintura\).*90,0 cm.*Risco substancialmente aumentado/s)
    for (const r of ['06:00 - Desjejum', '09:00 - Lanche da manhã', '12:00 - Almoço', '16:00 - Lanche da tarde', '19:00 - Jantar', '21:00 - Ceia']) {
      expect(texto).toContain(r)
    }
    expect(texto).toContain('Arroz, tipo 1, cozido (6 colheres de sopa); Feijão, carioca, cozido (1 concha)')
    expect(texto).toMatch(/Substituto 1:.*Batata, inglesa, cozida/s)
    expect(texto).toContain('Beber água ao longo do dia.')
    expect(texto).toContain('Salada de grão-de-bico.')
    expect(texto).toContain('Preceptor(a): ____')
    expect(tabelas).toBe(2 + 6) // cabeçalho, antropometria e uma tabela por refeição
  })

  it('CA-45: alimento sem medida caseira aparece em gramas', () => {
    expect(descreverItem({ id: 'x', alimentoId: 40, gramas: 80 }, buscarAlimento)).toBe('Macarrão, trigo, cru (80 g)')
  })

  it('CA-789 (spec revisao-geral-trabalho; D-385 da alimentos-e-gramaturas): alimento próprio excluído sai como "Alimento excluído", com os gramas, sem quebrar o Word', () => {
    expect(descreverItem({ id: 'x', alimentoId: 900_001, gramas: 40 }, buscarAlimento)).toBe('Alimento excluído (40 g)')
    expect(descreverItem({ id: 'y', alimentoId: 99_999, gramas: 80 }, buscarAlimento)).toBe('Alimento removido (80 g)')
  })

  it('CA-781 (spec revisao-geral-trabalho): a medida do Word é a da folha, com a ponta de faca e sem fatia de manteiga', () => {
    expect(descreverItem({ id: 'x', alimentoId: 263, gramas: 5 }, buscarAlimento)).toBe('Margarina, com óleo hidrogenado, com sal (65% de lipídeos) (1 ponta de faca)')
    expect(descreverItem({ id: 'y', alimentoId: 261, gramas: 30 }, buscarAlimento)).toBe('Manteiga, com sal (1 colher de sopa)')
  })

  it('CA-929 (spec conduta-da-nutricionista): a quantidade segue a escolha do plano', async () => {
    expect(descreverItem({ id: 'x', alimentoId: 3, gramas: 150 }, buscarAlimento, 'gramas')).toBe('Arroz, tipo 1, cozido (150 g)')
    expect(descreverItem({ id: 'x', alimentoId: 3, gramas: 150 }, buscarAlimento, 'medida-caseira')).toBe('Arroz, tipo 1, cozido (6 colheres de sopa)')
    // CA-927: manteiga em ponta de faca.
    expect(descreverItem({ id: 'x', alimentoId: 261, gramas: 5 }, buscarAlimento)).toBe('Manteiga, com sal (1 ponta de faca)')
    const { caso, plano } = montarCaso({ quantidades: 'gramas' })
    const doc = criarAconselhamento({ caso, plano, antropometria: avaliarAntropometria(caso), buscar: buscarAlimento })
    const { texto } = await textoDoDocx(await gerarBytes(doc))
    expect(texto).toContain('Arroz, tipo 1, cozido (150 g); Feijão, carioca, cozido (140 g)')
    // CA-933: a linha automática da água é só da folha impressa.
    expect(texto).not.toContain('litros de água')
  })

  it('CA-47: campos vazios ficam em branco, sem "undefined" nem "null"', async () => {
    const gerar = ids()
    const caso = criarCasoVazio('vazio')
    const doc = criarAconselhamento({ caso, plano: criarPlanoPadrao(gerar), antropometria: avaliarAntropometria(caso), buscar: buscarAlimento })
    const { texto } = await textoDoDocx(await gerarBytes(doc))
    expect(texto).not.toMatch(/undefined|null|NaN/)
    expect(texto).toContain('Nome: ')
    expect(texto).toContain('Sexo: M( ) F( )')
  })

  it('CA-252: nutricionista sai com a linha do cadastro e uma assinatura só', async () => {
    const { caso, plano } = montarCaso({ estagiario: '', preceptor: '' })
    const doc = criarAconselhamento({
      caso,
      plano,
      antropometria: avaliarAntropometria(caso),
      buscar: buscarAlimento,
      nutricionista: 'Ana Souza · CRN-6 12345',
      comReceitas: false,
    })
    const { texto } = await textoDoDocx(await gerarBytes(doc))
    expect(texto).toContain('Nutricionista: Ana Souza · CRN-6 12345')
    expect(texto).toContain('Nutricionista: ____')
    expect(texto).not.toContain('Estagiário(a)')
    expect(texto).not.toContain('Preceptor(a)')
    expect(texto).toContain('ASSINATURA')
    expect(texto).not.toContain('ASSINATURAS')
    expect(texto).not.toMatch(/undefined|null|NaN/)
  })

  it('item 2: modo rápido sai sem o bloco de antropometria, mas com peso e estatura no cabeçalho', async () => {
    const { caso, plano } = montarCaso({ modo: 'rapido', pesoKg: 70, estaturaCm: 165 })
    const doc = criarAconselhamento({ caso, plano, antropometria: avaliarAntropometria(caso), buscar: buscarAlimento })
    const { texto } = await textoDoDocx(await gerarBytes(doc))
    expect(texto).not.toContain('ANTROPOMETRIA')
    expect(texto).not.toContain('IMC')
    expect(texto).toContain('Peso: 70,0 kg')
    expect(texto).toContain('Estatura: 165 cm')
    expect(texto).toContain('PLANO ALIMENTAR')
  })

  it('CA-235: sem receitas, nem o título sai', async () => {
    const { caso, plano } = montarCaso()
    const doc = criarAconselhamento({
      caso,
      plano,
      antropometria: avaliarAntropometria(caso),
      buscar: buscarAlimento,
      receitas: 'Não deveria sair.',
      comReceitas: false,
    })
    const { texto } = await textoDoDocx(await gerarBytes(doc))
    expect(texto).not.toContain('RECEITAS SAUDÁVEIS')
    expect(texto).not.toContain('Não deveria sair.')
  })

  it('CA-236: sem as opções novas, o Word de estágio sai como antes', async () => {
    const { caso, plano } = montarCaso()
    const doc = criarAconselhamento({ caso, plano, antropometria: avaliarAntropometria(caso), buscar: buscarAlimento, receitas: 'Salada.' })
    const { texto } = await textoDoDocx(await gerarBytes(doc))
    expect(texto).toContain('RECEITAS SAUDÁVEIS')
    expect(texto).toContain('Estagiário(a): Estagiária Exemplo')
    expect(texto).toContain('ASSINATURAS')
  })
})

describe('Suplementos no Word de aconselhamento (spec anamnese-e-prescricoes)', () => {
  const vitD = { id: 's1', nome: 'Vitamina D3', dose: '1 cápsula', horario: 'No almoço', duracao: '3 meses', observacao: 'Com comida' }
  const FRASE = 'Proposta do estágio para avaliação do(a) preceptor(a). Só vale com a assinatura do(a) preceptor(a).'

  it('CA-577: SUPLEMENTAÇÃO vem logo depois das orientações, com nome, a linha de baixo e a observação; sem nome não sai', async () => {
    const { caso, plano } = montarCaso()
    const doc = criarAconselhamento({
      caso,
      plano,
      antropometria: avaliarAntropometria(caso),
      buscar: buscarAlimento,
      orientacoes: 'Beber água.',
      receitas: 'Salada.',
      suplementos: [vitD, { ...vitD, id: 's2', nome: '', dose: 'esquecido' }],
    })
    const { texto } = await textoDoDocx(await gerarBytes(doc))
    const ordem = ['ORIENTAÇÕES NUTRICIONAIS', 'Beber água.', 'SUPLEMENTAÇÃO', 'Vitamina D3 · Dose: 1 cápsula · Horário: No almoço · Por quanto tempo: 3 meses', 'Com comida', 'RECEITAS SAUDÁVEIS'].map((t) =>
      texto.indexOf(t),
    )
    expect(ordem.every((i) => i >= 0)).toBe(true)
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem)
    expect(texto).not.toContain('esquecido')
    expect(texto).not.toContain(FRASE)
  })

  it('CA-577 e CB-166: sem suplemento, o Word sai sem a seção', async () => {
    const { caso, plano } = montarCaso()
    const doc = criarAconselhamento({ caso, plano, antropometria: avaliarAntropometria(caso), buscar: buscarAlimento, suplementos: [] })
    const { texto } = await textoDoDocx(await gerarBytes(doc))
    expect(texto).not.toContain('SUPLEMENTAÇÃO')
  })

  it('CA-584: plano de estágio leva a frase de proposta', async () => {
    const { caso, plano } = montarCaso()
    const doc = criarAconselhamento({ caso, plano, antropometria: avaliarAntropometria(caso), buscar: buscarAlimento, suplementos: [vitD], propostaDeEstagio: true })
    const { texto } = await textoDoDocx(await gerarBytes(doc))
    expect(texto.indexOf(FRASE)).toBeGreaterThan(texto.indexOf('SUPLEMENTAÇÃO'))
  })
})

describe('Memorial de cálculo em Word (CA-46, CA-47)', () => {
  it('traz energia, macros e a tabela de adequação com o tipo de referência', async () => {
    const { caso, plano } = montarCaso()
    const totais = totaisDoPlano(plano, buscarAlimento)
    const energia = calcularEnergia(caso, { fator: 1.37 })
    const doc = criarMemorial({
      caso,
      energia,
      macros: calcularMacros(totais, caso),
      adequacao: calcularAdequacao(totais, caso, { tipo: 'individual' }),
      kcalPlano: totais.nutrientes.energia_kcal.total,
    })
    const { texto, tabelas } = await textoDoDocx(await gerarBytes(doc))
    expect(texto).toContain('MEMORIAL DE CÁLCULO')
    expect(texto).toMatch(/Método.*Mifflin-St Jeor/s)
    expect(texto).toMatch(/TMB.*1\.334 kcal/s) // 10×72 + 6,25×160 − 5×45 − 161 = 1334
    expect(texto).toMatch(/Fator de atividade.*1,37/s)
    expect(texto).toMatch(/GET.*1\.828 kcal/s) // 1334 × 1,37 = 1827,58
    expect(texto).toMatch(/Proteína.*g.*%/s)
    expect(texto).toMatch(/Ferro.*RDA/s)
    expect(texto).toMatch(/Potássio.*AI/s)
    expect(texto).toContain('Referências:')
    expect(tabelas).toBe(3)
    expect(texto).not.toMatch(/undefined|null|NaN/)
  })

  it('CA-789 (spec revisao-geral-trabalho): sem o dado de energia de algum alimento, "kcal do plano" leva "*" e a nota', async () => {
    const { caso, plano } = montarCaso()
    const totais = totaisDoPlano(plano, buscarAlimento)
    const doc = criarMemorial({
      caso,
      energia: calcularEnergia(caso, { fator: 1.37 }),
      macros: calcularMacros(totais, caso),
      adequacao: calcularAdequacao(totais, caso, { tipo: 'individual' }),
      kcalPlano: totais.nutrientes.energia_kcal.total,
      kcalPlanoSemDado: 1,
    })
    const { texto } = await textoDoDocx(await gerarBytes(doc))
    expect(texto).toMatch(/kcal do plano.*\d kcal \*/s)
    expect(texto).toContain('* 1 ou mais alimentos sem dado de energia: o total pode estar subestimado.')
  })

  it('CA-968 (spec vitaminas-usda): a tabela de adequação traz as 21 linhas, com as cinco do USDA', async () => {
    const { caso, plano } = montarCaso()
    const totais = totaisDoPlano(plano, buscarAlimento)
    const adequacao = calcularAdequacao(totais, caso, { tipo: 'individual' })
    const doc = criarMemorial({ caso, energia: calcularEnergia(caso, { fator: 1.37 }), macros: calcularMacros(totais, caso), adequacao, kcalPlano: totais.nutrientes.energia_kcal.total })
    const { texto } = await textoDoDocx(await gerarBytes(doc))
    expect(adequacao.linhas).toHaveLength(21)
    for (const linha of adequacao.linhas) expect(texto, linha.rotulo).toContain(linha.rotulo)
    expect(texto).toMatch(/Vitamina D.*µg.*RDA/s)
    expect(texto).toMatch(/Selênio.*µg.*RDA/s)
    expect(texto).not.toMatch(/undefined|null|NaN/)
  })

  it('CA-47: sem dados do caso, gera o documento sem "undefined" e explica a falta das referências', async () => {
    const caso = criarCasoVazio('vazio')
    const totais = totaisDoPlano({ refeicoes: [] }, buscarAlimento)
    const doc = criarMemorial({
      caso,
      energia: calcularEnergia(caso, { fator: 1.2 }),
      macros: calcularMacros(totais, caso),
      adequacao: calcularAdequacao(totais, caso, { tipo: 'individual' }),
      kcalPlano: 0,
    })
    const { texto } = await textoDoDocx(await gerarBytes(doc))
    expect(texto).not.toMatch(/undefined|null|NaN/)
    expect(texto).toMatch(/Informe sexo e idade/)
  })
})
