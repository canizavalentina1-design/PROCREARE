"use client";
import "./gestion.css";
const modules = [
  ["/animales-masivo", "Acciones masivas", "Selecciona cientos de animales y aplica cambios en lote."],
  ["/animales", "Animales", "Alta, edición, búsqueda e historial base."],
  ["/stock", "Stock", "Existencias y movimientos de entrada y salida."],
  ["/operaciones", "Operaciones", "Muertes, bajas y traslados."],
  ["/organizacion", "Grupos y ubicaciones", "Grupos, lotes y ubicaciones de la finca."],
  ["/grupos-importar", "Crear grupo desde Excel", "Sube caravanas y arma un grupo automáticamente."],
  ["/pesajes/lote", "Pesajes", "Pesaje individual y preparación para lote."],
  ["/ventas", "Ventas", "Ventas en guaraníes y actualización de stock."],
  ["/ventas-masivas", "Ventas masivas", "Vende varios animales con una sola operación."],
  ["/importar", "Importar", "CSV/Excel, mapeo editable y confirmación."],
  ["/reproduccion", "Reproducción", "Servicios, nacimientos, diagnósticos y abortos."],
  ["/reportes", "Reportes", "Filtros por categoría y movimientos."],
];
export default function ManagementHub() { return <main className="shell"><aside className="sidebar"><a className="brand" href="/gestion">PROCREARE</a><div className="farm">Finca principal<span>Centro de gestión</span></div><nav><a className="active" href="/gestion">Gestión</a><a href="/animales">Animales</a><a href="/stock">Stock</a><a href="/reportes">Reportes</a></nav></aside><section className="content"><header><div><div className="eyebrow">CENTRO DE GESTIÓN</div><h1>Todo en un lugar</h1><p className="lead">Accede a cada módulo de PROCREARE desde una sola pantalla.</p></div></header><div className="module-grid">{modules.map(([href, title, description]) => <a className="surface module-card" href={href} key={href}><span className="eyebrow">MÓDULO</span><h2>{title}</h2><p className="muted">{description}</p><span className="module-link">Abrir módulo →</span></a>)}</div></section></main>; }
