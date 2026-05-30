import crypto from "node:crypto";

export function hashApiKey(plainTextKey) {
  return crypto.createHash("sha256").update(plainTextKey).digest("hex");
}

export function generateApiKey(prefix = "ak_live") {
  const value = crypto.randomBytes(24).toString("hex");
  return `${prefix}_${value}`;
}

