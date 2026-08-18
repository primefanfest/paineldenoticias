import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const destino = new URL("../public/data/", import.meta.url);
const destinoImagens = new URL("images/", destino);
await mkdir(destino, { recursive: true });
await mkdir(destinoImagens, { recursive: true });
const limpar = (v = "") => v.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&");
const texto = (v = "") => limpar(v).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const resumo = (v = "") => texto(v).replace(/\s*O post .*? apareceu primeiro em .*$/i, "").replace(/\s*\[…\]\s*$/u, "…").trim();
const tag = (item, nome) => item.match(new RegExp(`<${nome}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${nome}>`, "i"))?.[1] ?? "";
const feeds = [["https://prefeitura.rio/feed/", "Prefeitura do Rio"], ["https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml", "Agência Brasil"], ["https://agenciabrasil.ebc.com.br/rss/internacional/feed.xml", "Agência Brasil"]];
const rioTermos = /\b(rio de janeiro|fluminense|carioca|niter[oó]i|baixada fluminense|maracan[aã]|copacabana|ipanema|tijuca|zona oeste|zona norte)\b/i;
const mundoTermos = /\b(internacional|mundo|estados unidos|eua|europa|[aá]sia|[aá]frica|onu|china|r[uú]ssia|ucr[aâ]nia|israel|gaza|argentina)\b/i;

function lerFeed(xml, source) {
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((r) => {
    const item = r[1], descricao = tag(item, "description"), conteudo = tag(item, "content:encoded");
    const image = item.match(/<(?:media:content|media:thumbnail|enclosure)[^>]+url=["']([^"']+)["']/i)?.[1] ?? limpar(conteudo).match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? limpar(descricao).match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? "";
    const publicada = new Date(texto(tag(item, "pubDate")));
    return { title: texto(tag(item, "title")), description: resumo(descricao).slice(0, 220), link: texto(tag(item, "link")), publishedAt: Number.isNaN(publicada.getTime()) ? "" : publicada.toISOString(), image: texto(image), source };
  }).filter((n) => n.title && n.link && !Number.isNaN(Date.parse(n.publishedAt)));
}

const imagemInvalida = (url = "") => !url || /logo|favicon|avatar|agenciabrasil\.svg|\/ebc\.png(?:\?|$)/i.test(url);
function imagensDaPagina(html = "") {
  const pagina = limpar(html);
  return [...new Set([
    ...[...pagina.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/gi)].map((r) => r[1]),
    ...[...pagina.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/gi)].map((r) => r[1]),
    ...[...pagina.matchAll(/<img[^>]+class=["'][^"']*(?:wp-post-image|attachment-post)[^"']*["'][^>]+src=["']([^"']+)["']/gi)].map((r) => r[1]),
    ...[...pagina.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]+class=["'][^"']*(?:wp-post-image|attachment-post)[^"']*["']/gi)].map((r) => r[1]),
  ].filter((url) => !imagemInvalida(url)))];
}
const escaparXml = (v = "") => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
async function criarArteReserva(noticia) {
  const nome = `${createHash("sha1").update(`reserva:${noticia.link}`).digest("hex").slice(0, 16)}.svg`;
  const titulo = escaparXml(noticia.title.split(" ").slice(0, 7).join(" "));
  const fonte = escaparXml(noticia.source.toUpperCase());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#101b29"/><stop offset="1" stop-color="#03070c"/></linearGradient><pattern id="p" width="42" height="42" patternUnits="userSpaceOnUse"><path d="M0 42 42 0" stroke="#1f3348" stroke-width="2" opacity=".35"/></pattern></defs><rect width="1200" height="675" fill="url(#g)"/><rect width="1200" height="675" fill="url(#p)"/><rect x="70" y="72" width="10" height="110" rx="5" fill="#ff1836"/><text x="112" y="110" fill="#ff1836" font-family="Arial,sans-serif" font-size="28" font-weight="700" letter-spacing="4">${fonte}</text><text x="112" y="166" fill="#fff" font-family="Arial,sans-serif" font-size="42" font-weight="700">${titulo}</text><circle cx="1060" cy="520" r="72" fill="none" stroke="#ff1836" stroke-width="12" opacity=".8"/><circle cx="1060" cy="520" r="34" fill="#ff1836" opacity=".25"/><text x="70" y="590" fill="#8fa0b3" font-family="Arial,sans-serif" font-size="24">IMAGEM NÃO FORNECIDA PELA FONTE</text></svg>`;
  await writeFile(new URL(nome, destinoImagens), svg);
  return { ...noticia, image: `/paineldenoticias/data/images/${nome}`, imageFallback: true };
}
async function baixarImagem(noticia) {
  let candidatas = [];
  try {
    const pagina = await fetch(noticia.link, { headers: { "User-Agent": "Mozilla/5.0 (NewsWall-Pro)" } });
    if (pagina.ok) candidatas = imagensDaPagina(await pagina.text());
  } catch { /* Tenta a imagem indicada diretamente no feed. */ }
  if (!imagemInvalida(noticia.image)) candidatas.push(noticia.image);
  for (const candidata of [...new Set(candidatas)]) try {
      const resposta = await fetch(candidata, { headers: { "User-Agent": "Mozilla/5.0 (NewsWall-Pro)", Referer: noticia.link } });
      const tipo = resposta.headers.get("content-type")?.split(";")[0] ?? "";
      if (!resposta.ok || !tipo.startsWith("image/")) continue;
      const bytes = new Uint8Array(await resposta.arrayBuffer());
      if (bytes.byteLength < 5000) continue;
      const extensao = tipo.includes("png") ? "png" : tipo.includes("webp") ? "webp" : "jpg";
      const nome = `${createHash("sha1").update(noticia.link).digest("hex").slice(0, 16)}.${extensao}`;
      await writeFile(new URL(nome, destinoImagens), bytes);
      return { ...noticia, image: `/paineldenoticias/data/images/${nome}`, imageFallback: false };
    } catch { /* Tenta a próxima imagem encontrada. */ }
  return criarArteReserva(noticia);
}

try {
  const respostas = await Promise.all(feeds.map(([url]) => fetch(url, { headers: { "User-Agent": "NewsWall-Pro/1.0" } })));
  const xmls = await Promise.all(respostas.map((r) => r.ok ? r.text() : ""));
  const todas = [...new Map(xmls.flatMap((xml, i) => lerFeed(xml, feeds[i][1])).map((n) => [n.link, n])).values()].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const rio = todas.filter((n) => n.source === "Prefeitura do Rio" || rioTermos.test(`${n.title} ${n.description}`));
  const mundo = todas.filter((n) => mundoTermos.test(`${n.title} ${n.description}`) && !rioTermos.test(`${n.title} ${n.description}`));
  const geral = todas.filter((n) => !rio.includes(n) && !mundo.includes(n));
  const hero = rio[0] ?? geral[0] ?? todas[0];
  if (!hero) throw new Error("feeds vazios");
  const selecionadas = [hero, ...[...rio.slice(1), ...geral].slice(0, 3), ...[...mundo, ...geral].slice(0, 3)];
  const [heroPronto, ...laterais] = await Promise.all(selecionadas.map(baixarImagem));
  await writeFile(new URL("news.json", destino), JSON.stringify({ updatedAt: new Date().toISOString(), hero: heroPronto, rio: laterais.slice(0, 3), world: laterais.slice(3, 6) }));
} catch (erro) { console.warn(`Notícias indisponíveis: ${erro}`); await writeFile(new URL("news.json", destino), "{}"); }

const ligas = [["bra.1", "BRASILEIRÃO SÉRIE A", 0], ["bra.copa_do_brazil", "COPA DO BRASIL", 1], ["conmebol.sudamericana", "SUL-AMERICANA", 2], ["conmebol.libertadores", "LIBERTADORES", 3], ["bra.2", "BRASILEIRÃO SÉRIE B", 99]];
const rj = /flamengo|vasco|fluminense|botafogo(?![- ]?sp)|volta redonda|america-rj|madureira|bangu|portuguesa-rj/i;
const escudos = { palmeiras: "palmeiras", flamengo: "flamengo", corinthians: "corinthians", "sao paulo": "sao-paulo", botafogo: "botafogo", fluminense: "fluminense", gremio: "gremio", vasco: "vasco", "vasco da gama": "vasco", "atletico mineiro": "atletico-mineiro", bahia: "bahia", internacional: "internacional", santos: "santos", "athletico paranaense": "athletico-paranaense", "athletico-pr": "athletico-paranaense", chapecoense: "chapecoense", coritiba: "coritiba", cruzeiro: "cruzeiro", mirassol: "mirassol", "mirassol-sp": "mirassol", "red bull bragantino": "red-bull-bragantino", bragantino: "red-bull-bragantino", remo: "remo", vitoria: "vitoria", "vitoria-ba": "vitoria" };
const normalizar = (nome) => nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const logo = (nome) => escudos[normalizar(nome)] ? `/paineldenoticias/crests/escudosweb/${escudos[normalizar(nome)]}.png` : "";
const chave = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
try {
  const inicio = new Date(); inicio.setDate(inicio.getDate() - 1); const fim = new Date(); fim.setDate(fim.getDate() + 21); const periodo = `${chave(inicio)}-${chave(fim)}`;
  const respostas = await Promise.all(ligas.map(([slug]) => fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${periodo}&limit=100`)));
  const dados = await Promise.all(respostas.map((r) => r.ok ? r.json() : { events: [] })); const limite = Date.now() - 4 * 60 * 60 * 1000;
  const todosOsJogos = dados.flatMap((d, i) => (d.events ?? []).map((evento) => {
    const times = evento.competitions?.[0]?.competitors ?? [], casa = times.find((t) => t.homeAway === "home")?.team ?? {}, fora = times.find((t) => t.homeAway === "away")?.team ?? {};
    const home = casa.displayName ?? "A definir", away = fora.displayName ?? "A definir";
    return { id: evento.id, competition: ligas[i][1], competitionPriority: ligas[i][2], home, homeCode: casa.abbreviation ?? home.slice(0, 3).toUpperCase(), homeLogo: logo(home), away, awayCode: fora.abbreviation ?? away.slice(0, 3).toUpperCase(), awayLogo: logo(away), dateTime: evento.date, state: evento.status?.type?.state ?? "pre", rjPriority: rj.test(`${home} ${away}`) ? 0 : 1 };
  })).filter((j) => j.dateTime && Date.parse(j.dateTime) >= limite);
  const ordenarJogos = (a, b) => a.rjPriority - b.rjPriority || Date.parse(a.dateTime) - Date.parse(b.dateTime);
  const ateSeteDias = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const destaquesPorCampeonato = ligas
    .filter(([, , prioridade]) => prioridade < 99)
    .sort((a, b) => a[2] - b[2])
    .map(([, nome]) => todosOsJogos.filter((j) => j.competition === nome && Date.parse(j.dateTime) <= ateSeteDias).sort(ordenarJogos)[0])
    .filter(Boolean);
  const idsEscolhidos = new Set(destaquesPorCampeonato.map((j) => j.id));
  const complementares = todosOsJogos
    .filter((j) => !idsEscolhidos.has(j.id))
    .sort((a, b) => a.rjPriority - b.rjPriority || Number(a.competitionPriority === 99) - Number(b.competitionPriority === 99) || Date.parse(a.dateTime) - Date.parse(b.dateTime) || a.competitionPriority - b.competitionPriority);
  const matches = [...destaquesPorCampeonato, ...complementares].slice(0, 4);
  await writeFile(new URL("football.json", destino), JSON.stringify({ matches, updatedAt: new Date().toISOString(), source: "ESPN", crestSource: "EscudosWeb" }));
} catch (erro) { console.warn(`Agenda indisponível: ${erro}`); await writeFile(new URL("football.json", destino), "{}"); }
