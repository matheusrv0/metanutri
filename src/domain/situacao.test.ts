import {
  crnDe,
  daLinhaPerfil,
  diasParaCorrigir,
  exportacaoBloqueada,
  formatarCrn,
  SITUACAO_VAZIA,
  validarCrn,
  validarSituacao,
  type PerfilConta,
} from './situacao.ts'

const nutri: PerfilConta = {
  nome: 'Ana',
  situacao: 'nutricionista',
  crn: { regiao: 6, numero: '12345' },
  statusCrn: 'nao_encontrado',
  crnDeclaradoEm: '2026-09-30T12:00:00Z',
  crnDecididoEm: '2026-10-01T12:00:00Z',
}

describe('CRN', () => {
  it('CA-264: região de 1 a 11 e número só com algarismos, com P final opcional', () => {
    expect(validarCrn(6, '12345')).toBeNull()
    expect(validarCrn(6, ' 9876p ')).toBeNull()
    expect(validarCrn(null, '12345')).toBe('crn-regiao')
    expect(validarCrn(12, '12345')).toBe('crn-regiao')
    expect(validarCrn(6, '')).toBe('crn-numero')
    expect(validarCrn(6, '12a45')).toBe('crn-numero')
    expect(validarCrn(6, '12345678')).toBe('crn-numero')
  })

  it('formata como o conselho escreve', () => {
    expect(formatarCrn({ regiao: 6, numero: '9876P' })).toBe('CRN-6 9876P')
  })
})

describe('validarSituacao', () => {
  const base = { ...SITUACAO_VAZIA }

  it('CA-268: sem escolher, não segue', () => {
    expect(validarSituacao(base, 'a@b.com')).toBe('situacao-vazia')
  })

  it('CA-263: nutricionista precisa de CRN válido e da declaração', () => {
    expect(validarSituacao({ ...base, situacao: 'nutricionista', regiao: 6, numero: '1' }, 'a@b.com')).toBe('declaracao-crn')
    expect(validarSituacao({ ...base, situacao: 'nutricionista', regiao: null, numero: '1', declarouCrn: true }, 'a@b.com')).toBe('crn-regiao')
    expect(validarSituacao({ ...base, situacao: 'nutricionista', regiao: 6, numero: '1', declarouCrn: true }, 'a@b.com')).toBeNull()
  })

  it('CA-265 e CA-266: estudante precisa do e-mail da faculdade e da declaração', () => {
    expect(validarSituacao({ ...base, situacao: 'estudante', declarouMatricula: true }, 'maria@gmail.com')).toBe('email-faculdade')
    expect(validarSituacao({ ...base, situacao: 'estudante' }, 'maria@ufrn.edu.br')).toBe('declaracao-matricula')
    expect(validarSituacao({ ...base, situacao: 'estudante', declarouMatricula: true }, ' Maria@UFRN.edu.br ')).toBeNull()
  })

  it('crnDe devolve o CRN normalizado só para nutricionista', () => {
    expect(crnDe({ ...base, situacao: 'nutricionista', regiao: 6, numero: ' 9876p ', declarouCrn: true })).toEqual({ regiao: 6, numero: '9876P' })
    expect(crnDe({ ...base, situacao: 'estudante', regiao: 6, numero: '1' })).toBeNull()
  })
})

describe('daLinhaPerfil', () => {
  it('lê a linha do banco e recusa o que não reconhece', () => {
    expect(
      daLinhaPerfil({
        nome: 'Ana',
        situacao: 'nutricionista',
        crn_regiao: 6,
        crn_numero: '12345',
        crn_status: 'em_conferencia',
        crn_declarado_em: '2026-09-30T12:00:00Z',
        crn_decidido_em: null,
      }),
    ).toEqual({ ...nutri, statusCrn: 'em_conferencia', crnDecididoEm: null })
    expect(daLinhaPerfil({ nome: 'Júlia', situacao: 'estudante' })).toEqual({
      nome: 'Júlia',
      situacao: 'estudante',
      crn: null,
      statusCrn: null,
      crnDeclaradoEm: null,
      crnDecididoEm: null,
    })
    expect(daLinhaPerfil(null)).toBeNull()
    expect(daLinhaPerfil({ situacao: 'admin' })).toBeNull()
  })
})

describe('prazo do CRN não encontrado (CA-289 e CA-290)', () => {
  it('conta os dias que faltam e bloqueia depois de 7', () => {
    expect(diasParaCorrigir(nutri, new Date('2026-10-03T12:00:00Z'))).toBe(5)
    expect(exportacaoBloqueada(nutri, new Date('2026-10-03T12:00:00Z'))).toBe(false)
    expect(diasParaCorrigir(nutri, new Date('2026-10-09T12:00:00Z'))).toBe(0)
    expect(exportacaoBloqueada(nutri, new Date('2026-10-09T12:00:00Z'))).toBe(true)
  })

  it('não bloqueia quem está em conferência, conferido ou é estudante', () => {
    const agora = new Date('2027-01-01T00:00:00Z')
    expect(exportacaoBloqueada({ ...nutri, statusCrn: 'em_conferencia', crnDecididoEm: null }, agora)).toBe(false)
    expect(exportacaoBloqueada({ ...nutri, statusCrn: 'conferido' }, agora)).toBe(false)
    expect(exportacaoBloqueada(null, agora)).toBe(false)
    expect(diasParaCorrigir({ ...nutri, statusCrn: 'conferido' }, agora)).toBeNull()
  })
})
