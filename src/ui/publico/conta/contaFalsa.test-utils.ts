// Conta de mentira para os testes das telas: tudo dá certo, a menos que o teste diga.
// O nome não termina em `.test.ts`, então o Vitest não roda este arquivo como teste.
import type { ValorConta } from '../../estado/usarConta.ts'

export function contaFalsa(sobre: Partial<ValorConta> = {}): ValorConta {
  return {
    sessao: null,
    carregando: false,
    disponivel: true,
    emRecuperacao: false,
    entrar: vi.fn(async () => ({ ok: true, erro: null })),
    cadastrar: vi.fn(async () => ({ ok: true, erro: null, confirmarEmail: true })),
    reenviarConfirmacao: vi.fn(async () => ({ ok: true, erro: null })),
    pedirTrocaDeSenha: vi.fn(async () => ({ ok: true, erro: null })),
    trocarSenha: vi.fn(async () => ({ ok: true, erro: null })),
    sair: vi.fn(async () => undefined),
    ...sobre,
  }
}
