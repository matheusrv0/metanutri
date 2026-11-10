// Spec assistente-ia, D-1324 e CA-2354: o navegador nunca fala com a Anthropic. Só a função sugerir-plano chama a API, com
// a chave no segredo do Supabase; a regra de conteúdo do app e a do site não ganham endereço novo.
import { diretivasDaPolitica, diretivasDoSite, textoDaPolitica } from './csp.ts'

describe('CA-2354: a CSP não deixa o navegador chamar a Anthropic', () => {
  it.each([
    ['app', textoDaPolitica(diretivasDaPolitica({ supabase: 'https://qmpljfjbdcrdbqutuvmg.supabase.co' }))],
    ['site', textoDaPolitica(diretivasDoSite())],
  ])('%s: nenhuma diretiva cita anthropic.com', (_, texto) => {
    expect(texto).not.toMatch(/anthropic/i)
    expect(texto).not.toContain('*')
  })
})
