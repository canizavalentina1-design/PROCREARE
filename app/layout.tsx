import type { ReactNode } from "react";
import "./globals.css";
export const metadata = { title: "PROCREARE" };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="es-PY"><body>{children}</body></html>;
}
