// O código de 6 dígitos de um app autenticador (TOTP, RFC 6238), calculado nos testes de banco para o
// administrador de teste confirmar o segundo fator (spec seguranca-lote-5, D-260). Puro, com a Web Crypto do
// Node: sem pacote novo. Conferido em src/seguranca/totp.test.ts com os vetores da RFC.

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** A chave em base32 (como o Supabase entrega), em bytes. Espaços e o `=` do fim não contam. */
export function deBase32(texto: string): Uint8Array<ArrayBuffer> {
  const limpo = texto.toUpperCase().replace(/[\s=]/g, '')
  const bytes: number[] = []
  let acumulado = 0
  let bits = 0
  for (const letra of limpo) {
    const valor = ALFABETO.indexOf(letra)
    if (valor < 0) throw new Error(`Chave do app fora do base32: "${letra}"`)
    acumulado = (acumulado << 5) | valor
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((acumulado >>> bits) & 0xff)
    }
  }
  return new Uint8Array(bytes)
}

/** O código do app no instante `quandoMs`, com janelas de 30 segundos e HMAC-SHA1, como o Supabase confere. */
export async function codigoDoApp(chaveBase32: string, quandoMs: number, digitos = 6): Promise<string> {
  const janela = Math.floor(quandoMs / 1000 / 30)
  const contador = new Uint8Array(8)
  new DataView(contador.buffer).setBigUint64(0, BigInt(janela))
  const chave = await crypto.subtle.importKey('raw', deBase32(chaveBase32), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const assinatura = new Uint8Array(await crypto.subtle.sign('HMAC', chave, contador))
  const deslocamento = (assinatura[assinatura.length - 1] ?? 0) & 0x0f
  const trecho = new DataView(assinatura.buffer).getUint32(deslocamento) & 0x7fffffff
  return String(trecho % 10 ** digitos).padStart(digitos, '0')
}
