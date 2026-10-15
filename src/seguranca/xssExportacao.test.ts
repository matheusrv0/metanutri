// CA-487 (spec seguranca-lote-4): código malicioso nos textos que saem do app: o Word (.docx) do
// aconselhamento e do memorial e a tabela de adequação copiada em HTML. A carga tem de sair escapada, como
// texto, sem virar marcação no arquivo.
import JSZip from 'jszip'
import { calcularAdequacao } from '@/domain/adequacao.ts'
import { avaliarAntropometria } from '@/domain/antropometria.ts'
import { criarCasoVazio } from '@/domain/caso.ts'
import { calcularEnergia } from '@/domain/energia.ts'
import { calcularMacros } from '@/domain/macros.ts'
import { adicionarItem, adicionarRefeicao, criarPlanoPadrao } from '@/domain/plano.ts'
import { produtoComoAlimento } from '@/domain/produtos.ts'
import { buscarAlimento, registrarProdutos } from '@/domain/tabelas.ts'
import { totaisDoPlano } from '@/domain/totais.ts'
import type { Caso } from '@/domain/tipos.ts'
import { criarAconselhamento } from '../export/aconselhamento-docx.ts'
import { tabelaAdequacaoParaCopiar } from '../export/copiar-tabela.ts'
import { gerarBytes } from '../export/docx-comum.ts'
import { criarMemorial } from '../export/memorial-docx.ts'
import { CARGAS, conferirSemInjecao, malicioso } from './xss.test-utils.ts'

const ARROZ = 3
let n = 0
const ids = () => `w${++n}`

function casoMalicioso(): Caso {
  return {
    ...criarCasoVazio('c1'),
    nome: malicioso('nome do plano'),
    diagnosticoClinico: malicioso('diagnostico'),
    dataConsulta: '2026-10-14',
    sexo: 'F',
    idadeAnos: 30,
    pesoKg: 60,
    estaturaCm: 165,
    ocupacao: malicioso('ocupacao'),
    estagiario: malicioso('estagiario'),
    preceptor: malicioso('preceptor'),
    observacoes: malicioso('observacoes'),
  }
}

function planoMalicioso() {
  const produto = {
    id: 900_002,
    codigoBarras: '',
    nome: malicioso('nome do produto'),
    marca: malicioso('marca'),
    porcaoG: 100,
    medidaCaseira: '',
    porPorcao: { energia_kcal: 100, proteina_g: 5, lipideos_g: 2, carboidrato_g: 10 },
    criadoEm: '2026-10-14T12:00:00Z',
  }
  registrarProdutos([produtoComoAlimento(produto)])
  let plano = adicionarRefeicao(criarPlanoPadrao(ids), { nome: malicioso('refeicao'), horario: '15:30' }, ids)
  const refeicao = plano.refeicoes.find((r) => r.horario === '15:30')
  if (!refeicao) throw new Error('refeição não entrou')
  plano = adicionarItem(plano, refeicao.id, 'principal', { alimentoId: produto.id, gramas: 50 }, ids)
  plano = adicionarItem(plano, refeicao.id, 'principal', { alimentoId: ARROZ, gramas: 100 }, ids)
  return plano
}

const decodificar = (xml: string): string =>
  xml
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')

/** Todas as partes XML do .docx, já conferidas: cada uma é XML válido e nenhuma traz a carga como marcação. */
async function partesDoDocx(bytes: Uint8Array): Promise<Readonly<Record<string, string>>> {
  const zip = await JSZip.loadAsync(bytes)
  const partes: Record<string, string> = {}
  for (const nome of Object.keys(zip.files)) {
    if (!/\.(xml|rels)$/.test(nome)) continue
    const xml = (await zip.file(nome)?.async('string')) ?? ''
    const lido = new DOMParser().parseFromString(xml, 'application/xml')
    expect(lido.getElementsByTagName('parsererror'), `${nome} não é XML válido`).toHaveLength(0)
    for (const marcacao of ['<script', '<img', '<svg', '<a href', 'javascript:alert(1)">']) expect(xml, `${nome} traz ${marcacao} cru`).not.toContain(marcacao)
    partes[nome] = xml
  }
  expect(JSON.stringify(partes['word/_rels/document.xml.rels'] ?? '')).not.toMatch(/javascript:/i)
  return partes
}

describe('CA-487: código malicioso sai escapado no que o app exporta', () => {
  it('CA-487: Word do aconselhamento e do memorial: cada carga aparece como texto e nenhuma vira marcação', async () => {
    const caso = casoMalicioso()
    const plano = planoMalicioso()
    const aconselhamento = criarAconselhamento({
      caso,
      plano,
      antropometria: avaliarAntropometria(caso),
      buscar: buscarAlimento,
      orientacoes: malicioso('orientacoes'),
      receitas: malicioso('receitas'),
    })
    const partes = await partesDoDocx(await gerarBytes(aconselhamento))
    const texto = decodificar(partes['word/document.xml'] ?? '')
    for (const rotulo of ['nome do plano', 'diagnostico', 'ocupacao', 'estagiario', 'preceptor', 'refeicao', 'nome do produto', 'orientacoes', 'receitas']) {
      expect(texto).toContain(malicioso(rotulo))
    }

    const comNutricionista = criarAconselhamento({
      caso: { ...caso, estagiario: '', preceptor: '' },
      plano,
      antropometria: avaliarAntropometria(caso),
      buscar: buscarAlimento,
      nutricionista: malicioso('linha do nutricionista'),
    })
    const textoNutri = decodificar((await partesDoDocx(await gerarBytes(comNutricionista)))['word/document.xml'] ?? '')
    expect(textoNutri).toContain(malicioso('linha do nutricionista'))

    const totais = totaisDoPlano(plano, buscarAlimento)
    const memorial = criarMemorial({
      caso,
      energia: calcularEnergia(caso, { fator: 1.2 }),
      macros: calcularMacros(totais, caso),
      adequacao: calcularAdequacao(totais, caso, { tipo: 'individual' }),
      kcalPlano: totais.nutrientes.energia_kcal.total,
    })
    const textoMemorial = decodificar((await partesDoDocx(await gerarBytes(memorial)))['word/document.xml'] ?? '')
    expect(textoMemorial).toContain(malicioso('nome do plano'))
  })

  it('CA-487: tabela de adequação copiada: o HTML escapa a carga e, lido como página, não cria elemento nem endereço javascript:', () => {
    const caso = casoMalicioso()
    const totais = totaisDoPlano(planoMalicioso(), buscarAlimento)
    const adequacao = calcularAdequacao(totais, caso, { tipo: 'individual' })
    const primeira = adequacao.linhas[0]
    if (!primeira) throw new Error('sem linhas de adequação')
    const comCarga = { ...adequacao, fonte: malicioso('fonte'), linhas: [{ ...primeira, rotulo: malicioso('rotulo') }, ...adequacao.linhas.slice(1)] }
    const semCalculo = { ...adequacao, estagio: null, motivoSemCalculo: malicioso('motivo') }

    for (const [resultado, rotulos] of [
      [comCarga, ['rotulo', 'fonte']],
      [semCalculo, ['motivo']],
    ] as const) {
      const { html, texto } = tabelaAdequacaoParaCopiar(resultado)
      for (const carga of CARGAS) expect(html).not.toContain(carga)
      const pagina = new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, 'text/html')
      conferirSemInjecao(pagina)
      for (const rotulo of rotulos) expect(pagina.body.textContent).toContain(malicioso(rotulo))
      // O texto para planilha não leva a linha das referências; o resto vai igual, como texto puro.
      expect(texto).toContain(malicioso(rotulos[0]))
    }
  })
})
