// A leitura dos valores (spec importar-pacientes, D-907, D-908): CA-1918 a CA-1921, CB-906 a CB-909, CB-919, CB-920.
import { arrumarNome, lerData, lerSexo, lerTelefone, ordemDasDatas } from './valores.ts'

const HOJE = '2026-10-29'
const iso = (texto: string, ordem: 'dm' | 'md' = 'dm') => {
  const lida = lerData(texto, HOJE, ordem)
  return lida.tipo === 'ok' ? lida.iso : lida.tipo
}

describe('CA-1918: sexo', () => {
  it.each(['F', 'f', 'fem.', 'FEM', 'Feminino', 'feminino', 'mulher', 'MULHER', 'female', 'Female', ' F '])('"%s" é F', (texto) => {
    expect(lerSexo(texto)).toEqual({ tipo: 'ok', sexo: 'F' })
  })

  it.each(['M', 'm', 'masc.', 'MASC', 'Masculino', 'masculino', 'homem', 'HOMEM', 'male', 'Male'])('"%s" é M', (texto) => {
    expect(lerSexo(texto)).toEqual({ tipo: 'ok', sexo: 'M' })
  })

  it('vazio (ou só espaços) é "Sexo vazio"', () => {
    expect(lerSexo('')).toEqual({ tipo: 'vazio' })
    expect(lerSexo('   ')).toEqual({ tipo: 'vazio' })
  })

  it.each(['Outro', 'Não binário', 'Prefiro não dizer', 'x', 'FM'])('CB-919: "%s" é "Sexo não reconhecido"', (texto) => {
    expect(lerSexo(texto)).toEqual({ tipo: 'nao-reconhecido' })
  })
})

describe('CA-1919: cada formato de data do D-907', () => {
  it.each([
    ['14/03/1991', '1991-03-14'],
    ['4/3/1991', '1991-03-04'],
    ['14-03-1991', '1991-03-14'],
    ['14.03.1991', '1991-03-14'],
    ['1991-03-14', '1991-03-14'],
    ['1991-3-4', '1991-03-04'],
    ['14/03/1991 00:00', '1991-03-14'],
    ['14/03/1991 10:22:05', '1991-03-14'],
    ['1991-03-14T00:00:00', '1991-03-14'],
    ['1991-03-14 00:00:00', '1991-03-14'],
    ['33311', '1991-03-14'],
    ['33311,5', '1991-03-14'],
    [' 14/03/1991 ', '1991-03-14'],
  ])('"%s" é %s', (texto, esperado) => {
    expect(iso(texto)).toBe(esperado)
  })

  it.each(['31/02/1994', '29/02/2023', '00/01/1990', '12/13/1990', '30/10/2026', '01/01/2099', '28/10/1906', 'não sei', '1991', '14031991', '14/03', 'abc/de/fghi'])(
    '"%s" é "Data inválida"',
    (texto) => {
      expect(iso(texto)).toBe('invalida')
    },
  )

  it('vazia não é problema: a linha entra sem a data', () => {
    expect(iso('')).toBe('vazia')
    expect(iso('   ')).toBe('vazia')
  })

  it('hoje vale (o bebê que nasceu hoje), e 120 anos exatos também', () => {
    expect(iso('29/10/2026')).toBe('2026-10-29')
    expect(iso('29/10/1906')).toBe('1906-10-29')
  })

  it('29 de fevereiro de ano bissexto existe', () => {
    expect(iso('29/02/2024')).toBe('2024-02-29')
  })
})

describe('CB-907: ano com dois dígitos', () => {
  it('"12/03/88" é 1988; "12/03/15" é 2015; o ano atual ainda é 20xx', () => {
    expect(iso('12/03/88')).toBe('1988-03-12')
    expect(iso('12/03/15')).toBe('2015-03-12')
    expect(iso('12/03/26')).toBe('2026-03-12')
    expect(iso('12/03/27')).toBe('1927-03-12')
  })
})

describe('CA-1920: a coluna lida como mês/dia', () => {
  it('uma data que só faz sentido como mês/dia e nenhuma como dia/mês: a coluna inteira é mês/dia', () => {
    expect(ordemDasDatas(['03/25/1990', '04/05/1988', '', 'não sei'])).toBe('md')
    expect(iso('04/05/1988', 'md')).toBe('1988-04-05')
    expect(iso('03/25/1990', 'md')).toBe('1990-03-25')
  })

  it('uma de cada lado: fica dia/mês, e a de mês/dia vira "Data inválida"', () => {
    expect(ordemDasDatas(['03/25/1990', '25/03/1990'])).toBe('dm')
  })

  it('CB-906: todas ambíguas (dia e mês até 12) são dia/mês, o padrão do Brasil', () => {
    expect(ordemDasDatas(['03/04/1990', '05/06/1988'])).toBe('dm')
    expect(iso('03/04/1990')).toBe('1990-04-03')
  })

  it('CB-931: com o ano de dois dígitos (o "m/d/yy" do Excel americano), a coluna também vira mês/dia', () => {
    expect(ordemDasDatas(['03/25/90', '12/31/85'], HOJE)).toBe('md')
    // 29/02 só existe em ano bissexto: "02/29/00" é 2000, que tem; lido como 1900, não teria.
    expect(ordemDasDatas(['02/29/00', '13/01/99'], HOJE)).toBe('dm')
    expect(iso('04/05/88', 'md')).toBe('1988-04-05')
  })

  it('datas no formato AAAA-MM-DD e números de série não mudam a ordem', () => {
    expect(ordemDasDatas(['1990-03-25', '33311'])).toBe('dm')
  })
})

describe('CA-1921: o nome', () => {
  it('todo em maiúsculas vira nome próprio, com de, da, do, das, dos e "e" em minúscula', () => {
    expect(arrumarNome('JULIANA FERREIRA DE SOUZA')).toBe('Juliana Ferreira de Souza')
    expect(arrumarNome('JOSÉ DOS SANTOS E SILVA')).toBe('José dos Santos e Silva')
    expect(arrumarNome('ANA DAS DORES DA CONCEIÇÃO DO CARMO')).toBe('Ana das Dores da Conceição do Carmo')
  })

  it('a partícula no começo fica com maiúscula; hífen e apóstrofo também separam (DP-IP-33)', () => {
    expect(arrumarNome('DA SILVA, MARIA')).toBe('Da Silva, Maria')
    expect(arrumarNome("MARIA-CLARA D'ÁVILA")).toBe("Maria-Clara D'Ávila")
    expect(arrumarNome('J. SILVA')).toBe('J. Silva')
  })

  it('espaços a mais saem; o que não está todo em maiúsculas fica como veio', () => {
    expect(arrumarNome('  juliana   Ferreira  ')).toBe('juliana Ferreira')
    expect(arrumarNome('Ana LIMA')).toBe('Ana LIMA')
    expect(arrumarNome('123')).toBe('123')
  })
})

describe('CB-908: telefone', () => {
  it('o número que o CSV já trouxe em notação científica se perdeu: entra vazio (DP-IP-34)', () => {
    expect(lerTelefone('5,51199E+12')).toBe('')
    expect(lerTelefone('5.51199e12')).toBe('')
  })

  it('o resto entra como veio, sem validar', () => {
    expect(lerTelefone(' (11) 98765-4321 ')).toBe('(11) 98765-4321')
    expect(lerTelefone('5511987654321')).toBe('5511987654321')
    expect(lerTelefone('ramal 22')).toBe('ramal 22')
  })
})

describe('CB-909: bebê com menos de 1 ano', () => {
  it('a data entra', () => {
    expect(iso('01/08/2026')).toBe('2026-08-01')
  })
})
