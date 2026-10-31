import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const website = fileURLToPath(new URL("../", import.meta.url));
const root = path.join(website, "out");
const { basePath } = JSON.parse(await readFile(path.join(website, ".next/site-build.json"), "utf8"));
const port = Number(process.env.PORT ?? 4175);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".wasm": "application/wasm", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".glb": "model/gltf-binary" };

http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    if (basePath && ["/", basePath].includes(url.pathname)) {
      response.writeHead(302, { Location: `${basePath}/` });
      response.end();
      return;
    }
    if (basePath && !url.pathname.startsWith(`${basePath}/`)) throw new Error("Not found");
    const pathname = decodeURIComponent(url.pathname.slice(basePath.length));
    let file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(`${root}${path.sep}`) && file !== root) throw new Error("Not found");
    if ((await stat(file)).isDirectory()) {
      if (!url.pathname.endsWith("/")) {
        response.writeHead(301, { Location: `${url.pathname}/${url.search}` });
        response.end();
        return;
      }
      file = path.join(file, "index.html");
    }
    const content = await readFile(file);
    response.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream", "Cache-Control": "no-cache" });
    response.end(content);
  } catch {
    response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    response.end(await readFile(path.join(root, "404.html"), "utf8").catch(() => "Not found"));
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`Static preview: http://localhost:${port}${basePath}/`);
});
