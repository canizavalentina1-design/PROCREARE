import type { ReactNode } from "react";
import { AppSidebar } from "../../src/components/AppSidebar";
import "../animales/animals-layout.css";
export default function ReportsLayout({ children }: { children: ReactNode }) { return <div className="module-layout"><AppSidebar active="/reportes" />{children}</div>; }
