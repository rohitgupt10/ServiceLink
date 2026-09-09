const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const publicRoot = path.resolve(__dirname, "..", "public");
const uploadRoot = path.join(publicRoot, "uploads");
const imageRoot = path.join(publicRoot, "images");
const allowedTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    callback(allowedTypes.has(file.mimetype) ? null : new Error("Use a JPG, PNG, WEBP, or GIF image."), allowedTypes.has(file.mimetype));
  },
});

function parseAvatarUpload(req, res, next) {
  imageUpload.single("avatar")(req, res, (error) => {
    if (error) req.imageUploadError = error.code === "LIMIT_FILE_SIZE" ? "Profile image must be 5 MB or smaller." : error.message;
    next();
  });
}

function safeBaseName(value) {
  return String(value || "image").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "image";
}

function detectImageType(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"))) return "image/gif";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

function safeDestination(root, folder, filename) {
  const destination = path.resolve(root, safeBaseName(folder), filename);
  if (!destination.startsWith(path.resolve(root) + path.sep)) throw new Error("Invalid image destination.");
  return destination;
}

async function writeImage(buffer, mimeType, { folder, prefix, permanent = false }) {
  const detectedType = detectImageType(buffer);
  const extension = allowedTypes.get(detectedType);
  if (!extension) throw new Error("Unsupported image type.");
  const suffix = permanent ? "" : `-${Date.now()}-${crypto.randomBytes(5).toString("hex")}`;
  const filename = `${safeBaseName(prefix)}${suffix}${extension}`;
  const root = permanent ? imageRoot : uploadRoot;
  const destination = safeDestination(root, folder, filename);
  await fs.promises.mkdir(path.dirname(destination), { recursive: true });
  await fs.promises.writeFile(destination, buffer, { flag: permanent ? "w" : "wx" });
  const webRoot = permanent ? "images" : "uploads";
  return `/${webRoot}/${safeBaseName(folder)}/${filename}`;
}

async function saveUploadedImage(file, folder, prefix) {
  if (!file) return null;
  return writeImage(file.buffer, file.mimetype, { folder, prefix });
}

async function cacheRemoteImage(url, { folder, prefix, permanent = false } = {}) {
  if (!url) return null;
  if (/^\/(images|uploads)\//.test(url)) return url;
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Image URL must use HTTP or HTTPS.");
  const response = await fetch(parsed, {
    headers: { "User-Agent": "ServiceLink-Image-Cache/1.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Image download failed with status ${response.status}.`);
  const mimeType = String(response.headers.get("content-type") || "").split(";")[0].toLowerCase();
  if (!allowedTypes.has(mimeType)) throw new Error("The URL did not return a supported image.");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > 8 * 1024 * 1024) throw new Error("Downloaded image must be between 1 byte and 8 MB.");
  return writeImage(buffer, mimeType, { folder, prefix, permanent });
}

async function removeUploadedImage(webPath) {
  if (!/^\/uploads\/[a-z0-9-]+\/[a-z0-9._-]+$/i.test(String(webPath || ""))) return;
  const destination = path.resolve(publicRoot, webPath.slice(1));
  if (!destination.startsWith(path.resolve(uploadRoot) + path.sep)) return;
  await fs.promises.unlink(destination).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
}

module.exports = { cacheRemoteImage, parseAvatarUpload, removeUploadedImage, saveUploadedImage };
