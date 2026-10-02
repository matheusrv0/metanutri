// Painel do dono de mentira para os testes das telas.
// O nome não termina em `.test.ts`, então o Vitest não roda este arquivo como teste.
import { AGORA, conta, mudanca, paga } from '@/domain/negocio.test-utils.ts'
import type { DadosDoNegocio, ValorNegocio } from '../estado/usarNegocio.ts'

export function dadosFalsos(sobre: Partial<DadosDoNegocio> = {}): DadosDoNegocio {
  return {
    contas: [
      conta('a', { nome: 'Ana Souza', criadaEm: '2026-09-30T12:00:00Z', assinatura: paga('pro', 'mensal', 6490) }),
      conta('b', { nome: 'Bruno Lima', criadaEm: '2026-09-25T12:00:00Z', assinatura: paga('solo', 'anual', 29900) }),
      conta('c', { nome: 'Carla Dias', criadaEm: '2026-09-20T12:00:00Z', situacao: 'estudante', crnRegiao: null, crnStatus: null, pedidoStatus: 'em_analise' }),
      conta('d', { nome: '', email: 'sem.nome@exemplo.com', criadaEm: '2026-09-15T12:00:00Z', assinatura: paga('solo', 'mensal', 3490, { status: 'pendente' }) }),
    ],
    historico: [mudanca('a', '2026-08-10T12:00:00Z', { plano: 'pro', valorCentavos: 6490 })],
    uso: { links30Dias: 58, copias30Dias: 112 },
    lidoEm: AGORA,
    ...sobre,
  }
}

export function negocioFalso(sobre: Partial<ValorNegocio> = {}): ValorNegocio {
  return { dados: dadosFalsos(), carregando: false, erro: null, atualizar: vi.fn(), ...sobre }
}
