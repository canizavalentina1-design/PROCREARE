import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "PROCREARE", description: "Gestión ganadera para Paraguay" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="es-PY"><body>{children}</body></html>;
}
