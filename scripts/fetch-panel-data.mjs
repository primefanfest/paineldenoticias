import { mkdir, writeFile } from "node:fs/promises";

const destino = new URL("../public/data/", import.meta.url);
await mkdir(destino, { recursive: true });
const limpar = (v = "") => v.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&");
const texto = (v = "") => limpar(v).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const tag = (item, nome) => item.match(new RegExp(`<${nome}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${nome}>`, "i"))?.[1] ?? "";
const feeds = [["https://prefeitura.rio/feed/", "Prefeitura do Rio"], ["https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml", "Agência Brasil"], ["https://agenciabrasil.ebc.com.br/rss/internacional/feed.xml", "Agência Brasil"]];
const rioTermos = /\b(rio de janeiro|fluminense|carioca|niter[oó]i|baixada fluminense|maracan[aã]|copacabana|ipanema|tijuca|zona oeste|zona norte)\b/i;
const mundoTermos = /\b(internacional|mundo|estados unidos|eua|europa|[aá]sia|[aá]frica|onu|china|r[uú]ssia|ucr[aâ]nia|israel|gaza|argentina)\b/i;

function lerFeed(xml, source) {
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((r) => {
    const item = r[1], descricao = tag(item, "description"), conteudo = tag(item, "content:encoded");
    const image = item.match(/<(?:media:content|media:thumbnail|enclosure)[^>]+url=["']([^"']+)["']/i)?.[1] ?? limpar(conteudo).match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? limpar(descricao).match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? "";
    const publicada = new Date(texto(tag(item, "pubDate")));
    return { title: texto(tag(item, "title")), description: texto(descricao).slice(0, 220), link: texto(tag(item, "link")), publishedAt: Number.isNaN(publicada.getTime()) ? "" : publicada.toISOString(), image: texto(image), source };
  }).filter((n) => n.title && n.link && !Number.isNaN(Date.parse(n.publishedAt)));
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
  await writeFile(new URL("news.json", destino), JSON.stringify({ updatedAt: new Date().toISOString(), hero, rio: [...rio.slice(1), ...geral].slice(0, 3), world: [...mundo, ...geral].slice(0, 3) }));
} catch (erro) { console.warn(`Notícias indisponíveis: ${erro}`); await writeFile(new URL("news.json", destino), "{}"); }

const ligas = [["bra.1", "BRASILEIRÃO SÉRIE A", 0], ["bra.copa_do_brazil", "COPA DO BRASIL", 1], ["conmebol.sudamericana", "SUL-AMERICANA", 2], ["conmebol.libertadores", "LIBERTADORES", 3], ["bra.2", "BRASILEIRÃO SÉRIE B", 99]];
const rj = /flamengo|vasco|fluminense|botafogo|volta redonda|america-rj|madureira|bangu|portuguesa-rj/i;
const escudos = { palmeiras: "palmeiras", flamengo: "flamengo", corinthians: "corinthians", "sao paulo": "sao-paulo", botafogo: "botafogo", fluminense: "fluminense", gremio: "gremio", vasco: "vasco", "vasco da gama": "vasco", "atletico mineiro": "atletico-mineiro", bahia: "bahia", internacional: "internacional", santos: "santos", "athletico paranaense": "athletico-paranaense", "athletico-pr": "athletico-paranaense", chapecoense: "chapecoense", coritiba: "coritiba", cruzeiro: "cruzeiro", mirassol: "mirassol", "mirassol-sp": "mirassol", "red bull bragantino": "red-bull-bragantino", bragantino: "red-bull-bragantino", remo: "remo", vitoria: "vitoria", "vitoria-ba": "vitoria" };
const normalizar = (nome) => nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const logo = (nome) => escudos[normalizar(nome)] ? `/paineldenoticias/crests/escudosweb/${escudos[normalizar(nome)]}.png` : "";
const chave = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
try {
  const inicio = new Date(); inicio.setDate(inicio.getDate() - 1); const fim = new Date(); fim.setDate(fim.getDate() + 21); const periodo = `${chave(inicio)}-${chave(fim)}`;
  const respostas = await Promise.all(ligas.map(([slug]) => fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${periodo}&limit=100`)));
  const dados = await Promise.all(respostas.map((r) => r.ok ? r.json() : { events: [] })); const limite = Date.now() - 4 * 60 * 60 * 1000;
  const matches = dados.flatMap((d, i) => (d.events ?? []).map((evento) => {
    const times = evento.competitions?.[0]?.competitors ?? [], casa = times.find((t) => t.homeAway === "home")?.team ?? {}, fora = times.find((t) => t.homeAway === "away")?.team ?? {};
    const home = casa.displayName ?? "A definir", away = fora.displayName ?? "A definir";
    return { id: evento.id, competition: ligas[i][1], competitionPriority: ligas[i][2], home, homeCode: casa.abbreviation ?? home.slice(0, 3).toUpperCase(), homeLogo: logo(home), away, awayCode: fora.abbreviation ?? away.slice(0, 3).toUpperCase(), awayLogo: logo(away), dateTime: evento.date, state: evento.status?.type?.state ?? "pre", rjPriority: rj.test(`${home} ${away}`) ? 0 : 1 };
  })).filter((j) => j.dateTime && Date.parse(j.dateTime) >= limite).sort((a, b) => a.rjPriority - b.rjPriority || a.competitionPriority - b.competitionPriority || Date.parse(a.dateTime) - Date.parse(b.dateTime)).slice(0, 4);
  await writeFile(new URL("football.json", destino), JSON.stringify({ matches, updatedAt: new Date().toISOString(), source: "ESPN", crestSource: "EscudosWeb" }));
} catch (erro) { console.warn(`Agenda indisponível: ${erro}`); await writeFile(new URL("football.json", destino), "{}"); }
