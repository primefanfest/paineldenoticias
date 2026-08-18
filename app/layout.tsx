import type { Metadata } from "next";
import "./globals.css";
import "./effects.css";
import "./signage.css";
import "./broadcast.css";
import "./sports.css";
import "./weather.css";
import "./dollar.css";

export const metadata: Metadata = {
  title: "NewsWall Pro — Central de Notícias",
  description: "Painel de notícias em tempo real para TV e digital signage.",
  openGraph: { title: "NewsWall Pro", description: "Central de notícias para TV." },
  twitter: { card: "summary_large_image", title: "NewsWall Pro", description: "Central de notícias para TV." },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
