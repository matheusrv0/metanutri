// @vitest-environment node
// A rodada dos avisos (spec lado-do-paciente, D-1228 a D-1232, D-1236, D-1237): o que o agendamento manda em cada horário,
// com o banco e o Resend de mentira. Os dias são de novembro de 2026 (dia 1 é domingo); as horas, de Brasília.
import { beforeEach, describe, expect, it } from 'vitest'
import type { DependenciasComuns } from '../../supabase/functions/_shared/avisos/comum.ts'
import { instanteEmBrasilia } from '../../supabase/functions/_shared/avisos/regras.ts'
import { rodarAvisos, type Vez } from '../../supabase/functions/_shared/avisos/rodada.ts'
import { TETOS_PADRAO } from '../../supabase/functions/_shared/avisos/tetos.ts'
import type { MarcacaoDia } from '../../supabase/functions/_shared/adesao.ts'
import { acertarRelogio, ANA, bancoFalso, comLink, dependencias, envioAntigo, linkDe, resendFalso, type EstadoFalso, type ResendFalso } from './servidorAvisosFalsos.test-utils.ts'

const CHAVE = 'c'.repeat(64)
const dia = (n: number): string => `2026-11-${String(n).padStart(2, '0')}`
const as = (n: number, hora: number, minuto = 0): Date => instanteEmBrasilia(dia(n), hora, minuto)
const marcou = (...dias: number[]): MarcacaoDia[] => dias.map((n) => ({ dia: dia(n), feitas: ['agua'] }))

let estado: EstadoFalso
let resend: ResendFalso
let deps: DependenciasComuns

beforeEach(() => {
  const falso = bancoFalso({ chaveDaRodada: CHAVE })
  estado = falso.estado
  resend = resendFalso()
  deps = dependencias(falso.banco, resend)
})

const rodar = (vez: Vez, quando: Date, chave: string | null = CHAVE) => {
  acertarRelogio(quando)
  return rodarAvisos({ metodo: 'POST', chave, corpo: { vez } }, deps)
}
const enviados = () => resend.lotes.flatMap((l) => l.emails)
const tipos = () => enviados().map((e) => e.tipo)

describe('a chave do agendamento (CA-2270)', () => {
  it('CA-2270: sem a chave, ou com a errada, 401 e nada sai', async () => {
    await comLink(estado, { aceites: ['lembrete'], link: { marcacoes: marcou(1) } })
    expect((await rodar('tarde', as(4, 18), null)).status).toBe(401)
    expect((await rodar('tarde', as(4, 18), 'x'.repeat(64))).status).toBe(401)
    expect(resend.lotes).toHaveLength(0)
    expect(estado.envios).toHaveLength(0)
  })

  it('CA-2274: a rodada grava os tetos que leu, para o Painel do dono', async () => {
    deps = { ...deps, tetos: () => ({ ...TETOS_PADRAO, dia: 1500, mes: 45000 }) }
    await rodar('tarde', as(4, 18))
    expect(estado.tetosGravados).toMatchObject({ dia: 1500, mes: 45000 })
  })
})

describe('o lembrete às 18h (D-1228)', () => {
  it('CA-2244: última marcação no dia 1 e o link não aberto no dia 4: sai o A3, "faz 3 dias"', async () => {
    await comLink(estado, { aceites: ['lembrete'], aceitoEm: as(1, 9).toISOString(), link: { marcacoes: marcou(1), planoEm: as(1, 8).toISOString() } })
    expect((await rodar('tarde', as(4, 18))).corpo).toMatchObject({ enviados: 1 })
    const [a3] = enviados()
    expect(a3).toMatchObject({ tipo: 'A3', para: 'juliana.martins@gmail.com', assunto: 'Ainda dá tempo de marcar hoje', nomeDoRemetente: 'Ana Lima via MetaNutri' })
    expect(a3?.texto).toContain('Juliana, faz 3 dias que você não marca as missões do plano.')
    expect(a3?.cabecalhos?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
    expect(estado.envios[0]).toMatchObject({ tipo: 'A3', estado: 'enviado', dia: dia(4), extra: { dias: 3 } })
  })

  it('CA-2244: abriu o link no dia 4: o A3 não sai', async () => {
    await comLink(estado, { aceites: ['lembrete'], aceitoEm: as(1, 9).toISOString(), link: { marcacoes: marcou(1), planoEm: as(1, 8).toISOString(), ultimoAcesso: dia(4) } })
    await rodar('tarde', as(4, 18))
    expect(resend.lotes).toHaveLength(0)
  })

  it('CA-2245: depois do A3 do dia 4, o A4 sai no dia 8, e mais nada até marcar', async () => {
    const { emailHash } = await comLink(estado, { aceites: ['lembrete'], aceitoEm: as(1, 9).toISOString(), link: { marcacoes: marcou(1), planoEm: as(1, 8).toISOString() } })
    await rodar('tarde', as(4, 18))
    await rodar('tarde', as(5, 18))
    await rodar('tarde', as(8, 18))
    expect(tipos()).toEqual(['A3', 'A4'])
    expect(enviados()[1]?.texto).toContain('Este é o último lembrete até você marcar de novo.')
    await rodar('tarde', as(12, 18))
    expect(tipos()).toEqual(['A3', 'A4'])
    expect(emailHash).not.toBeNull()
  })

  it('CB-1209 e CA-2263: o interruptor desligado pela nutricionista depois do aceite: o lembrete não sai', async () => {
    await comLink(estado, { aceites: ['lembrete'], ofertas: { lembrete: false }, aceitoEm: as(1, 9).toISOString(), link: { marcacoes: marcou(1), planoEm: as(1, 8).toISOString() } })
    await rodar('tarde', as(4, 18))
    expect(resend.lotes).toHaveLength(0)
  })

  it('CA-2265 e D-1239: endereço na supressão (devolvido ou queixa): nenhum aviso', async () => {
    const { emailHash } = await comLink(estado, { aceites: ['lembrete'], aceitoEm: as(1, 9).toISOString(), link: { marcacoes: marcou(1), planoEm: as(1, 8).toISOString() } })
    if (emailHash) estado.supressao.set(emailHash, 'devolvido')
    await rodar('tarde', as(4, 18))
    expect(resend.lotes).toHaveLength(0)
  })

  it('CA-2254: quem parou todos os e-mails do plano não recebe aviso', async () => {
    await comLink(estado, { aceites: ['lembrete'], aceitoEm: as(1, 9).toISOString(), link: { marcacoes: marcou(1), planoEm: as(1, 8).toISOString() } })
    const linha = estado.emails.get('link-juliana')
    if (linha) estado.emails.set('link-juliana', { ...linha, parouTudoEm: as(2, 10).toISOString() })
    await rodar('tarde', as(4, 18))
    expect(resend.lotes).toHaveLength(0)
  })

  it('CB-1214: conta excluída (o link saiu): a rodada não acha o link e não envia', async () => {
    await comLink(estado, { aceites: ['lembrete'], aceitoEm: as(1, 9).toISOString(), link: { marcacoes: marcou(1), planoEm: as(1, 8).toISOString() } })
    estado.links.clear()
    await rodar('tarde', as(4, 18))
    expect(resend.lotes).toHaveLength(0)
  })

  it('CA-2257: o aceite de um endereço antigo não vale para o novo', async () => {
    await comLink(estado, { aceites: ['lembrete'], aceitoEm: as(1, 9).toISOString(), link: { marcacoes: marcou(1), planoEm: as(1, 8).toISOString() } })
    const linha = estado.emails.get('link-juliana')
    if (linha) estado.emails.set('link-juliana', { ...linha, email: 'nova@gmail.com', emailHash: 'e'.repeat(64) })
    await rodar('tarde', as(4, 18))
    expect(resend.lotes).toHaveLength(0)
  })
})

describe('o resumo da semana às 8h (D-1229)', () => {
  const comResumo = (marcacoes: MarcacaoDia[]) => comLink(estado, { aceites: ['semana'], aceitoEm: as(5, 9, 43).toISOString(), link: { marcacoes } })

  it('CA-2247: aceite numa quinta: o A2 sai na quinta seguinte às 8h, com os 7 dias de quinta a quarta', async () => {
    await comResumo(marcou(5, 6, 8, 9, 10))
    estado.aceites = estado.aceites.map((a) => ({ ...a, diaDaSemana: 4 }))
    await rodar('manha', as(11, 8))
    expect(resend.lotes).toHaveLength(0)
    await rodar('manha', as(12, 8))
    const [a2] = enviados()
    expect(a2).toMatchObject({ tipo: 'A2', assunto: 'Sua semana: 5 de 7 dias' })
    expect(a2?.texto).toContain('qui 1/4 · sex 1/4 · sáb – · dom 1/4 · seg 1/4 · ter 1/4 · qua –')
    expect(a2?.texto).toContain('Resumo da semana que você pediu, toda quinta.')
  })

  it('CA-2248: depois de 3 resumos com zero dia, o quarto não sai e o aceite fica "pausado"; marcou, volta', async () => {
    const { emailHash } = await comResumo([])
    estado.aceites = estado.aceites.map((a) => ({ ...a, diaDaSemana: 4 }))
    for (const n of [12, 19, 26]) estado.envios.push(envioAntigo({ tipo: 'A2', emailHash: emailHash ?? '', dia: dia(n), extra: { dias: 0 }, criadoEm: as(n, 8).toISOString() }))
    await rodar('manha', instanteEmBrasilia('2026-12-03', 8))
    expect(resend.lotes).toHaveLength(0)
    expect(estado.aceites[0]?.pausadoEm).toBe(instanteEmBrasilia('2026-12-03', 8).toISOString())
    const link = estado.links.get('link-juliana')
    if (link) estado.links.set(link.id, { ...link, marcacoes: [{ dia: '2026-12-05', feitas: ['agua'] }] })
    await rodar('manha', instanteEmBrasilia('2026-12-10', 8))
    expect(tipos()).toEqual(['A2'])
    expect(estado.aceites[0]?.pausadoEm).toBeNull()
  })

  it('CA-2250: o A2 e o A3 no mesmo dia: só o de maior prioridade (o lembrete); o resumo vai no dia seguinte', async () => {
    await comLink(estado, { aceites: ['semana', 'lembrete'], aceitoEm: as(1, 9).toISOString(), link: { marcacoes: marcou(2), planoEm: as(1, 8).toISOString() } })
    estado.aceites = estado.aceites.map((a) => ({ ...a, diaDaSemana: 5 }))
    // Sexta, dia 6: o resumo (dia do aceite) e o terceiro dia sem marcar.
    await rodar('manha', as(6, 8))
    expect(resend.lotes).toHaveLength(0)
    expect(estado.envios.map((e) => [e.tipo, e.estado])).toEqual([['A2', 'adiado']])
    await rodar('tarde', as(6, 18))
    expect(tipos()).toEqual(['A3'])
    await rodar('manha', as(7, 8))
    expect(tipos()).toEqual(['A3', 'A2'])
  })

  it('CA-2250: com 3 avisos na semana para o endereço, o quarto não sai', async () => {
    const { emailHash } = await comResumo(marcou(10))
    estado.aceites = estado.aceites.map((a) => ({ ...a, diaDaSemana: 4 }))
    for (const n of [7, 9, 10]) estado.envios.push(envioAntigo({ tipo: 'A1', emailHash: emailHash ?? '', dia: dia(n), criadoEm: as(n, 10).toISOString() }))
    await rodar('manha', as(12, 8))
    expect(resend.lotes).toHaveLength(0)
    expect(estado.envios.find((e) => e.tipo === 'A2')?.estado).toBe('adiado')
  })

  it('CB-1210: o casal com um e-mail na mesma conta: um aviso por dia vale por link', async () => {
    await comResumo(marcou(10))
    await comLink(estado, { link: { id: 'link-marido', token: 'marido123456', marcacoes: marcou(10) }, aceites: ['semana'], aceitoEm: as(5, 9, 43).toISOString() })
    estado.aceites = estado.aceites.map((a) => ({ ...a, diaDaSemana: 4 }))
    await rodar('manha', as(12, 8))
    expect(tipos()).toEqual(['A2', 'A2'])
  })
})

describe('o plano atualizado (D-1230)', () => {
  const comA1 = async (a1Para: Date) => {
    await comLink(estado, { aceites: ['plano'], link: { a1Para: a1Para.toISOString(), planoEm: as(3, 10, 15).toISOString() } })
  }

  it('CA-2249 e CB-1208: o A1 vencido sai na rodada das 15 em 15 minutos, e sai do agendamento', async () => {
    await comA1(as(3, 10, 45))
    await rodar('a1', as(3, 10, 30))
    expect(resend.lotes).toHaveLength(0)
    await rodar('a1', as(3, 10, 45))
    expect(tipos()).toEqual(['A1'])
    expect(enviados()[0]?.texto).toContain('Juliana, Ana Lima atualizou o seu plano.')
    expect(estado.links.get('link-juliana')?.a1Para).toBeNull()
  })

  it('CA-2249: o S2 no mesmo dia cancela o A1', async () => {
    const { emailHash } = await comLink(estado, { aceites: ['plano'], link: { a1Para: as(3, 10, 45).toISOString() } })
    estado.envios.push(envioAntigo({ tipo: 'S2', emailHash: emailHash ?? '', dia: dia(3), criadoEm: as(3, 10).toISOString() }))
    await rodar('a1', as(3, 11))
    expect(resend.lotes).toHaveLength(0)
    expect(estado.links.get('link-juliana')?.a1Para).toBeNull()
  })

  it('CA-2249: atualização às 22h: o A1 sai às 8h', async () => {
    await comA1(as(4, 8))
    await rodar('manha', as(4, 8))
    expect(tipos()).toEqual(['A1'])
  })

  it('CB-1209: o paciente saiu do aviso depois do agendamento: o A1 não sai e sai do agendamento', async () => {
    await comA1(as(3, 10, 45))
    estado.aceites = estado.aceites.map((a) => ({ ...a, saiuEm: as(3, 10, 40).toISOString() }))
    await rodar('a1', as(3, 11))
    expect(resend.lotes).toHaveLength(0)
    expect(estado.links.get('link-juliana')?.a1Para).toBeNull()
  })

  it('CA-2251: fora da janela (21h), nenhum aviso ao paciente sai', async () => {
    await comA1(as(3, 20, 55))
    await rodar('a1', as(3, 21, 0))
    expect(resend.lotes).toHaveLength(0)
    expect(estado.links.get('link-juliana')?.a1Para).not.toBeNull()
  })
})

describe('os tetos, o lote e a repetição (D-1237)', () => {
  /** N pacientes com o lembrete vencido hoje, cada um com o seu e-mail. */
  async function muitos(n: number) {
    for (let i = 0; i < n; i++) {
      await comLink(estado, {
        link: linkDe({ id: `link-${i}`, token: `token${String(i).padStart(7, '0')}`, marcacoes: marcou(1), planoEm: as(1, 8).toISOString() }),
        email: `paciente${i}@gmail.com`,
        aceites: ['lembrete'],
        aceitoEm: as(1, 9).toISOString(),
      })
    }
  }

  it('CA-2272: com 45 avisos no dia, os avisos param; os lembretes que não couberam não ficam para depois', async () => {
    await muitos(50)
    expect((await rodar('tarde', as(4, 18))).corpo).toEqual({ enviados: 45, adiados: 0, pulados: 5 })
    expect(enviados()).toHaveLength(45)
  })

  it('CA-2271: com 70 no dia (do Resend), nada mais sai', async () => {
    await muitos(3)
    for (let i = 0; i < 70; i++) estado.envios.push(envioAntigo({ tipo: 'S2', emailHash: `${i}`.padStart(64, '0'), dia: dia(4), criadoEm: as(4, 10).toISOString(), linkId: null }))
    expect((await rodar('tarde', as(4, 18))).corpo).toMatchObject({ enviados: 0, pulados: 3 })
  })

  it('CA-2273: com 1.900 no mês, os avisos param até o mês virar', async () => {
    await muitos(2)
    deps = { ...deps, tetos: () => ({ ...TETOS_PADRAO, avisosMes: 0 }) }
    expect((await rodar('tarde', as(4, 18))).corpo).toMatchObject({ enviados: 0 })
  })

  it('CA-2275: um 429 no meio: os que saíram ficam; os outros, adiados (o lembrete, descartado), sem repetir', async () => {
    await muitos(3)
    let n = 0
    deps = { ...deps, enviar: async (emails) => emails.map(() => (n++ < 2 ? { ok: true as const, id: `re_${n}` } : { ok: false as const, motivo: 'limite' as const })) }
    expect((await rodar('tarde', as(4, 18))).corpo).toMatchObject({ enviados: 2 })
    expect(estado.envios.filter((e) => e.estado === 'enviado')).toHaveLength(2)
    // O lembrete que não saiu não fica gravado: amanhã a regra roda de novo.
    expect(estado.envios).toHaveLength(2)
  })

  it('CA-2276: a mesma chamada repetida não manda o mesmo aviso duas vezes', async () => {
    await muitos(3)
    await rodar('tarde', as(4, 18))
    await rodar('tarde', as(4, 18, 1))
    expect(enviados()).toHaveLength(3)
    expect(new Set(estado.envios.map((e) => e.chaveUnica)).size).toBe(3)
  })

  it('CB-1216: Resend fora do ar: o A1 fica adiado e vai na próxima rodada', async () => {
    await comLink(estado, { aceites: ['plano'], link: { a1Para: as(3, 10, 45).toISOString() } })
    resend.modo = 'fora'
    await rodar('a1', as(3, 11))
    expect(estado.envios.map((e) => e.estado)).toEqual(['adiado'])
    expect(estado.links.get('link-juliana')?.a1Para).not.toBeNull()
    resend.modo = 'ok'
    await rodar('a1', as(3, 11, 15))
    expect(estado.envios.map((e) => e.estado)).toEqual(['enviado'])
  })

  it('CA-2278: com os avisos pausados, nada sai ao paciente, e o envio fica "Não saiu: pausado"', async () => {
    await muitos(1)
    estado.estado = { pausadoEm: as(2, 10).toISOString(), motivo: 'devolução 2,4%' }
    await rodar('tarde', as(4, 18))
    expect(resend.lotes).toHaveLength(0)
    expect(estado.envios.map((e) => e.estado)).toEqual(['pausado'])
  })
})

describe('o resumo da adesão às segundas (D-1231)', () => {
  /** A conta de Ana com 4 pacientes: em dia, atenção, parou e não começou, na segunda 9/11. */
  function comPacientes() {
    const base = { criadoEm: as(1, 9).toISOString() }
    estado.links.set('a', linkDe({ ...base, id: 'a', token: 'aaaaaaaaaaaa', nome: 'Amanda Costa', marcacoes: marcou(3, 4, 5, 6, 8) }))
    estado.links.set('b', linkDe({ ...base, id: 'b', token: 'bbbbbbbbbbbb', nome: 'Bruno Dias', marcacoes: marcou(7) }))
    estado.links.set('c', linkDe({ ...base, id: 'c', token: 'cccccccccccc', nome: 'Carlos Souza, 52 anos', marcacoes: marcou(1) }))
    estado.links.set('d', linkDe({ id: 'd', token: 'dddddddddddd', nome: 'Diana Reis', criadoEm: as(8, 9).toISOString(), marcacoes: [] }))
  }

  it('CA-2267: segunda 7h: o N1 com os quatro números e quem parou, só com o primeiro nome e a inicial', async () => {
    comPacientes()
    await rodar('n1', as(9, 7))
    const [n1] = enviados()
    expect(n1).toMatchObject({ tipo: 'N1', para: 'ana.conta@gmail.com', nomeDoRemetente: 'MetaNutri', assunto: 'Adesão da semana: 1 parou de marcar' })
    expect(n1?.texto).toContain('1 em dia · 1 em atenção · 1 pararam de marcar · 1 não começaram')
    expect(n1?.texto).toContain('Carlos S. · 8 dias')
    expect(n1?.texto).toContain('Semana de 2 a 8 de novembro.')
    expect(n1?.cabecalhos?.['List-Unsubscribe']).toMatch(/avisos-resposta\?c=/)
  })

  it('CA-2268: o N1 não leva sobrenome inteiro nem e-mail de paciente', async () => {
    comPacientes()
    await comLink(estado, { link: { id: 'c', token: 'cccccccccccc', nome: 'Carlos Souza, 52 anos', marcacoes: marcou(1), criadoEm: as(1, 9).toISOString() }, email: 'carlos.souza@outlook.com' })
    await rodar('n1', as(9, 7))
    const [n1] = enviados()
    for (const vazado of ['Souza', 'carlos.souza@outlook.com', '52 anos']) expect(n1?.html).not.toContain(vazado)
  })

  it('CA-2267: com o resumo desligado, ou sem pacientes em acompanhamento, nada sai', async () => {
    comPacientes()
    estado.nutris.set(ANA.id, { ...ANA, resumoDaAdesao: false })
    await rodar('n1', as(9, 7))
    expect(resend.lotes).toHaveLength(0)
    estado.nutris.set(ANA.id, ANA)
    estado.links.clear()
    await rodar('n1', as(9, 7))
    expect(resend.lotes).toHaveLength(0)
  })

  it('D-1237: o N1 adiado pelo teto às 7h sai às 8h da segunda; o que saiu não sai de novo', async () => {
    comPacientes()
    deps = { ...deps, tetos: () => ({ ...TETOS_PADRAO, dia: 0 }) }
    await rodar('n1', as(9, 7))
    expect(estado.envios.map((e) => [e.tipo, e.estado])).toEqual([['N1', 'adiado']])
    deps = { ...deps, tetos: () => TETOS_PADRAO }
    await rodar('manha', as(9, 8))
    await rodar('manha', as(9, 8, 1))
    expect(tipos()).toEqual(['N1'])
  })
})
