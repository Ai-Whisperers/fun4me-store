/**
 * Browser API Type Declarations
 *
 * TypeScript declarations for experimental browser APIs that are not yet
 * included in standard TypeScript DOM types.
 *
 * These APIs are feature-detected at runtime before use.
 */

// =============================================================================
// BARCODE DETECTION API
// https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API
// =============================================================================

/**
 * Detected barcode result
 */
interface DetectedBarcode {
  /** Bounding box of the detected barcode */
  boundingBox: DOMRectReadOnly
  /** Corner points of the barcode */
  cornerPoints: ReadonlyArray<{ x: number; y: number }>
  /** Format of the detected barcode */
  format: BarcodeFormat
  /** Raw value of the barcode */
  rawValue: string
}

/**
 * Supported barcode formats
 */
type BarcodeFormat =
  | 'aztec'
  | 'code_128'
  | 'code_39'
  | 'code_93'
  | 'codabar'
  | 'data_matrix'
  | 'ean_13'
  | 'ean_8'
  | 'itf'
  | 'pdf417'
  | 'qr_code'
  | 'upc_a'
  | 'upc_e'
  | 'unknown'

/**
 * Options for BarcodeDetector constructor
 */
interface BarcodeDetectorOptions {
  /** Array of barcode formats to detect */
  formats?: BarcodeFormat[]
}

/**
 * BarcodeDetector API - Experimental
 *
 * @example
 * ```typescript
 * if ('BarcodeDetector' in window) {
 *   const detector = new BarcodeDetector({ formats: ['qr_code', 'ean_13'] })
 *   const barcodes = await detector.detect(imageElement)
 * }
 * ```
 */
interface BarcodeDetector {
  /** Detect barcodes in an image source */
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>
}

interface BarcodeDetectorConstructor {
  new (options?: BarcodeDetectorOptions): BarcodeDetector
  /** Get supported barcode formats */
  getSupportedFormats(): Promise<BarcodeFormat[]>
}

// =============================================================================
// MEDIA STREAM TRACK TORCH CAPABILITY
// https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackCapabilities
// =============================================================================

/**
 * Extended media track capabilities including torch
 */
interface MediaTrackCapabilitiesExtended extends MediaTrackCapabilities {
  /** Whether the device has a torch (flashlight) */
  torch?: boolean
}

/**
 * Extended media track constraints for torch control
 */
interface MediaTrackConstraintsExtended extends MediaTrackConstraints {
  /** Advanced constraints including torch */
  advanced?: Array<{
    torch?: boolean
  }>
}

// =============================================================================
// GLOBAL DECLARATIONS
// =============================================================================

declare global {
  interface Window {
    /** BarcodeDetector API (experimental) */
    BarcodeDetector?: BarcodeDetectorConstructor
  }

  /** BarcodeDetector constructor */
  const BarcodeDetector: BarcodeDetectorConstructor | undefined
}

export {}
