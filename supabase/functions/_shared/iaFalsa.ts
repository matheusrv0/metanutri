// O modelo falso (spec assistente-ia, D-1325, CA-2321): com `IA_MODO=falso` e o Supabase local, a função responde uma
// sugestão pronta, montada das listas padrão por tipo de refeição (as de src/domain/sugestoes.ts, revistas por
// nutricionista), sem os ids de `naoUsar`, sem chamar a API e sem custo. Serve para usar o app inteiro com o servidor
// local. Puro: sem Deno e sem rede.
import type { ModeloDaIa } from './iaPortas.ts'

type Tipo = 'desjejum' | 'lanche' | 'almoco' | 'jantar' | 'ceia'

/** As listas padrão de src/domain/sugestoes.ts: [id, gramas], na ordem; o teste confere que estão no catálogo. */
export const LISTAS_DO_FALSO: Readonly<Record<Tipo, readonly (readonly [number, number])[]>> = {
  desjejum: [[533, 135], [488, 45], [53, 50], [226, 170], [471, 50]],
  lanche: [[182, 75], [222, 150], [226, 170], [448, 200], [7, 15], [461, 45]],
  almoco: [[3, 100], [561, 140], [410, 100], [377, 100], [78, 30], [157, 80]],
  jantar: [[533, 135], [488, 45], [410, 100], [3, 100], [561, 140], [88, 70]],
  ceia: [[448, 200], [182, 75], [226, 170], [7, 15]],
}

const semAcento = (s: string): string => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** O tipo pelo nome e, sem ele, pelo horário (a mesma regra de src/domain/sugestoes.ts). */
export function tipoDaRefeicaoFalsa(nome: string, horario: string): Tipo {
  const texto = semAcento(nome)
  if (/desjejum|cafe da manha/.test(texto)) return 'desjejum'
  if (/lanche|colacao/.test(texto)) return 'lanche'
  if (/almoco/.test(texto)) return 'almoco'
  if (/janta/.test(texto)) return 'jantar'
  if (/ceia/.test(texto)) return 'ceia'
  const [h, m] = horario.split(':').map(Number)
  const minutos = (h ?? 12) * 60 + (m ?? 0)
  if (minutos < 4 * 60) return 'ceia'
  if (minutos < 9 * 60) return 'desjejum'
  if (minutos < 11 * 60) return 'lanche'
  if (minutos < 15 * 60) return 'almoco'
  if (minutos < 18 * 60) return 'lanche'
  if (minutos < 21 * 60) return 'jantar'
  return 'ceia'
}

const HOSTS_LOCAIS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]', 'kong', 'host.docker.internal'])

/** CA-2321: o modo falso só vale com o Supabase local; com outro endereço, é ignorado (e quem chama anota). */
export function modoFalso(iaModo: string | undefined, urlSupabase: string): { readonly ligado: boolean; readonly ignorado: boolean } {
  if (iaModo?.trim() !== 'falso') return { ligado: false, ignorado: false }
  const local = ((): boolean => {
    try {
      return HOSTS_LOCAIS.has(new URL(urlSupabase).hostname)
    } catch {
      return false
    }
  })()
  return { ligado: local, ignorado: !local }
}

/** A resposta pronta: em cada refeição, até 4 itens da lista do tipo que não estão em `naoUsar`, e os 2 seguintes na opção 2. */
export function criarModeloFalso(): ModeloDaIa {
  return async (chamada) => {
    const proibidos = new Set(chamada.naoUsar)
    const refeicoes =
      chamada.modo === 'gerar'
        ? chamada.refeicoes.map((r, refeicao) => {
            const lista = LISTAS_DO_FALSO[tipoDaRefeicaoFalsa(r.nome, r.horario)].filter(([id]) => !proibidos.has(id))
            const item = ([alimentoId, gramas]: readonly [number, number]) => ({ alimentoId, gramas })
            return { refeicao, principal: lista.slice(0, 4).map(item), opcao2: lista.slice(4, 6).map(item) }
          })
        : []
    const texto = JSON.stringify({ refeicoes, mudancas: [], pontosAConfirmar: ['Sugestão do modo falso, para testes.'] })
    return { tipo: 'ok', texto, modelo: 'falso', tokens: [{ modelo: 'falso', entrada: 0, cacheGravados: 0, cacheLidos: 0, saida: 0 }] }
  }
}
