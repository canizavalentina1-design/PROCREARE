import type { ReactNode } from "react";
import { AppSidebar } from "../../src/components/AppSidebar";
import "../animales/animals-layout.css";
export default function LaboratoryLayout({ children }: { children: ReactNode }) { return <div className="module-layout"><AppSidebar active="/laboratorio" />{children}</div>; }
