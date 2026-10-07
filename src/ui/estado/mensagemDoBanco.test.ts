import sql011 from '../../../supabase/011-seguranca-lote-2.sql?raw'
import { COPIA_GRANDE_DEMAIS, FALHA_DE_REDE, LINK_GRANDE_DEMAIS, mensagemDoBanco, TRAVAS_DE_TAMANHO } from './mensagemDoBanco.ts'

/** A mensagem que o banco manda quando uma trava (check) recusa a linha. */
const recusaDaTrava = (tabela: string, trava: string) => ({ code: '23514', message: `new row for relation "${tabela}" violates check constraint "${trava}"` })

describe('mensagemDoBanco (D-98)', () => {
  it('sem erro, sem mensagem', () => {
    expect(mensagemDoBanco(null)).toBeNull()
  })

  it('a frase que o próprio banco escreve passa como veio', () => {
    expect(mensagemDoBanco({ code: 'P0001', message: 'Você já tem um comprovante em análise.' })).toBe('Você já tem um comprovante em análise.')
    expect(mensagemDoBanco({ code: '42501', message: 'Entre na sua conta.' })).toBe('Entre na sua conta.')
  })

  it('CA-422: o limite de links do plano chega com a frase da tela', () => {
    expect(mensagemDoBanco({ code: 'P0001', message: 'Você chegou ao limite de links do seu plano.' })).toBe('Você chegou ao limite de links do seu plano.')
  })

  it('CA-430: a recusa do RLS e a falta de permissão do Postgres não aparecem cruas', () => {
    expect(mensagemDoBanco({ code: '42501', message: 'new row violates row-level security policy for table "copias"' })).toBe(FALHA_DE_REDE)
    expect(mensagemDoBanco({ code: '42501', message: 'permission denied for table acompanhamentos' })).toBe(FALHA_DE_REDE)
    expect(mensagemDoBanco({ code: '42501', message: 'permission denied for function marcar_missoes' })).toBe(FALHA_DE_REDE)
  })

  it('CA-430: outros códigos e erro sem código viram a mensagem de falha', () => {
    expect(mensagemDoBanco({ code: '23514', message: 'new row for relation "acompanhamentos" violates check constraint "acompanhamentos_token_formato"' })).toBe(
      FALHA_DE_REDE,
    )
    expect(mensagemDoBanco({ code: 'PGRST301', message: 'JWT expired' })).toBe(FALHA_DE_REDE)
    expect(mensagemDoBanco({ message: 'Failed to fetch' })).toBe(FALHA_DE_REDE)
  })
})

describe('as travas de tamanho (D-107)', () => {
  it('CA-445: a cópia acima de 5 MB chega com a frase da cópia', () => {
    expect(mensagemDoBanco(recusaDaTrava('copias', 'copias_dados_tamanho'))).toBe(COPIA_GRANDE_DEMAIS)
    expect(COPIA_GRANDE_DEMAIS).toBe('A cópia passou de 5 MB, o máximo da nuvem. Seus dados continuam neste aparelho.')
  })

  it('CA-446: cada trava de tamanho do link chega com a frase do link', () => {
    for (const trava of ['acompanhamentos_missoes_tamanho', 'acompanhamentos_marcacoes_tamanho', 'acompanhamentos_nome_tamanho', 'acompanhamentos_caso_id_tamanho', 'acompanhamentos_paciente_id_tamanho']) {
      expect(mensagemDoBanco(recusaDaTrava('acompanhamentos', trava)), trava).toBe(LINK_GRANDE_DEMAIS)
    }
    expect(LINK_GRANDE_DEMAIS).toBe('Este link ficou grande demais. Tire algumas missões e tente de novo.')
  })

  it('o nome da trava vale em qualquer idioma do banco (vem entre aspas)', () => {
    expect(mensagemDoBanco({ code: '23514', message: 'novo registro da relação "copias" viola restrição de verificação "copias_dados_tamanho"' })).toBe(COPIA_GRANDE_DEMAIS)
  })

  it('o nome de uma trava fora do código 23514 não é traduzido', () => {
    expect(mensagemDoBanco({ code: '42501', message: 'permission denied "copias_dados_tamanho"' })).toBe(FALHA_DE_REDE)
  })

  it('as travas que a tela conhece são exatamente as do 011', () => {
    const doBanco = [...sql011.matchAll(/add constraint (\w+_tamanho) check/g)].map((m) => m[1] ?? '').sort()
    expect(Object.keys(TRAVAS_DE_TAMANHO).sort()).toEqual(doBanco)
  })
})
