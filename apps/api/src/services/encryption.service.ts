/**
 * Serviciu de criptare la nivel de câmp (AES-256-GCM)
 * Protejează datele medicale sensibile ale utilizatorilor
 */

import crypto from 'crypto';

/** Câmpurile din fiecare model care trebuie criptate */
export const ENCRYPTED_FIELDS: Record<string, string[]> = {
  UserProfile: [
    'allergies',
    'medicalConditions',
    'medications',
    'pregnancyStatus',
    'weight',
    'height',
  ],
};

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const ENCRYPTED_PATTERN = /^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/;

export class FieldEncryptionService {
  private masterKey: Buffer;

  constructor() {
    const envKey = process.env.MASTER_ENCRYPTION_KEY;

    if (envKey) {
      // Cheia din environment trebuie să fie hex-encoded, 64 caractere = 32 bytes
      if (envKey.length !== 64) {
        throw new Error(
          'MASTER_ENCRYPTION_KEY trebuie să fie un string hex de 64 de caractere (32 bytes).'
        );
      }
      this.masterKey = Buffer.from(envKey, 'hex');
    } else {
      // Generăm o cheie aleatorie — DOAR pentru development
      this.masterKey = crypto.randomBytes(32);
      console.warn(
        '⚠️  [FieldEncryption] MASTER_ENCRYPTION_KEY lipsește din environment! ' +
        'S-a generat o cheie temporară. Datele criptate NU vor fi recuperabile după restart. ' +
        'Setați MASTER_ENCRYPTION_KEY=' + this.masterKey.toString('hex') + ' în .env'
      );
    }
  }

  /**
   * Derivă o cheie unică per utilizator folosind HMAC-SHA256
   * Astfel, compromiterea datelor unui user nu afectează pe alții
   */
  deriveUserKey(userId: string): Buffer {
    return crypto
      .createHmac('sha256', this.masterKey)
      .update('user-key:' + userId)
      .digest();
  }

  /**
   * Criptează un text simplu cu AES-256-GCM
   * @returns Format: "iv_base64:authTag_base64:ciphertext_base64"
   */
  encrypt(plaintext: string, userId: string): string {
    const userKey = this.deriveUserKey(userId);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, userKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  /**
   * Decriptează datele criptate cu encrypt()
   * @param encryptedData Format: "iv_base64:authTag_base64:ciphertext_base64"
   */
  decrypt(encryptedData: string, userId: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Format de date criptate invalid. Se așteaptă "iv:authTag:ciphertext".');
    }

    const [ivB64, authTagB64, ciphertextB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');

    const userKey = this.deriveUserKey(userId);

    const decipher = crypto.createDecipheriv(ALGORITHM, userKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Verifică dacă un string pare să fie deja criptat
   * Pattern: "base64:base64:base64"
   */
  isEncrypted(data: string): boolean {
    if (!data || typeof data !== 'string') return false;
    return ENCRYPTED_PATTERN.test(data);
  }
}

/** Instanță singleton — importați acest obiect în restul aplicației */
export const fieldEncryption = new FieldEncryptionService();
