import JSZip from 'jszip'
import { gerarBytes } from './docx-comum.ts'
import { criarTermoIa, quemRevisaNoTermo } from './termoIa.ts'

async function textoDoDocx(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes)
  const xml = (await zip.file('word/document.xml')?.async('string')) ?? ''
  return xml.replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '')
}

describe('O termo de autorização em Word (spec assistente-ia, seção 7, CA-2376)', () => {
  it('traz o texto da seção 7 com o nome de quem revisa', async () => {
    const texto = await textoDoDocx(await gerarBytes(criarTermoIa('Ana Lima')))
    expect(texto).toContain('Autorização para uso de inteligência artificial no plano alimentar')
    expect(texto).toContain(
      'Autorizo que os dados do meu atendimento necessários para montar o plano alimentar sejam processados pela ferramenta de inteligência artificial do MetaNutri, para sugerir o plano que Ana Lima vai revisar: idade, sexo, medidas, gestação ou lactação, condições de saúde, medicamentos, restrições, preferências e rotina.',
    )
    expect(texto).toContain('Esses dados são enviados à Anthropic, nos Estados Unidos, sem meu nome, contato ou data de nascimento.')
    expect(texto).toContain('A Anthropic não os usa para treinar modelos e os apaga em até 30 dias.')
    expect(texto).toContain('Posso recusar ou retirar esta autorização a qualquer momento, sem prejuízo do atendimento.')
    expect(texto).toMatch(/Nome: _+ {2}Data: ___\/___\/____ {2}Assinatura: _+/)
  })

  it('quem revisa: a nutricionista pelo nome; o estudante com o preceptor; sem nome, "a nutricionista"', () => {
    expect(quemRevisaNoTermo({ situacao: 'nutricionista', linhaNutricionista: 'Ana Lima · CRN-6 12345', origem: 'conta', nome: 'Ana Lima', responsavelTecnico: '' })).toBe('Ana Lima')
    expect(quemRevisaNoTermo({ situacao: 'estudante', linhaNutricionista: null, origem: 'conta', nome: 'Bia', responsavelTecnico: 'Carla Dias' })).toBe('Bia, com o(a) preceptor(a) Carla Dias,')
    expect(quemRevisaNoTermo(null)).toBe('a nutricionista')
  })
})
