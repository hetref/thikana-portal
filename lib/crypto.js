import crypto from "crypto";

// Use environment variables for encryption keys
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "your-fallback-encryption-key-32-chars"; // Better to use env var
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypt sensitive data
 * @param {string} text - Data to encrypt
 * @returns {string} - Encrypted data
 */
export function encrypt(text) {
  try {
    // Create an initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create a cipher with AES-256-CBC
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY),
      iv
    );

    // Encrypt the data
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Prepend the IV to the encrypted data
    // IV is stored with the encrypted data so we can decrypt it later
    return iv.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypt encrypted data
 * @param {string} text - Encrypted data to decrypt
 * @returns {string} - Decrypted data
 */
export function decrypt(text) {
  try {
    // Extract the IV from the encrypted text
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = textParts.join(":");

    // Create a decipher with AES-256-CBC
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY),
      iv
    );

    // Decrypt the data
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
}
