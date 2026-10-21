import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { join, delimiter } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";
const execute = promisify(execFile);

async function supportedJava(command, environment) {
  try {
    const { stdout, stderr } = await execute(command, ["-version"], { env: environment });
    const version = `${stdout}\n${stderr}`.match(/version "(\d+)/);
    return version && Number(version[1]) >= 21;
  } catch { return false; }
}

/** Prefer installed Java. Otherwise cache a portable JRE; no OS settings change. */
export async function demoJavaEnvironment(root) {
  if (await supportedJava("java", process.env)) return { ...process.env };
  const cache = join(root, ".cache", "demo-java");
  const marker = join(cache, "java-home.json");
  const environment = home => ({ ...process.env, JAVA_HOME: home, PATH: `${join(home, "bin")}${delimiter}${process.env.PATH}` });
  try {
    const home = JSON.parse(await readFile(marker, "utf8")).home;
    if (await supportedJava(join(home, "bin", "java"), environment(home))) return environment(home);
  } catch { /* First run or removed cache: resolve a portable runtime below. */ }

  const os = { darwin: "mac", linux: "linux" }[process.platform];
  const architecture = { arm64: "aarch64", x64: "x64" }[process.arch];
  if (!os || !architecture) throw new Error("Java 21以上をインストールし、javaをPATHへ追加してから再実行してください。");
  console.log("デモ用のJava 21をプロジェクト内へ準備します（初回のみダウンロード）。");
  await mkdir(cache, { recursive: true });
  const metadata = await fetch(`https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=${architecture}&image_type=jre&os=${os}&vendor=eclipse`, { signal: AbortSignal.timeout(60000) });
  if (!metadata.ok) throw new Error(`Java metadata download failed: ${metadata.status}`);
  const assets = await metadata.json();
  const archiveInfo = assets[0]?.binary?.package;
  if (!archiveInfo?.link || !archiveInfo.checksum) throw new Error("Portable Java information was not found.");
  const archive = join(cache, "runtime.tar.gz");
  const response = await fetch(archiveInfo.link, { signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error(`Java download failed: ${response.status}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(archive));
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(archive)) hash.update(chunk);
  if (hash.digest("hex") !== archiveInfo.checksum.toLowerCase()) throw new Error("Java archive checksum did not match.");
  const unpacked = join(cache, "unpacked");
  await mkdir(unpacked, { recursive: true });
  await execute("tar", ["-xzf", archive, "-C", unpacked]);
  for (const entry of await readdir(unpacked, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const home = join(unpacked, entry.name, ...(os === "mac" ? ["Contents", "Home"] : []));
    if (await supportedJava(join(home, "bin", "java"), environment(home))) {
      await writeFile(marker, JSON.stringify({ home }, null, 2) + "\n");
      return environment(home);
    }
  }
  throw new Error("Downloaded Java runtime could not be started.");
}
