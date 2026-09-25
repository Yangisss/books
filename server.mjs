/**
 * Великодолинська школа №2 — сервер спільної бібліотеки.
 * node server.mjs   (або npm run serve)
 *
 * - роздає сайт (index.html)
 * - API спільних підручників: файли, додані в сайт, зберігаються тут
 *   і відкриваються для всіх учнів відповідного класу.
 *
 * Сховище: ./uploads/<cls>/<subject>/<id><ext> + ./uploads/index.json
 * Без зовнішніх залежностей — чистий Node 18+.
 */
import { createServer } from "node:http";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";

const ROOT = import.meta.dirname;
const UPLOADS = join(ROOT, "uploads");
const INDEX = join(UPLOADS, "index.json");
const MAX_FILE = 80 * 1024 * 1024; // 80 МБ на файл
const PORT = Number(process.env.PORT || 8080);
/* Код власника: лише з ним можна додавати/видаляти книги.
   Зміни на свій: SCHOOL_ADMIN_PASSWORD=твій_код node server.mjs */
const ADMIN_PASSWORD = process.env.SCHOOL_ADMIN_PASSWORD || "vdsh2-2026";
const authorized = (req) => (req.headers["x-admin-key"] || "") === ADMIN_PASSWORD;

const MIME = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".epub": "application/epub+zip",
  ".djvu": "image/vnd.djvu",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".fb2": "application/x-fictionbook+xml",
};
const INLINE = new Set(["application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml", "text/plain; charset=utf-8", "text/html; charset=utf-8"]);

async function loadIndex() {
  try {
    return JSON.parse(await readFile(INDEX, "utf8"));
  } catch {
    return {};
  }
}
async function saveIndex(ix) {
  await mkdir(UPLOADS, { recursive: true });
  await writeFile(INDEX, JSON.stringify(ix, null, 1));
}

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(body);
}
function text404(res) {
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("not found");
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error("payload too large"), { code: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseMultipart(buf, boundary) {
  const parts = [];
  const B = Buffer.from(`--${boundary}`);
  let i = buf.indexOf(B);
  while (i !== -1) {
    const next = buf.indexOf(B, i + B.length);
    if (next === -1) break;
    const seg = buf.subarray(i + B.length, next);
    const headEnd = seg.indexOf("\r\n\r\n");
    if (seg.length > 2 && seg.subarray(0, 2).toString() !== "--" && headEnd !== -1) {
      const head = seg.subarray(0, headEnd).toString();
      let body = seg.subarray(headEnd + 4);
      if (body.subarray(-2).toString() === "\r\n") body = body.subarray(0, -2);
      parts.push({
        name: /name="([^"]*)"/i.exec(head)?.[1] ?? "",
        filename: /filename="([^"]*)"/i.exec(head)?.[1] ?? null,
        ctype: (/content-type:\s*([^\r\n]+)/i.exec(head)?.[1] ?? "").trim(),
        body,
      });
    }
    i = next;
  }
  return parts;
}

const safeCls = (v) => {
  const s = String(v || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 8);
  return /^[0-9]{1,2}[a-яa-z]{0,2}$/.test(s) ? s : null;
};
const safeSubject = (v) => {
  const s = String(v || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
  return s || null;
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const route = url.pathname;

  try {
    /* -------- API: список книг класу -------- */
    /* -------- API: перевірка коду власника -------- */
    if (req.method === "GET" && route === "/api/admin/check") {
      if (authorized(req)) return json(res, 200, { ok: true });
      return json(res, 401, { error: "невірний код" });
    }

    if (req.method === "GET" && route === "/api/books") {
      const cls = safeCls(url.searchParams.get("cls"));
      if (cls === null) return json(res, 400, { error: "невірний клас" });
      const ix = await loadIndex();
      const list = Object.entries(ix)
        .filter(([, e]) => e.cls === cls)
        .sort((a, b) => b[1].addedAt - a[1].addedAt)
        .map(([id, e]) => ({
          id,
          subject: e.subject,
          name: e.name,
          type: e.type,
          size: e.size,
          addedAt: e.addedAt,
          url: `/uploads/${e.file}`,
          shared: true,
        }));
      return json(res, 200, list);
    }

    /* -------- API: завантаження (multipart: cls, subject, file[]) -------- */
    if (req.method === "POST" && route === "/api/books") {
      if (!authorized(req)) return json(res, 401, { error: "лише власник сайту може додавати книги" });
      const ct = req.headers["content-type"] || "";
      const boundary = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ct)?.slice(1).find(Boolean);
      if (!boundary) return json(res, 400, { error: "multipart only" });
      let buf;
      try {
        buf = await readBody(req, MAX_FILE * 6 + 16 * 1024 * 1024);
      } catch (e) {
        return json(res, e.code === 413 ? 413 : 400, { error: "забагато даних" });
      }
      const parts = parseMultipart(buf, boundary);
      const cls = safeCls(parts.find((p) => p.name === "cls")?.body.toString("utf8"));
      const subject = safeSubject(parts.find((p) => p.name === "subject")?.body.toString("utf8"));
      const files = parts.filter((p) => p.name === "file" && p.filename);
      if (cls === null || !subject) return json(res, 400, { error: "cls/subject required" });
      if (!files.length) return json(res, 400, { error: "немає файлів" });

      await mkdir(join(UPLOADS, String(cls), subject), { recursive: true });
      const ix = await loadIndex();
      let added = 0;
      for (const f of files) {
        if (f.body.length > MAX_FILE) continue;
        const id = randomUUID();
        const ext = (extname(f.filename).toLowerCase().match(/^\.[a-z0-9]{1,8}$/)?.[0]) || "";
        const rel = join(String(cls), subject, `${id}${ext}`);
        await writeFile(join(UPLOADS, rel), f.body);
        ix[id] = {
          cls,
          subject,
          name: f.filename.replace(/[/\\\r\n]/g, "_").slice(0, 180) || `file${ext}`,
          type: f.ctype || MIME[ext] || "application/octet-stream",
          size: f.body.length,
          addedAt: Date.now(),
          file: rel.split("\\").join("/"),
        };
        added++;
      }
      await saveIndex(ix);
      return json(res, 201, { ok: true, added });
    }

    /* -------- API: видалення -------- */
    const del = /^\/api\/books\/([0-9a-f-]{36})$/i.exec(route);
    if (req.method === "DELETE" && del) {
      if (!authorized(req)) return json(res, 401, { error: "лише власник сайту може видаляти книги" });
      const ix = await loadIndex();
      const e = ix[del[1]];
      if (!e) return json(res, 404, { error: "not found" });
      await rm(join(UPLOADS, e.file), { force: true });
      delete ix[del[1]];
      await saveIndex(ix);
      return json(res, 200, { ok: true });
    }

    /* -------- віддача файлів бібліотеки -------- */
    if ((req.method === "GET" || req.method === "HEAD") && route.startsWith("/uploads/")) {
      const rel = normalize(decodeURIComponent(route.slice("/uploads/".length))).replace(/^(\.\.[/\\])+/, "");
      const abs = join(UPLOADS, rel);
      if (!abs.startsWith(UPLOADS) || !existsSync(abs)) return text404(res);
      const st = await stat(abs);
      const ext = extname(abs).toLowerCase();
      const type = MIME[ext] || "application/octet-stream";
      const name = encodeURIComponent((url.searchParams.get("n") || "file").replace(/["\r\n]/g, ""));
      res.writeHead(200, {
        "content-type": type,
        "content-length": st.size,
        "content-disposition": `${INLINE.has(type) ? "inline" : `attachment; filename*=UTF-8''${name}`}`,
        "cache-control": "public, max-age=31536000, immutable",
      });
      return createReadStream(abs).pipe(res);
    }

    /* -------- статика сайту -------- */
    if (req.method === "GET" && (route === "/" || route === "/index.html")) {
      const html = await readFile(join(ROOT, "index.html"));
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
      return res.end(html);
    }

    return text404(res);
  } catch (e) {
    json(res, 500, { error: String(e?.message || e) });
  }
});

await mkdir(UPLOADS, { recursive: true });
server.listen(PORT, "0.0.0.0", () => {
  console.log("📚 Спільна бібліотека Великодолинська школа №2 — http://0.0.0.0:" + PORT);
});
