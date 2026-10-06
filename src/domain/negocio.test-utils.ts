// Contas, assinaturas e histórico de mentira para os testes do painel do dono.
// O nome não termina em `.test.ts`, então o Vitest não roda este arquivo como teste.
import type { AssinaturaNoPainel, ContaNoPainel, MudancaDeAssinatura } from './negocio.ts'

/** 02/10/2026, meio-dia em Brasília. */
export const AGORA = new Date('2026-10-02T15:00:00Z')

export function paga(
  plano: 'solo' | 'pro' | 'clinica',
  ciclo: 'mensal' | 'anual',
  valorCentavos: number,
  sobre: Partial<AssinaturaNoPainel> = {},
): AssinaturaNoPainel {
  return { plano, status: 'ativa', ciclo, valorCentavos, expiraEm: null, atualizadaEm: '2026-09-21T12:00:00Z', ...sobre }
}

/** Nutricionista com CRN-6 conferido, criada em 20/09, e-mail confirmado, entrou hoje. */
export function conta(id: string, sobre: Partial<ContaNoPainel> = {}): ContaNoPainel {
  return {
    id,
    nome: `Pessoa ${id}`,
    email: `${id}@exemplo.com`,
    criadaEm: '2026-09-20T12:00:00Z',
    emailConfirmadoEm: '2026-09-20T12:05:00Z',
    ultimoLoginEm: '2026-10-02T13:00:00Z',
    situacao: 'nutricionista',
    crnRegiao: 6,
    crnStatus: 'conferido',
    pedidoStatus: null,
    assinatura: null,
    ...sobre,
  }
}

/** Solo mensal ativo. */
export function mudanca(id: string, quando: string, sobre: Partial<MudancaDeAssinatura> = {}): MudancaDeAssinatura {
  return { conta: id, plano: 'solo', status: 'ativa', ciclo: 'mensal', valorCentavos: 3490, quando, ...sobre }
}
