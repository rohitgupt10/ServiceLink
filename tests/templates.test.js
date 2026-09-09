const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");

test("all EJS templates compile", () => {
  const root = path.join(__dirname, "..", "views");
  const files = [];
  function collect(directory) {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, item.name);
      if (item.isDirectory()) collect(fullPath);
      else if (item.name.endsWith(".ejs")) files.push(fullPath);
    }
  }
  collect(root);
  assert.ok(files.length > 0);
  for (const file of files) assert.doesNotThrow(() => ejs.compile(fs.readFileSync(file, "utf8"), { filename: file }), file);
});

test("the public header renders safely before notification locals are loaded", async () => {
  const file = path.join(__dirname, "..", "views", "partials", "header.ejs");
  const html = await ejs.renderFile(file, {
    user: { id: "user-1", name: "Demo User", role: "user", avatar: "https://placehold.co/160" },
    csrfToken: "test-token",
  });
  assert.match(html, /Notifications/);
  assert.match(html, /User mode/);
  assert.doesNotMatch(html, />0<\/span>/);
});

test("the public header identifies provider mode", async () => {
  const file = path.join(__dirname, "..", "views", "partials", "header.ejs");
  const html = await ejs.renderFile(file, {
    user: { id: "provider-1", name: "Demo Provider", role: "provider", avatar: "/images/default-avatar.svg" },
    unreadNotificationCount: 2,
    csrfToken: "test-token",
  });
  assert.match(html, /Provider mode/);
  assert.match(html, />2<\/span>/);
});
