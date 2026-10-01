// Barra a publicação enquanto os Termos e a Política não têm responsável e contato
// (spec conta-e-verificacao, D-46). Roda no GitHub Actions antes do build.
import { readFileSync } from 'node:fs'

const legal = readFileSync('src/domain/legal.ts', 'utf8')
const faltando = ['RESPONSAVEL', 'CONTATO_EMAIL'].filter((nome) => new RegExp(`export const ${nome}: string \\| null = null`).test(legal))

if (faltando.length > 0) {
  console.error(`Publicação barrada: ${faltando.join(' e ')} ainda sem valor em src/domain/legal.ts.`)
  console.error('A conta obrigatória recebe documento com dado pessoal: os Termos e a Política precisam estar no ar antes (LGPD).')
  process.exit(1)
}
console.log('Termos e Política com responsável e contato: pode publicar.')
