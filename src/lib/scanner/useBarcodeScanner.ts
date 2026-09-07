import { useCallback, useRef } from 'react'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { BrowserMultiFormatReader } from '@zxing/browser'

export type ScanOutcome =
  | { status: 'success'; codigo: string }
  | { status: 'no-match' }
  | { status: 'unavailable'; message: string }

/**
 * Wraps `@zxing/browser`'s `BrowserMultiFormatReader` for both 1D barcodes
 * and DataMatrix (research.md). Never touches the camera on mount — the
 * reader instance is created lazily and `getUserMedia` is only requested
 * inside `scan()`, i.e. only when the caller explicitly invokes it (FR-008,
 * FR-009).
 */
export function useBarcodeScanner() {
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)

  function getReader(): BrowserMultiFormatReader {
    if (!readerRef.current) {
      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
      ])
      readerRef.current = new BrowserMultiFormatReader(hints)
    }
    return readerRef.current
  }

  /** Decodes once from the given video element's camera stream (FR-008). */
  const scan = useCallback(
    async (videoElement: HTMLVideoElement): Promise<ScanOutcome> => {
      try {
        const reader = getReader()
        const result = await reader.decodeOnceFromVideoDevice(
          undefined,
          videoElement,
        )
        return { status: 'success', codigo: result.getText() }
      } catch (err) {
        if (err instanceof DOMException) {
          return {
            status: 'unavailable',
            message: 'No se pudo acceder a la cámara.',
          }
        }
        return { status: 'no-match' }
      }
    },
    [],
  )

  /** Stops any active camera stream (e.g. user cancels the scan). */
  const stop = useCallback(() => {
    BrowserMultiFormatReader.releaseAllStreams()
  }, [])

  return { scan, stop }
}
