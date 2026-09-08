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
let page = await context.newPage();

async function preencherPrimeiro(seletores, valor) {
  for (const frame of page.frames()) {
    for (const seletor of seletores) {
      const campo = frame.locator(seletor).first();
      if (await campo.count() && await campo.isVisible()) {
        await campo.fill(valor);
        return frame;
      }
    }
  }
  return null;
}

async function clicarPrimeiro(nomes) {
  for (const frame of page.frames()) {
    for (const nome of nomes) {
      const botao = frame.getByRole("button", { name: nome }).first();
      if (await botao.count() && await botao.isVisible()) {
        await botao.click();
        return true;
      }
    }
  }
  return false;
}

async function esperarCampo(seletores, valor, timeout = 15000) {
  const limite = Date.now() + timeout;
  while (Date.now() < limite) {
    const frame = await preencherPrimeiro(seletores, valor);
    if (frame) return frame;
    await page.waitForTimeout(500);
  }
  return null;
}

async function salvarDiagnostico() {
  await mkdir(path.join(raiz, "diagnostico"), { recursive: true });
  await page.screenshot({ path: path.join(raiz, "diagnostico", "escudosweb.png"), fullPage: true });
  await writeFile(path.join(raiz, "diagnostico", "escudosweb.html"), await page.content());
}

try {
  await page.goto("https://www.escudosweb.com", { waitUntil: "domcontentloaded" });
  const abrirAcesso = page.getByRole("button", { name: /logar\s*\/\s*registrar|entrar|acessar/i }).first();
  await abrirAcesso.waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(5000);
  const paginasAntes = new Set(context.pages());
  await abrirAcesso.click();
  await page.waitForTimeout(1500);
  const novaPagina = context.pages().find((pagina) => !paginasAntes.has(pagina));
  if (novaPagina) {
    page = novaPagina;
    await page.waitForLoadState("domcontentloaded");
  }
  for (const frame of page.frames()) {
    const usarEmail = frame.getByText(/(?:entrar|continuar|login|acessar).*e-?mail|e-?mail.*(?:entrar|continuar|login|acessar)/i).first();
    if (await usarEmail.count() && await usarEmail.isVisible()) {
      await usarEmail.click();
      await page.waitForTimeout(750);
      break;
    }
  }
  const usuarioOk = await esperarCampo([
    'input[type="email"]', 'input[name="email"]', 'input[name="usuario"]',
    'input[name="username"]', 'input[autocomplete="username"]',
    'input[autocomplete="email"]', 'input[aria-label*="mail" i]', 'input[placeholder*="mail" i]'
  ], usuario);
  if (!usuarioOk) throw new Error("O campo de e-mail do EscudosWeb não foi encontrado.");
  const seletoresSenha = [
    'input[type="password"]', 'input[name="password"]', 'input[name="senha"]',
    'input[autocomplete="current-password"]', 'input[aria-label*="senha" i]', 'input[placeholder*="senha" i]'
  ];
  let senhaOk = await preencherPrimeiro(seletoresSenha, senha);
  if (!senhaOk) {
    const avancou = await clicarPrimeiro([/continuar/i, /próximo/i, /avançar/i, /entrar/i]);
    if (!avancou) await page.keyboard.press("Enter");
    senhaOk = await esperarCampo(seletoresSenha, senha);
  }
  if (!senhaOk) throw new Error("O campo de senha do EscudosWeb não foi encontrado.");
  const enviou = await clicarPrimeiro([/entrar/i, /login/i, /acessar/i]);
  if (!enviou) await page.keyboard.press("Enter");
  await page.waitForTimeout(3500);
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
} catch (erro) {
  await salvarDiagnostico();
  throw erro;
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
