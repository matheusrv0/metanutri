// A pilha do Supabase local dos testes de ataque (spec seguranca-lote-4, D-136): nome e portas.
//
// Sem variável nenhuma, é a de sempre: "metanutri-ataques", portas 55420 a 55422, em testes/supabase-local.
// Com ATAQUE_PROJETO e ATAQUE_PORTA_BASE, é uma pilha própria, com outro nome e outras três portas, numa cópia
// temporária da configuração em testes/pilhas-temporarias/<nome> (fora do commit). Assim duas rodadas ao mesmo
// tempo não derrubam uma à outra. Quem cria e apaga a cópia é scripts/testes-de-ataque.mjs.
//
// Puro: sem Docker, sem rede e sem disco. Testado em src/seguranca/pilhaDeAtaque.test.ts.

const PASTA_PADRAO = 'testes/supabase-local'
const PASTA_DAS_PROPRIAS = 'testes/pilhas-temporarias'
/** O nome vira pasta e nome de contêiner (supabase_db_<nome>): só letra minúscula, número e hífen. */
const NOME_VALIDO = /^[a-z0-9][a-z0-9-]{0,39}$/
/** Três portas seguidas: a do banco de sombra, a da API (base + 1) e a do banco (base + 2). */
const PORTAS_POR_PILHA = 3

const pilha = (projeto, portaBase, propria) => ({
  projeto,
  portaBase,
  propria,
  pasta: propria ? `${PASTA_DAS_PROPRIAS}/${projeto}` : PASTA_PADRAO,
  conteinerDoBanco: `supabase_db_${projeto}`,
})

export const PILHA_PADRAO = Object.freeze(pilha('metanutri-ataques', 55420, false))

/** A pilha pedida pelo ambiente; lança com o que está errado, antes de subir qualquer coisa. */
export function pilhaDoAmbiente(env) {
  const projeto = env.ATAQUE_PROJETO ?? ''
  const porta = env.ATAQUE_PORTA_BASE ?? ''
  if (projeto === '' && porta === '') return PILHA_PADRAO
  if (projeto === '' || porta === '') {
    throw new Error('Para uma pilha própria, defina as duas variáveis: ATAQUE_PROJETO (o nome) e ATAQUE_PORTA_BASE (a primeira das três portas).')
  }
  if (!NOME_VALIDO.test(projeto)) {
    throw new Error(`ATAQUE_PROJETO="${projeto}" não serve: use só letras minúsculas, números e hífen (até 40), como "ataques-b".`)
  }
  if (!/^\d+$/.test(porta) || Number(porta) < 1024 || Number(porta) > 65535 - (PORTAS_POR_PILHA - 1)) {
    throw new Error(`ATAQUE_PORTA_BASE="${porta}" não serve: use um número de 1024 a ${65535 - (PORTAS_POR_PILHA - 1)}, como 55520.`)
  }
  const portaBase = Number(porta)
  if (projeto === PILHA_PADRAO.projeto || Math.abs(portaBase - PILHA_PADRAO.portaBase) < PORTAS_POR_PILHA) {
    throw new Error(
      `A pilha própria precisa de nome e portas diferentes do padrão (${PILHA_PADRAO.projeto}, ${PILHA_PADRAO.portaBase} a ${PILHA_PADRAO.portaBase + PORTAS_POR_PILHA - 1}).`,
    )
  }
  return pilha(projeto, portaBase, true)
}

/** Troca uma linha que tem de existir uma vez só; se a configuração mudou e ela sumiu, para. */
function trocar(texto, linha, nova) {
  const partes = texto.split(`\n${linha}\n`)
  if (partes.length !== 2) throw new Error(`A configuração dos testes de ataque mudou: esperava a linha "${linha}" uma vez.`)
  return partes.join(`\n${nova}\n`)
}

/** A configuração da pilha, a partir da de testes/supabase-local: só o nome e as portas mudam. */
export function configDaPilha(textoOriginal, alvo) {
  if (!alvo.propria) return textoOriginal
  const p = PILHA_PADRAO
  let texto = trocar(textoOriginal, `project_id = "${p.projeto}"`, `project_id = "${alvo.projeto}"`)
  texto = trocar(texto, `shadow_port = ${p.portaBase}`, `shadow_port = ${alvo.portaBase}`)
  texto = trocar(texto, `port = ${p.portaBase + 1}`, `port = ${alvo.portaBase + 1}`)
  texto = trocar(texto, `port = ${p.portaBase + 2}`, `port = ${alvo.portaBase + 2}`)
  // Uma porta do padrão que sobrou (um serviço ligado depois, por exemplo) brigaria com a pilha de sempre.
  const sobrou = texto.match(/\b5542\d\b/)
  if (sobrou) throw new Error(`A configuração dos testes de ataque tem a porta ${sobrou[0]}, do padrão, que a pilha própria não troca.`)
  return texto
}
