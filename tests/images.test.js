const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { removeUploadedImage, saveUploadedImage } = require("../lib/images");

test("uploaded profile images are stored locally and can be removed safely", async () => {
  const onePixelGif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");
  const webPath = await saveUploadedImage({ buffer: onePixelGif, mimetype: "image/gif" }, "avatars", "test-profile");
  const diskPath = path.join(__dirname, "..", "public", webPath.slice(1));
  assert.match(webPath, /^\/uploads\/avatars\/test-profile-.*\.gif$/);
  assert.equal(fs.existsSync(diskPath), true);
  await removeUploadedImage(webPath);
  assert.equal(fs.existsSync(diskPath), false);
});

test("uploaded files are rejected when their bytes are not an image", async () => {
  await assert.rejects(
    saveUploadedImage({ buffer: Buffer.from("not an image"), mimetype: "image/png" }, "avatars", "invalid"),
    /Unsupported image type/,
  );
});
