// O termo de autorização para o uso de IA no plano, em Word (spec assistente-ia, D-1304 e seção 7). O texto é o da spec,
// marcado PARA O DONO APROVAR (D-1353): muda aqui e na seção 7 juntos.
import { Document, Paragraph, TextRun } from 'docx'
import type { AssinaturaDoPlano } from '../domain/assinaturaDoPlano.ts'
import { paragrafo, titulo } from './docx-comum.ts'

/** Quem vai revisar a sugestão: a nutricionista pelo nome; o estudante com o preceptor (D-1322). */
export function quemRevisaNoTermo(assinatura: AssinaturaDoPlano | null): string {
  const nome = assinatura?.nome.trim() ?? ''
  if (assinatura?.situacao === 'estudante' && nome) {
    const preceptor = assinatura.responsavelTecnico.trim()
    return preceptor ? `${nome}, com o(a) preceptor(a) ${preceptor},` : nome
  }
  return nome || 'a nutricionista'
}

/** Seção 7 da spec: o termo que o paciente assina. */
export function criarTermoIa(quemRevisa: string): Document {
  return new Document({
    creator: 'MetaNutri',
    title: 'Autorização para uso de inteligência artificial no plano alimentar',
    sections: [
      {
        children: [
          titulo('Autorização para uso de inteligência artificial no plano alimentar'),
          paragrafo(
            `Autorizo que os dados do meu atendimento necessários para montar o plano alimentar sejam processados pela ferramenta de inteligência artificial do MetaNutri, para sugerir o plano que ${quemRevisa} vai revisar: idade, sexo, medidas, gestação ou lactação, condições de saúde, medicamentos, restrições, preferências e rotina.`,
          ),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: 'Esses dados são enviados à Anthropic, nos Estados Unidos, sem meu nome, contato ou data de nascimento.', bold: true }),
              new TextRun({ text: ' A Anthropic não os usa para treinar modelos e os apaga em até 30 dias.' }),
            ],
          }),
          paragrafo('Posso recusar ou retirar esta autorização a qualquer momento, sem prejuízo do atendimento.'),
          new Paragraph({ spacing: { before: 480 }, children: [new TextRun({ text: 'Nome: ______________________________  Data: ___/___/____  Assinatura: ______________________________' })] }),
        ],
      },
    ],
  })
}
