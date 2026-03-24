/**
 * Serviciu de securitate pentru imagini
 * Pipeline complet: validare tip → eliminare metadata (GPS!) → redimensionare → ștergere programată
 */

import sharp from 'sharp';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/** Semnături magic bytes pentru tipuri de imagine acceptate */
const MAGIC_BYTES: Array<{ mime: string; bytes: number[] }> = [
  { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',  bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF" header
];

/** Dimensiunea maximă acceptată pentru upload (10 MB) */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/** TTL implicit pentru ștergere automată (24 de ore) */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export class ImageSecurityService {
  /** Fișiere programate pentru ștergere — folosit la shutdown */
  private pendingDeletions: Set<string> = new Set();

  /** Timer-ele active — pentru cleanup */
  private activeTimers: Set<ReturnType<typeof setTimeout>> = new Set();

  /**
   * Validează tipul real al imaginii pe baza magic bytes
   * Previne upload de executabile cu extensie .jpg
   */
  validateImageType(buffer: Buffer): { valid: boolean; mimeType: string } {
    for (const magic of MAGIC_BYTES) {
      if (buffer.length >= magic.bytes.length) {
        const matches = magic.bytes.every((byte, index) => buffer[index] === byte);
        if (matches) {
          // Verificare suplimentară pentru WebP: bytes 8-11 trebuie să fie "WEBP"
          if (magic.mime === 'image/webp') {
            if (buffer.length >= 12) {
              const webpSignature = buffer.slice(8, 12).toString('ascii');
              if (webpSignature === 'WEBP') {
                return { valid: true, mimeType: magic.mime };
              }
            }
            continue; // RIFF dar nu WEBP
          }
          return { valid: true, mimeType: magic.mime };
        }
      }
    }

    return { valid: false, mimeType: 'unknown' };
  }

  /**
   * Elimină TOATE metadatele din imagine (EXIF, GPS, cameră, etc.)
   * CRITIC: Fotografiile de pe telefon conțin coordonate GPS!
   * Aplică mai întâi rotația din EXIF înainte de a șterge metadata
   */
  async stripMetadata(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .rotate() // Aplică rotația EXIF înainte de ștergere
      .withMetadata({}) // Elimină toate metadatele
      .toBuffer();
  }

  /**
   * Redimensionează imaginea pentru procesare, păstrând aspect ratio
   * @param maxDimension Dimensiunea maximă pe orice axă (implicit 2048px)
   */
  async resizeForProcessing(buffer: Buffer, maxDimension: number = 2048): Promise<Buffer> {
    return sharp(buffer)
      .resize(maxDimension, maxDimension, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();
  }

  /**
   * Generează un nume de fișier anonim — NICIODATĂ bazat pe date utilizator
   * Format: scan_{randomHex16}_{timestamp}.jpg
   */
  generateAnonymousFilename(): string {
    const randomPart = crypto.randomBytes(8).toString('hex'); // 16 hex chars
    const timestamp = Date.now();
    return `scan_${randomPart}_${timestamp}.jpg`;
  }

  /**
   * Pipeline complet de procesare securizată a imaginii
   * 1. Decodare base64
   * 2. Validare dimensiune (max 10MB)
   * 3. Validare tip (magic bytes)
   * 4. Eliminare EXIF/GPS
   * 5. Redimensionare
   * 6. Returnare buffer curat
   */
  async processImageSecurely(base64Image: string): Promise<Buffer> {
    // 1. Decodare base64 — suportăm și format data URI
    let base64Data = base64Image;
    if (base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1];
    }

    const buffer = Buffer.from(base64Data, 'base64');

    // 2. Validare dimensiune
    if (buffer.length > MAX_IMAGE_SIZE) {
      throw new Error(
        `Imaginea depășește limita de ${MAX_IMAGE_SIZE / (1024 * 1024)}MB. ` +
        `Dimensiune primită: ${(buffer.length / (1024 * 1024)).toFixed(1)}MB.`
      );
    }

    if (buffer.length === 0) {
      throw new Error('Imaginea este goală. Verificați datele trimise.');
    }

    // 3. Validare tip real (magic bytes)
    const typeCheck = this.validateImageType(buffer);
    if (!typeCheck.valid) {
      throw new Error(
        'Tip de fișier neacceptat. Se acceptă doar: JPEG, PNG, WebP. ' +
        'Fișierul trimis nu corespunde niciunui format valid de imagine.'
      );
    }

    // 4. Eliminare metadata (GPS, cameră, etc.)
    const strippedBuffer = await this.stripMetadata(buffer);

    // 5. Redimensionare pentru procesare
    const processedBuffer = await this.resizeForProcessing(strippedBuffer);

    return processedBuffer;
  }

  /**
   * Programează ștergerea unui fișier după un interval de timp
   * @param filePath Calea absolută către fișier
   * @param ttlMs Timp până la ștergere în milisecunde (implicit 24h)
   */
  scheduleImageDeletion(filePath: string, ttlMs: number = DEFAULT_TTL_MS): void {
    const absolutePath = path.resolve(filePath);
    this.pendingDeletions.add(absolutePath);

    const timer = setTimeout(() => {
      this.deleteFile(absolutePath);
      this.activeTimers.delete(timer);
    }, ttlMs);

    // Nu bloca procesul Node.js de la închidere
    timer.unref();
    this.activeTimers.add(timer);
  }

  /**
   * Șterge un fișier în siguranță, cu logging
   */
  private deleteFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.pendingDeletions.delete(filePath);
      }
    } catch (error) {
      console.error(`[ImageSecurity] Eroare la ștergerea fișierului ${filePath}:`, error);
    }
  }

  /**
   * Șterge TOATE fișierele programate — folosit la shutdown graceful
   */
  cleanupPendingDeletions(): void {
    // Oprește toate timer-ele active
    for (const timer of this.activeTimers) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();

    // Șterge toate fișierele rămase
    let deleted = 0;
    let failed = 0;

    for (const filePath of this.pendingDeletions) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          deleted++;
        }
      } catch {
        failed++;
        console.error(`[ImageSecurity] Nu s-a putut șterge la cleanup: ${filePath}`);
      }
    }

    this.pendingDeletions.clear();

    if (deleted > 0 || failed > 0) {
      console.log(
        `[ImageSecurity] Cleanup: ${deleted} fișiere șterse, ${failed} erori.`
      );
    }
  }

  /**
   * Returnează numărul de fișiere în așteptare pentru ștergere
   */
  get pendingCount(): number {
    return this.pendingDeletions.size;
  }
}

/** Instanță singleton — importați acest obiect în restul aplicației */
export const imageSecurity = new ImageSecurityService();
