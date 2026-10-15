// A trava que impede os testes de ataque de falar com um Supabase de verdade (spec seguranca-lote-4,
// CB-129). Pura: sem rede. Testada no `npm run check` (src/seguranca/trava.test.ts).

const HOSTS_LOCAIS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])

/** Só 127.0.0.1 ou localhost; qualquer outro endereço, a produção inclusive, é recusado. */
export function ehUrlLocal(texto: string): boolean {
  try {
    return HOSTS_LOCAIS.has(new URL(texto).hostname)
  } catch {
    return false
  }
}

export interface Ambiente {
  readonly url: string
  readonly anon: string
  readonly servico: string
}

/** As chaves que scripts/testes-de-ataque.mjs passa; lança antes de qualquer pedido se a URL não for local. */
export function ambienteLocal(env: Readonly<Record<string, string | undefined>> = process.env): Ambiente {
  const url = env['ATAQUE_API_URL'] ?? ''
  const anon = env['ATAQUE_ANON_KEY'] ?? ''
  const servico = env['ATAQUE_SERVICE_KEY'] ?? ''
  if (!ehUrlLocal(url)) {
    throw new Error(`RECUSADO: os testes de ataque só rodam num Supabase local (127.0.0.1 ou localhost). Recebi: "${url}". Rode pelo npm run test:seguranca.`)
  }
  if (!anon || !servico) throw new Error('Faltam as chaves do Supabase local. Rode pelo npm run test:seguranca.')
  return { url, anon, servico }
}
