import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const usuario = process.env.ESCUDOSWEB_USUARIO;
const senha = process.env.ESCUDOSWEB_SENHA;
if (!usuario || !senha) throw new Error("Cadastre ESCUDOSWEB_USUARIO e ESCUDOSWEB_SENHA nos Secrets do GitHub.");

const raiz = process.cwd();
const downloads = path.join(raiz, "downloads");
const destino = path.join(raiz, "assets", "escudos");
const linhas = (await readFile(path.join(raiz, "config", "pacotes.txt"), "utf8"))
  .split(/\r?\n/).map((linha) => linha.trim()).filter((linha) => linha && !linha.startsWith("#"));

await rm(downloads, { recursive: true, force: true });
await mkdir(downloads, { recursive: true });
await mkdir(destino, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ acceptDownloads: true, locale: "pt-BR" });
const page = await context.newPage();

async function preencherPrimeiro(seletores, valor) {
  for (const seletor of seletores) {
    const campo = page.locator(seletor).first();
    if (await campo.count()) { await campo.fill(valor); return true; }
  }
  return false;
}

try {
  await page.goto("https://www.escudosweb.com", { waitUntil: "domcontentloaded" });
  const abrirAcesso = page.getByText(/logar\s*\/\s*registrar/i).first();
  if (!await abrirAcesso.count()) throw new Error("O botão de acesso do EscudosWeb não foi encontrado.");
  await abrirAcesso.click();
  await page.locator('input[type="email"], input[name="email"], input[type="password"]').first().waitFor({ timeout: 15000 });
  const usuarioOk = await preencherPrimeiro([
    'input[type="email"]', 'input[name="email"]', 'input[name="usuario"]', 'input[name="username"]'
  ], usuario);
  const senhaOk = await preencherPrimeiro(['input[type="password"]', 'input[name="password"]', 'input[name="senha"]'], senha);
  if (!usuarioOk || !senhaOk) throw new Error("O formulário de acesso do EscudosWeb mudou.");
  await page.locator('button[type="submit"], input[type="submit"]').first().click();
  await page.waitForTimeout(2500);
  if (await page.locator('input[type="password"]').count()) {
    throw new Error("O EscudosWeb não aceitou o acesso automático. Verifique os Secrets ou uma eventual validação adicional.");
  }

  for (const url of linhas) {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const baixar = page.getByText(/baixar todos/i).first();
    if (!await baixar.count()) throw new Error(`Botão “Baixar todos” não encontrado em ${url}`);
    const download = await Promise.all([page.waitForEvent("download"), baixar.click()]).then(([arquivo]) => arquivo);
    const nome = download.suggestedFilename() || `${new URL(url).pathname.split("/").filter(Boolean).pop()}.zip`;
    await download.saveAs(path.join(downloads, nome));
  }
} finally {
  await browser.close();
}

for (const arquivo of await readdir(downloads)) {
  if (!arquivo.toLowerCase().endsWith(".zip")) continue;
  execFileSync("unzip", ["-o", path.join(downloads, arquivo), "-d", destino], { stdio: "inherit" });
}

const extensoes = new Set([".png", ".webp", ".jpg", ".jpeg"]);
const catalogo = [];
async function visitar(pasta) {
  for (const nome of await readdir(pasta)) {
    const atual = path.join(pasta, nome);
    const info = await stat(atual);
    if (info.isDirectory()) { await visitar(atual); continue; }
    if (!extensoes.has(path.extname(nome).toLowerCase())) continue;
    const bytes = await readFile(atual);
    const hash = createHash("sha256").update(bytes).digest("hex");
    catalogo.push({ arquivo: path.relative(raiz, atual), nome: path.parse(nome).name, sha256: hash, bytes: bytes.length });
  }
}
await visitar(destino);
catalogo.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
await writeFile(path.join(raiz, "catalogo.json"), JSON.stringify({ atualizadoEm: new Date().toISOString(), total: catalogo.length, escudos: catalogo }, null, 2));
console.log(`${catalogo.length} escudos catalogados.`);
