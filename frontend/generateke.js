// save this as generateKey.js
import crypto from "crypto";

// Generate a 32-byte (256-bit) secret key for AES-256
const secretKey = crypto.randomBytes(32).toString("hex");

console.log("Your new secret key is:", secretKey);
