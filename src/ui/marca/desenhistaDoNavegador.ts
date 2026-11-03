// O desenhista de verdade da logo (spec marca-no-link, D-951 e DP-ML-3): abre a imagem num <img> e a redesenha num
// <canvas>, em PNG. Um SVG dentro de <img> é desenhado sem script, sem evento e sem nada de fora; o que sai do <canvas>
// é só o desenho. A regra (tamanhos, tetos, a logo clara) está em src/domain/logoDaMarca.ts; o teste deste arquivo é o
// do Playwright (e2e/marca-no-link.spec.ts), porque o jsdom não tem <canvas>.
import type { Desenhista, ImagemAberta } from '@/domain/logoDaMarca.ts'

/** A proporção do `viewBox` de um SVG sem largura e altura, lida do texto (sem montar o SVG em lugar nenhum). */
function proporcaoDoSvg(dataUrl: string): number | null {
  const virgula = dataUrl.indexOf(',')
  if (virgula < 0) return null
  let texto: string
  try {
    texto = /;base64$/i.test(dataUrl.slice(0, virgula)) ? atob(dataUrl.slice(virgula + 1)) : decodeURIComponent(dataUrl.slice(virgula + 1))
  } catch {
    return null
  }
  // Com largura e altura no <svg>, o navegador já sabe a proporção; a caixa só vale quando elas faltam.
  const raiz = /<svg\b[^>]*>/i.exec(texto)?.[0] ?? ''
  if (/\swidth\s*=/i.test(raiz) && /\sheight\s*=/i.test(raiz)) return null
  const caixa = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(texto)
  const largura = Number(caixa?.[1])
  const altura = Number(caixa?.[2])
  return largura > 0 && altura > 0 ? largura / altura : null
}

function novaTela(largura: number, altura: number): { readonly tela: HTMLCanvasElement; readonly pincel: CanvasRenderingContext2D } {
  const tela = document.createElement('canvas')
  tela.width = largura
  tela.height = altura
  const pincel = tela.getContext('2d')
  if (!pincel) throw new Error('Sem <canvas> neste navegador.')
  pincel.imageSmoothingEnabled = true
  pincel.imageSmoothingQuality = 'high'
  return { tela, pincel }
}

export const desenhistaDoNavegador: Desenhista = {
  async abrir(dataUrl) {
    const imagem = new Image()
    imagem.decoding = 'async'
    imagem.src = dataUrl
    await imagem.decode()
    const svg = dataUrl.startsWith('data:image/svg+xml')
    let largura = imagem.naturalWidth
    let altura = imagem.naturalHeight
    // SVG é vetor: vale pela proporção (a da caixa `viewBox`, quando ele não diz o tamanho; o Chrome inventa 300 × 150),
    // desenhado com 600 px no lado maior, o teto da cópia. Um SVG pequeno não vira uma logo borrada no papel.
    if (svg) {
      const proporcao = proporcaoDoSvg(dataUrl) ?? (largura > 0 && altura > 0 ? largura / altura : null)
      if (proporcao !== null) {
        largura = proporcao >= 1 ? 600 : Math.round(600 * proporcao)
        altura = proporcao >= 1 ? Math.round(600 / proporcao) : 600
      }
    }
    const aberta: ImagemAberta = {
      largura,
      altura,
      desenhar(alvoLargura, alvoAltura) {
        // Reduzir de uma vez só serrilha a logo grande: metade por metade até perto do tamanho, como o navegador faria
        // com uma imagem bem reduzida. O SVG é vetor e vai direto ao tamanho final.
        let fonte: CanvasImageSource = imagem
        let fonteLargura = largura
        let fonteAltura = altura
        while (!svg && fonteLargura / 2 >= alvoLargura && fonteAltura / 2 >= alvoAltura) {
          const metade = novaTela(Math.round(fonteLargura / 2), Math.round(fonteAltura / 2))
          metade.pincel.drawImage(fonte, 0, 0, metade.tela.width, metade.tela.height)
          fonte = metade.tela
          fonteLargura = metade.tela.width
          fonteAltura = metade.tela.height
        }
        const final = novaTela(alvoLargura, alvoAltura)
        final.pincel.drawImage(fonte, 0, 0, alvoLargura, alvoAltura)
        // Lança SecurityError quando o navegador acha que a imagem não pode ser lida: vira "Não foi possível ler".
        return { dataUrl: final.tela.toDataURL('image/png'), pixels: final.pincel.getImageData(0, 0, alvoLargura, alvoAltura).data }
      },
    }
    return aberta
  },
}
