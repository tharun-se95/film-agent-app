import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

function encrypt(text: string, password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha512");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  return salt.toString("hex") + ":" + iv.toString("hex") + ":" + encrypted;
}

function decrypt(encryptedText: string, password: string): string {
  const parts = encryptedText.split(":");
  const salt = Buffer.from(parts[0], "hex");
  const iv = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  
  const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha512");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

const command = process.argv[2];
const passwordOrFile = process.argv[3];
const pass = process.argv[4];

if (command === "encrypt") {
  if (!passwordOrFile) {
    console.error("Usage: npx tsx scripts/vault.ts encrypt <password>");
    process.exit(1);
  }
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error(".env.local not found!");
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, "utf8");
  const enc = encrypt(content, passwordOrFile);
  fs.writeFileSync(path.join(process.cwd(), ".env.enc"), enc);
  console.log("✅ .env.local encrypted to .env.enc successfully.");
} else if (command === "decrypt") {
  if (!passwordOrFile) {
    console.error("Usage: npx tsx scripts/vault.ts decrypt <password>");
    process.exit(1);
  }
  const encPath = path.join(process.cwd(), ".env.enc");
  if (!fs.existsSync(encPath)) {
    console.error(".env.enc not found!");
    process.exit(1);
  }
  const content = fs.readFileSync(encPath, "utf8");
  try {
    const dec = decrypt(content, passwordOrFile);
    fs.writeFileSync(path.join(process.cwd(), ".env.local"), dec);
    console.log("✅ .env.enc decrypted to .env.local successfully.");
  } catch (e) {
    console.error("❌ Decryption failed! Check your password.");
    process.exit(1);
  }
} else {
  console.log("Industrial Vault Utility");
  console.log("Commands: encrypt, decrypt");
}
