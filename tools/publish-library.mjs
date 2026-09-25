#!/usr/bin/env node
/**
 * Публікація підручників на спільну полицю GitHub (папка library/ у репозиторії).
 * Працює й на GitHub Pages: файл → коміт → push → через 1–2 хвилини книгу
 * бачать усі пристрої, що відкрили сайт.
 *
 * Використання (з кореня репозиторію):
 *   node tools/publish-library.mjs add 11a math "Алгебра_11_клас.pdf" [ще файли...]
 *   node tools/publish-library.mjs list
 *   node tools/publish-library.mjs rm <id> [ще id...]
 *
 * Додай --git в кінці, щоб скрипт сам зробив git add + commit + push.
 */
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "..");
const LIB = join(ROOT, "library");
const INDEX = join(LIB, "index.json");
const MAX_FILE = 50 * 1024 * 1024; // 50 МБ на файл — ліміти GitHub намагаємось не чіпати

const MIME = {
  ".pdf": "application/pdf",
  ".epub": "application/epub+zip",
  ".djvu": "image/vnd.djvu",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

const readIndex = async () => {
  try {
    return JSON.parse(await readFile(INDEX, "utf8"));
  } catch {
    return { updated: 0, files: [] };
  }
};
const writeIndex = async (ix) => {
  ix.updated = Date.now();
  await writeFile(INDEX, JSON.stringify(ix, null, 2) + "\n", "utf8");
};

const args = process.argv.slice(2);
const withGit = args.includes("--git");
const rest = args.filter((a) => a !== "--git");
const cmd = rest[0];

const ok = (m) => console.log(`✔ ${m}`);
const die = (m) => {
  console.error(`✖ ${m}`);
  process.exit(1);
};

if (cmd === "add") {
  const [, cls, subject, ...files] = rest;
  if (!cls || !subject || !files.length)
    die(" Використання: add <клас> <предмет> <файл...> — напр.: add 11a math Algebra11.pdf");
  if (!/^[0-9]{1,2}[a-zа-яіїєґ]{0,2}$/i.test(cls)) die(`Незрозумілий клас: ${cls}`);
  if (!/^[a-z][a-z-]*$/i.test(subject)) die(`Предмет — англійською id (math, physics, ukr-lit...), а не "${subject}"`);
  const ix = await readIndex();
  for (const f of files) {
    const abs = resolve(process.cwd(), f);
    if (!existsSync(abs)) die(`Файл не знайдено: ${abs}`);
    const st = await stat(abs);
    if (!st.isFile()) die(`Це не файл: ${abs}`);
    if (st.size > MAX_FILE) die(`Занадто великий (>50 МБ): ${f} — для таких файлів краще справжній сервер`);
    const id = randomUUID();
    const ext = (extname(f).toLowerCase().match(/^\.[a-z0-9]{1,8}$/)?.[0]) || "";
    const relDir = join(cls.toLowerCase(), subject.toLowerCase());
    await mkdir(join(LIB, relDir), { recursive: true });
    const rel = join(relDir, `${id}${ext}`).split("\\").join("/");
    await copyFile(abs, join(LIB, rel));
    ix.files.push({
      id,
      cls: cls.toLowerCase(),
      subject: subject.toLowerCase(),
      name: f.split(/[\\/]/).pop().replace(/[_]/g, " ").slice(0, 180),
      type: MIME[ext] || "application/octet-stream",
      size: st.size,
      addedAt: Date.now(),
      path: rel,
    });
    ok(`${f} → ${rel}  (id: ${id})`);
  }
  await writeIndex(ix);
  ok(`Оновлено library/index.json — усього книг: ${ix.files.length}`);
  console.log("\nДалі — опублікувати:");
  console.log('  git add library && git commit -m "Books" && git push');
  console.log("(або перезапусти з --git, щоб я зробив це за тебе)");
} else if (cmd === "rm") {
  const ids = rest.slice(1);
  if (!ids.length) die("Використання: rm <id> [id...]");
  const ix = await readIndex();
  const before = ix.files.length;
  for (const id of ids) {
    const e = ix.files.find((x) => x.id === id);
    if (!e) {
      console.error(`— id ${id} не знайдено, пропускаю`);
      continue;
    }
    await rm(join(LIB, e.path), { force: true });
    ix.files = ix.files.filter((x) => x.id !== id);
    ok(`видалено: ${e.name} (${e.cls}/${e.subject})`);
  }
  await writeIndex(ix);
  console.log(`Книг було ${before}, стало ${ix.files.length}. Не забудь git add library && git commit && git push`);
} else if (cmd === "list") {
  const ix = await readIndex();
  if (!ix.files.length) {
    console.log("Полиця порожня.");
  } else for (const f of ix.files)
    console.log(`${f.id}  ${f.cls}  ${f.subject.padEnd(13)} ${(f.size / 1024 / 1024).toFixed(1)} МБ  ${f.name}`);
  console.log(`\nУсього: ${ix.files.length} · оновлено ${new Date(ix.updated).toLocaleString("uk")}`);
} else {
  console.log(
    `Скрипт власника для спільної полиці GitHub.\n
  node tools/publish-library.mjs add 11a math <файл.pdf> [...]  --git
  node tools/publish-library.mjs list
  node tools/publish-library.mjs rm <id> --git
`
  );
}

if (withGit && cmd !== "list") {
  const run = (a) => {
    const r = spawnSync("git", a, { cwd: ROOT, stdio: "inherit" });
    if (r.status !== 0) process.exit(r.status ?? 1);
  };
  const gitCfg = (k) => {
    const r = spawnSync("git", ["config", "--get", k], { cwd: ROOT, encoding: "utf8" });
    return r.status === 0 ? String(r.stdout || "").trim() : "";
  };
  /* автор коміту обов'язковий — інакше git відмовиться (Author identity unknown) */
  if (!gitCfg("user.name") || !gitCfg("user.email")) {
    let login = "";
    try {
      const gh = spawnSync("gh", ["api", "user", "--jq", ".login"], { encoding: "utf8" });
      if (gh.status === 0) login = String(gh.stdout || "").trim();
    } catch {}
    if (!login) die("git не знає, хто ти. Виконай один раз: git config --global user.name <Ім'я> та git config --global user.email <пошта>");
    run(["config", "user.name", login]);
    run(["config", "user.email", `${login}@users.noreply.github.com`]);
    ok(`автограф у цьому репозиторії: ${login} <${login}@users.noreply.github.com>`);
  }
  run(["add", "library"]);
  run(["commit", "-m", `Спільна полиця: оновлено ${new Date().toLocaleDateString("uk")}`]);
  run(["push"]);
  ok("Запушено — через 1–2 хв GitHub Pages віддасть нові книги всім пристроям");
}
