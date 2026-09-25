/* postbuild: статична полиця має потрапляти в dist,
 * інакше на хостингах без побудови-з-кореня (Cloudflare Pages тощо)
 * книги зникнуть — там деплоїться тільки вміст dist/. */
import { cpSync, existsSync } from "node:fs";

if (existsSync("library")) {
  cpSync("library", "dist/library", { recursive: true });
  console.log("postbuild: library/ → dist/library ✓");
} else {
  console.log("postbuild: library/ немає — пропускаю");
}
