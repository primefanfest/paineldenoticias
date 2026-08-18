"use client";

import { useEffect, useState } from "react";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => `${BASE_PATH}${path}`;

const fallbackRioNews = [
  { title: "Rio amplia áreas de convivência e lazer à beira-mar", age: "há 15 min", image: "rio-one" },
  { title: "Mobilidade ganha operação especial nas principais vias", age: "há 42 min", image: "rio-two" },
  { title: "Agenda cultural movimenta a cidade neste fim de semana", age: "há 1 hora", image: "rio-three" },
];

const fallbackWorldNews = [
  { title: "Líderes retomam diálogo sobre novos acordos climáticos", age: "há 20 min", image: "world-one" },
  { title: "Mercados acompanham resultados globais", age: "há 50 min", image: "world-two" },
  { title: "Tecnologia abre uma nova era de serviços digitais", age: "há 1 hora", image: "world-three" },
];

const fallbackMatches = [
  { competition: "BRASILEIRÃO SÉRIE A", home: "Flamengo", homeCode: "FLA", homeLogo: asset("/crests/escudosweb/flamengo.png"), away: "Palmeiras", awayCode: "PAL", awayLogo: asset("/crests/escudosweb/palmeiras.png"), date: "HOJE", time: "21:30", tone: "flamengo" },
  { competition: "COPA DO BRASIL", home: "Vasco", homeCode: "VAS", homeLogo: asset("/crests/escudosweb/vasco.png"), away: "Bahia", awayCode: "BAH", awayLogo: asset("/crests/escudosweb/bahia.png"), date: "QUARTA", time: "19:00", tone: "vasco" },
  { competition: "LIBERTADORES", home: "Fluminense", homeCode: "FLU", homeLogo: asset("/crests/escudosweb/fluminense.png"), away: "River Plate", awayCode: "RIV", date: "QUINTA", time: "21:30", tone: "fluminense" },
  { competition: "BRASILEIRÃO SÉRIE B", home: "Volta Redonda", homeCode: "VRF", away: "Avaí", awayCode: "AVA", date: "SÁBADO", time: "16:00", tone: "volta" },
];

type WeatherDay = { label: string; icon: string; condition: string; max: number; min: number; current?: number };
type DollarQuote = { value: number; variation: number; updated: string };
type NewsStory = { title: string; description?: string; age?: string; image?: string; publishedAt?: string; source?: string; link?: string };
type FootballMatch = { id?: string; competition: string; home: string; homeCode: string; homeLogo?: string; away: string; awayCode: string; awayLogo?: string; date?: string; time?: string; dateTime?: string; state?: string; tone?: string };

const fallbackWeather: WeatherDay[] = [
  { label: "HOJE", icon: "☀", condition: "Ensolarado", current: 27, max: 29, min: 21 },
  { label: "AMANHÃ", icon: "⛅", condition: "Parcialmente nublado", max: 28, min: 20 },
  { label: "DEPOIS", icon: "🌦", condition: "Pancadas de chuva", max: 26, min: 19 },
];

function weatherInfo(code: number) {
  if (code === 0) return { icon: "☀", condition: "Céu limpo" };
  if (code <= 3) return { icon: "⛅", condition: "Parcialmente nublado" };
  if (code <= 48) return { icon: "☁", condition: "Nublado" };
  if (code <= 67) return { icon: "🌦", condition: "Chuva" };
  if (code <= 77) return { icon: "🌨", condition: "Precipitação" };
  if (code <= 82) return { icon: "🌧", condition: "Pancadas de chuva" };
  return { icon: "⛈", condition: "Trovoadas" };
}

function relativeTime(publishedAt?: string) {
  if (!publishedAt) return "agora";
  const minutes = Math.max(1, Math.floor((Date.now() - Date.parse(publishedAt)) / 60000));
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.floor(hours / 24);
  return `há ${days} ${days === 1 ? "dia" : "dias"}`;
}

function NewsList({ items }: { items: NewsStory[] }) {
  return <div className="broadcast-list">{items.map((item) => (
    <article className="broadcast-card" key={item.title}>
      <div className={`broadcast-thumb ${item.image || "news-live"}`} style={item.image ? { backgroundImage: `url(${item.image.startsWith("http") || item.image.startsWith(BASE_PATH) ? item.image : asset(item.image)})` } : undefined} />
      <div><h3>{item.title}</h3><p><span className="clock-icon">◷</span> {item.age ?? relativeTime(item.publishedAt)} <b>• {item.source ?? "NewsWall"}</b></p></div>
    </article>
  ))}</div>;
}

function matchDate(dateTime?: string, fallback?: string) {
  if (!dateTime) return fallback ?? "EM BREVE";
  const date = new Date(dateTime);
  const today = new Date();
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  const key = date.toLocaleDateString("pt-BR");
  if (key === today.toLocaleDateString("pt-BR")) return "HOJE";
  if (key === tomorrow.toLocaleDateString("pt-BR")) return "AMANHÃ";
  return date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).replace(".", "").toUpperCase();
}
function teamTone(name: string) {
  const value = name.toLowerCase();
  if (value.includes("flamengo")) return "flamengo";
  if (value.includes("vasco")) return "vasco";
  if (value.includes("fluminense")) return "fluminense";
  if (value.includes("volta redonda")) return "volta";
  return "opponent";
}

function FootballPanel({ matches, live }: { matches: FootballMatch[]; live: boolean }) {
  return <section className="football-panel">
    <div className="football-heading"><div><span>⚽ AGENDA</span><h2>Futebol em destaque</h2></div><small>PRIORIDADE RJ</small></div>
    <div className="match-list">{matches.map((match) => (
      <article className="match-card" key={`${match.home}-${match.away}`}>
        <div className="match-competition">{match.competition}</div>
        <div className="match-body">
          <div className="match-team home-team"><b className={`team-mark ${match.homeLogo ? "has-logo" : ""} ${match.tone ?? teamTone(match.home)}`}><span>{match.homeCode}</span>{match.homeLogo && <img src={match.homeLogo} alt="" onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.parentElement?.classList.remove("has-logo"); }} />}</b><strong>{match.home}</strong></div>
          <div className="match-time"><small>{match.state === "in" ? "EM ANDAMENTO" : matchDate(match.dateTime, match.date)}</small><b>{match.dateTime ? new Date(match.dateTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : match.time}</b></div>
          <div className="match-team away-team"><b className={`team-mark ${match.awayLogo ? "has-logo" : ""} ${teamTone(match.away)}`}><span>{match.awayCode}</span>{match.awayLogo && <img src={match.awayLogo} alt="" onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.parentElement?.classList.remove("has-logo"); }} />}</b><strong>{match.away}</strong></div>
        </div>
      </article>
    ))}</div>
    <div className="football-note">Horários de Brasília • Agenda ESPN • Escudos HD EscudosWeb</div>
  </section>;
}

export default function Home() {
  const [now, setNow] = useState<Date | null>(null);
  const [online, setOnline] = useState(true);
  const [sidebarMode, setSidebarMode] = useState<"news" | "football">("news");
  const [weather, setWeather] = useState<WeatherDay[]>(fallbackWeather);
  const [dollar, setDollar] = useState<DollarQuote>({ value: 5.20, variation: -0.42, updated: "ÚLTIMO BOLETIM" });
  const [hero, setHero] = useState<NewsStory>({ title: "Rio se transforma com novos espaços de lazer e convivência", description: "Projetos valorizam a paisagem, aproximam moradores da cidade e renovam áreas públicas.", age: "há 25 min", source: "NewsWall Pro" });
  const [heroImage, setHeroImage] = useState(asset("/rio-hero.webp"));
  const [heroImageIsFallback, setHeroImageIsFallback] = useState(true);
  const [rioNews, setRioNews] = useState<NewsStory[]>(fallbackRioNews);
  const [worldNews, setWorldNews] = useState<NewsStory[]>(fallbackWorldNews);
  const [newsUpdated, setNewsUpdated] = useState("CONTEÚDO DE RESERVA");
  const [footballMatches, setFootballMatches] = useState<FootballMatch[]>(fallbackMatches);
  const [footballLive, setFootballLive] = useState(false);

  useEffect(() => {
    const loadFootball = async () => {
      try {
        const response = await fetch(asset("/data/football.json"), { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!data.matches?.length) return;
        setFootballMatches(data.matches); setFootballLive(true);
      } catch { /* Mantém a agenda de reserva. */ }
    };
    loadFootball();
    const timer = window.setInterval(loadFootball, 15 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!hero.image) { setHeroImage(asset("/rio-hero.webp")); setHeroImageIsFallback(true); return; }
    const resolvedImage = hero.image.startsWith("http") || hero.image.startsWith(BASE_PATH) ? hero.image : asset(hero.image);
    const candidate = new Image();
    candidate.onload = () => { setHeroImage(resolvedImage); setHeroImageIsFallback(false); };
    candidate.onerror = () => { setHeroImage(asset("/rio-hero.webp")); setHeroImageIsFallback(true); };
    candidate.src = resolvedImage;
    return () => { candidate.onload = null; candidate.onerror = null; };
  }, [hero.image]);

  useEffect(() => {
    const loadNews = async () => {
      try {
        const response = await fetch(asset("/data/news.json"), { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!data.hero || !data.rio?.length || !data.world?.length) return;
        setHero(data.hero); setRioNews(data.rio); setWorldNews(data.world);
        setNewsUpdated(`ATUALIZADO ${new Date(data.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`);
      } catch { /* Mantém as manchetes de reserva. */ }
    };
    loadNews();
    const timer = window.setInterval(loadNews, 10 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const formatDate = (date: Date) => `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}-${date.getFullYear()}`;
    const loadDollar = async () => {
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 10);
        const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='${formatDate(start)}'&@dataFinalCotacao='${formatDate(end)}'&%24orderby=dataHoraCotacao%20desc&%24format=json`;
        const response = await fetch(url);
        if (!response.ok) return;
        const data = await response.json();
        if (!data.value?.length) return;
        const latest = data.value[0];
        const previous = data.value[1] ?? latest;
        const variation = ((latest.cotacaoVenda / previous.cotacaoVenda) - 1) * 100;
        const time = latest.dataHoraCotacao.slice(11, 16);
        setDollar({ value: latest.cotacaoVenda, variation, updated: `ATUALIZADO ${time}` });
      } catch { /* Mantém a última cotação conhecida. */ }
    };
    loadDollar();
    const timer = window.setInterval(loadDollar, 30 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setSidebarMode((mode) => mode === "news" ? "football" : "news"), 14000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadWeather = async () => {
      try {
        const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=-22.9068&longitude=-43.1729&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=America%2FSao_Paulo&forecast_days=3");
        if (!response.ok) return;
        const data = await response.json();
        const labels = ["HOJE", "AMANHÃ", "DEPOIS"];
        setWeather(labels.map((label, index) => {
          const info = weatherInfo(data.daily.weather_code[index]);
          return { label, ...info, max: Math.round(data.daily.temperature_2m_max[index]), min: Math.round(data.daily.temperature_2m_min[index]), ...(index === 0 ? { current: Math.round(data.current.temperature_2m) } : {}) };
        }));
      } catch { /* Mantém a previsão de reserva para a TV. */ }
    };
    loadWeather();
    const timer = window.setInterval(loadWeather, 30 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const connected = () => setOnline(true);
    const disconnected = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", connected);
    window.addEventListener("offline", disconnected);
    const refresh = window.setInterval(() => window.location.reload(), 6 * 60 * 60 * 1000);
    return () => {
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", disconnected);
      window.clearInterval(refresh);
    };
  }, []);

  const time = now?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) ?? "--:--";
  const date = now?.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) ?? "";

  return (
    <main className="broadcast-shell">
      <header className="broadcast-header">
        <div className="weather-block">
          <div className="weather-location"><span>●</span><strong>RIO DE JANEIRO</strong><small>{online ? "ATUALIZADO" : "SEM CONEXÃO"}</small></div>
          <div className="weather-days">{weather.map((day) => <article className="weather-day" key={day.label}>
            <span className="weather-icon">{day.icon}</span>
            <div><small>{day.label}</small><strong>{day.current ?? day.max}°</strong><p>{day.condition}</p></div>
            <b>{day.max}° <i>{day.min}°</i></b>
          </article>)}</div>
        </div>
        <div className="dollar-card">
          <div><span>USD / BRL</span><small>PTAX VENDA • BCB</small></div>
          <strong>R${dollar.value.toFixed(2).replace(".", ",")}</strong>
          <div className={dollar.variation >= 0 ? "quote-up" : "quote-down"}><b>{dollar.variation >= 0 ? "▲" : "▼"} {Math.abs(dollar.variation).toFixed(2).replace(".", ",")}%</b><small>{dollar.updated}</small></div>
        </div>
      </header>

      <section className="broadcast-main">
        <article className="broadcast-hero">
          <div className={`broadcast-hero-media ${heroImageIsFallback ? "is-fallback" : "is-news-photo"}`} aria-hidden="true">
            <div className="broadcast-hero-backdrop" style={{ backgroundImage: `url(${JSON.stringify(heroImage)})` }} />
            <div className="broadcast-hero-photo" style={{ backgroundImage: `url(${JSON.stringify(heroImage)})` }} />
            <div className="broadcast-hero-shade" />
          </div>
          <div className="broadcast-hero-copy">
            <span className="broadcast-label">DESTAQUE</span>
            <h1>{hero.title}</h1>
            <p>{hero.description || "Acompanhe as principais informações do Rio de Janeiro."}</p>
            <div className="broadcast-meta"><span>◷ {(hero.age ?? relativeTime(hero.publishedAt)).toUpperCase()}</span><b>•</b><span>▦ {hero.source?.toUpperCase() ?? "AGÊNCIA BRASIL"}</span><b>•</b><strong>● RIO DE JANEIRO</strong>{heroImageIsFallback && <em>IMAGEM ILUSTRATIVA</em>}</div>
          </div>
        </article>

        <aside className={`broadcast-sidebar sidebar-${sidebarMode}`}>
          <div className="sidebar-tabs"><span className={sidebarMode === "news" ? "active" : ""}>NOTÍCIAS</span><span className={sidebarMode === "football" ? "active" : ""}>FUTEBOL</span></div>
          {sidebarMode === "news" ? <div className="news-mode">
            <section className="broadcast-section">
              <h2><span className="pin">●</span> RIO DE JANEIRO</h2>
              <NewsList items={rioNews} />
            </section>
            <section className="broadcast-section">
              <h2><span className="globe">◉</span> MUNDO</h2>
              <NewsList items={worldNews} />
            </section>
          </div> : <FootballPanel matches={footballMatches} live={footballLive} />}
        </aside>
      </section>

      <footer className="broadcast-footer">
        <div className="breaking"><span>BREAKING</span><strong>NEWS</strong></div>
        <div className="broadcast-ticker"><p>{newsUpdated} • {hero.title} • {rioNews.map((story) => story.title).join(" • ")}</p></div>
        <div className="broadcast-clock"><strong>{time}</strong><span>{date}</span></div>
      </footer>
    </main>
  );
}
