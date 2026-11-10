// O desenhista de verdade da foto da avaliação (spec antropometria-telas, D-1453, D-1507 e DP-AT-11): abre a foto já
// girada pela orientação da câmera e a redesenha num <canvas>, em JPEG. O que sai do <canvas> é só o desenho: o EXIF
// (local, aparelho, data) não vem junto. A regra (tamanhos, qualidade, tetos) mora em src/domain/fotosDaAvaliacao.ts; o
// teste deste arquivo é o do Playwright (e2e/servidor-falso/fotos-avaliacao.spec.ts), porque o jsdom não tem <canvas>.
import { createContext, useContext } from 'react'
import type { DesenhistaDeFoto, FotoAberta } from '@/domain/fotosDaAvaliacao.ts'

/** O fundo do JPEG, que não tem transparência (CB-1463): a cor do papel, não um token de tela. */
const FUNDO_DO_JPEG = 'white'

export const desenhistaDoNavegador: DesenhistaDeFoto = {
  async abrir(arquivo) {
    const bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' })
    const aberta: FotoAberta = {
      largura: bitmap.width,
      altura: bitmap.height,
      async desenharJpeg(largura, altura, qualidade) {
        const tela = document.createElement('canvas')
        tela.width = largura
        tela.height = altura
        const pincel = tela.getContext('2d')
        if (!pincel) throw new Error('Sem <canvas> neste navegador.')
        pincel.fillStyle = FUNDO_DO_JPEG
        pincel.fillRect(0, 0, largura, altura)
        pincel.imageSmoothingEnabled = true
        pincel.imageSmoothingQuality = 'high'
        pincel.drawImage(bitmap, 0, 0, largura, altura)
        bitmap.close()
        return new Promise<Blob>((resolver, rejeitar) => {
          tela.toBlob((blob) => (blob ? resolver(blob) : rejeitar(new Error('O navegador não gerou o JPEG.'))), 'image/jpeg', qualidade)
        })
      },
    }
    return aberta
  },
}

/** O desenhista da tela: o do navegador; o teste de componente passa um falso. */
export const ContextoDesenhistaDeFoto = createContext<DesenhistaDeFoto>(desenhistaDoNavegador)

export const useDesenhistaDeFoto = (): DesenhistaDeFoto => useContext(ContextoDesenhistaDeFoto)
