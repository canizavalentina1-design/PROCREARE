import type { ReactNode } from "react";
import { AppSidebar } from "../../src/components/AppSidebar";
import "./animals-layout.css";
export default function AnimalsLayout({ children }: { children: ReactNode }) { return <div className="module-layout"><AppSidebar active="/animales" />{children}</div>; }
