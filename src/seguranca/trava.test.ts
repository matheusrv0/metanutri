// @vitest-environment node
// CB-129 (spec seguranca-lote-4): os testes de ataque nunca rodam contra a produção. A trava é conferida
// aqui, sem rede: só endereço local passa.
import { ambienteLocal, ehUrlLocal } from '../../testes/seguranca/local.ts'

const CHAVES = { ATAQUE_ANON_KEY: 'chave-anon-local', ATAQUE_SERVICE_KEY: 'chave-servico-local' }

describe('CB-129: a trava dos testes de ataque', () => {
  it.each(['http://127.0.0.1:55421', 'http://localhost:55421', 'http://[::1]:55421'])('CB-129: aceita o Supabase local %s', (url) => {
    expect(ehUrlLocal(url)).toBe(true)
    expect(ambienteLocal({ ...CHAVES, ATAQUE_API_URL: url }).url).toBe(url)
  })

  it.each([
    'https://qmpljfjbdcrdbqutuvmg.supabase.co',
    'https://outro-projeto.supabase.co',
    'http://127.0.0.1.exemplo.com',
    'http://localhost.exemplo.com:55421',
    'http://10.0.0.5:55421',
    'desligado',
    '',
  ])('CB-129: recusa %s antes de qualquer pedido', (url) => {
    expect(ehUrlLocal(url)).toBe(false)
    expect(() => ambienteLocal({ ...CHAVES, ATAQUE_API_URL: url })).toThrow(/RECUSADO/)
  })

  it('CB-129: sem as chaves locais, avisa o que falta', () => {
    expect(() => ambienteLocal({ ATAQUE_API_URL: 'http://127.0.0.1:55421' })).toThrow(/Faltam as chaves/)
  })
})
