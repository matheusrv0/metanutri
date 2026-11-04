// O rascunho da importação (spec importar-pacientes, D-914 e DP-IP-23): a planilha lida, o mapeamento, as correções e
// as marcas ficam só na memória da aba, numa tabela cuja chave é o armazenamento da conta que entrou. Assim:
// - a tela que remonta quando a nuvem traz mudança (DP-18 da dados-na-nuvem) ou depois da trava sem internet (CB-914)
//   continua do mesmo jeito;
// - a sessão que termina troca o armazenamento, e o rascunho da anterior não aparece mais (CB-915);
// - a aba fechada leva tudo junto (CB-916). Nada vai para o `localStorage`, a nuvem ou o console.
import type { EstadoDaImportacao } from './estadoDaImportacao.ts'

const rascunhos = new WeakMap<object, EstadoDaImportacao>()
/** Sem armazenamento (o navegador bloqueado, CB-121), uma chave só desta página. */
const SEM_ARMAZENAMENTO = {}

const chave = (dono: object | null): object => dono ?? SEM_ARMAZENAMENTO

export function lerRascunho(dono: object | null): EstadoDaImportacao | null {
  return rascunhos.get(chave(dono)) ?? null
}

export function guardarRascunho(dono: object | null, estado: EstadoDaImportacao): void {
  rascunhos.set(chave(dono), estado)
}

export function esquecerRascunho(dono: object | null): void {
  rascunhos.delete(chave(dono))
}
