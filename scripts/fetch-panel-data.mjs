import { mkdir, writeFile } from "node:fs/promises";

const origem = "https://newswall-pro-marcio.metachieve.chatgpt.site";
const destino = new URL("../public/data/", import.meta.url);
await mkdir(destino, { recursive: true });

for (const nome of ["news", "football"]) {
  try {
    const resposta = await fetch(`${origem}/api/${nome}`, { headers: { "User-Agent": "NewsWall-GitHub-Pages/1.0" } });
    if (!resposta.ok) throw new Error(`${resposta.status}`);
    await writeFile(new URL(`${nome}.json`, destino), JSON.stringify(await resposta.json()));
  } catch (erro) {
    console.warn(`Não foi possível atualizar ${nome}: ${erro}. Será usado o conteúdo de reserva do painel.`);
    await writeFile(new URL(`${nome}.json`, destino), JSON.stringify({}));
  }
}
