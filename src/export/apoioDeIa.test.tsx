// Spec assistente-ia, D-1322 e CA-2377: o plano com `origemIa` diz no PDF, no Word e no link do paciente que foi
// elaborado com apoio de IA; na conta de estudante, a frase da proposta do estágio.
import { render, screen } from '@testing-library/react'
import JSZip from 'jszip'
import type { AssinaturaDoPlano } from '../domain/assinaturaDoPlano.ts'
import { avaliarAntropometria } from '../domain/antropometria.ts'
import { criarCasoVazio } from '../domain/caso.ts'
import { copiarDieta, dietaDoPlano, dietaMudou, lerDieta } from '../domain/dietaDoLink.ts'
import { FRASE_APOIO_IA, FRASE_APOIO_IA_ESTAGIO, fraseDeApoioDeIa } from '../domain/documentoDoPaciente.ts'
import { adicionarItem, criarPlanoPadrao } from '../domain/plano.ts'
import { buscarAlimento } from '../domain/tabelas.ts'
import type { Caso, Plano } from '../domain/tipos.ts'
import { FolhaDieta } from '../ui/exportar/FolhaDieta.tsx'
import { MeuPlano } from '../ui/missoes/MeuPlano.tsx'
import { criarAconselhamento } from './aconselhamento-docx.ts'
import { gerarBytes } from './docx-comum.ts'

const ORIGEM = { em: '2026-11-03', modelo: 'claude-opus-5-5' }
const ANA: AssinaturaDoPlano = { situacao: 'nutricionista', linhaNutricionista: 'Ana Souza · CRN-6 12345', origem: 'conta', nome: 'Ana Souza', responsavelTecnico: '' }
const BIA: AssinaturaDoPlano = { situacao: 'estudante', linhaNutricionista: null, origem: 'conta', nome: 'Bia', responsavelTecnico: 'Carla' }

let n = 0
const ids = () => `id${++n}`

function montar(origemIa: Caso['origemIa']): { caso: Caso; plano: Plano } {
  const caso: Caso = { ...criarCasoVazio('c1'), nome: 'Maria', sexo: 'F', idadeAnos: 30, pesoKg: 60, estaturaCm: 165, origemIa }
  let plano = criarPlanoPadrao(ids)
  plano = adicionarItem(plano, plano.refeicoes[2]?.id ?? '', 'principal', { alimentoId: 3, gramas: 150 }, ids)
  return { caso, plano }
}

async function textoDoWord(caso: Caso, plano: Plano, propostaDeEstagio = false): Promise<string> {
  const bytes = await gerarBytes(criarAconselhamento({ caso, plano, antropometria: avaliarAntropometria(caso), buscar: buscarAlimento, propostaDeEstagio }))
  const zip = await JSZip.loadAsync(bytes)
  return ((await zip.file('word/document.xml')?.async('string')) ?? '').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '')
}

describe('a linha de apoio de IA no documento (spec assistente-ia, CA-2377)', () => {
  it('as frases são as da spec; sem `origemIa`, nenhuma', () => {
    expect(FRASE_APOIO_IA).toBe('Plano elaborado com apoio de inteligência artificial e revisado pela nutricionista.')
    expect(FRASE_APOIO_IA_ESTAGIO).toBe(
      'Proposta do estágio, elaborada com apoio de inteligência artificial, para avaliação do(a) preceptor(a). Só vale com a assinatura do(a) preceptor(a).',
    )
    expect(fraseDeApoioDeIa({ origemIa: ORIGEM }, false)).toBe(FRASE_APOIO_IA)
    expect(fraseDeApoioDeIa({ origemIa: ORIGEM }, true)).toBe(FRASE_APOIO_IA_ESTAGIO)
    expect(fraseDeApoioDeIa({ origemIa: null }, false)).toBeNull()
  })

  it('o PDF (a folha) traz a frase só no plano com a marca; na conta de estudante, a do estágio', () => {
    const com = montar(ORIGEM)
    const { unmount } = render(<FolhaDieta caso={com.caso} plano={com.plano} assinatura={ANA} />)
    expect(screen.getByText(FRASE_APOIO_IA)).toBeInTheDocument()
    unmount()
    const est = render(<FolhaDieta caso={com.caso} plano={com.plano} assinatura={BIA} />)
    expect(screen.getByText(FRASE_APOIO_IA_ESTAGIO)).toBeInTheDocument()
    est.unmount()
    const sem = montar(null)
    render(<FolhaDieta caso={sem.caso} plano={sem.plano} assinatura={ANA} />)
    expect(document.body.textContent).not.toContain('inteligência artificial')
  })

  it('o Word traz a frase só no plano com a marca', async () => {
    const com = montar(ORIGEM)
    expect(await textoDoWord(com.caso, com.plano)).toContain(FRASE_APOIO_IA)
    expect(await textoDoWord(com.caso, com.plano, true)).toContain(FRASE_APOIO_IA_ESTAGIO)
    const sem = montar(null)
    expect(await textoDoWord(sem.caso, sem.plano)).not.toContain('inteligência artificial')
  })

  it('o link do paciente leva a marca na cópia e mostra a frase; o link sem a marca fica igual ao de antes', () => {
    const com = montar(ORIGEM)
    const dieta = dietaDoPlano(com.caso, com.plano, buscarAlimento, { estagio: false })
    expect(dieta.apoioDeIa).toBe('plano')
    const copia = copiarDieta(dieta, '2026-11-03')
    expect(lerDieta(JSON.parse(JSON.stringify(copia)))?.apoioDeIa).toBe('plano')
    render(<MeuPlano dieta={copia} primeiroNome="Maria" />)
    expect(screen.getByText(FRASE_APOIO_IA)).toBeInTheDocument()

    const sem = montar(null)
    const semMarca = dietaDoPlano(sem.caso, sem.plano)
    expect('apoioDeIa' in semMarca).toBe(false)
    // A marca nova conta como mudança no que o paciente vê.
    expect(dietaMudou(copiarDieta(semMarca, '2026-11-03'), dieta)).toBe(true)
    expect(dietaDoPlano(com.caso, com.plano, buscarAlimento, { estagio: true }).apoioDeIa).toBe('estagio')
  })
})
