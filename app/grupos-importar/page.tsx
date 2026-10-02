"use client";
import { useState } from "react";
import Papa from "papaparse";

export default function GroupImportPage() {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [identifiers, setIdentifiers] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  function read(selected: File | null) {
    if (!selected) return;
    setFile(selected);
    if (selected.name.toLowerCase().endsWith(".xlsx")) { setIdentifiers(["excel"]); return; }
    Papa.parse<Record<string, string>>(selected, { header: true, skipEmptyLines: true, complete: result => {
      const field = result.meta.fields?.find(value => /caravana|id|eid/i.test(value || "")) || result.meta.fields?.[0];
      setIdentifiers(result.data.map(row => String(field ? row[field] : "")).filter(Boolean));
    }});
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const isExcel = Boolean(file?.name.toLowerCase().endsWith(".xlsx"));
    const body = isExcel ? (() => { const form = new FormData(); form.set("name", name); form.set("file", file as File); return form; })() : JSON.stringify({ name, identifiers });
    const response = await fetch("/api/v1/groups/import", { method: "POST", headers: isExcel ? undefined : { "content-type": "application/json" }, body });
    const result = await response.json();
    setMessage(response.ok ? `Grupo creado: ${result.data.matched} animales asignados${result.data.missing?.length ? `. No encontrados: ${result.data.missing.length}.` : "."}` : result.error?.message || "No se pudo crear el grupo.");
  }
  return <main className="shell"><aside className="sidebar"><a className="brand" href="/gestion">PROCREARE</a><div className="farm">Finca principal<span>Importar grupo</span></div><nav><a href="/gestion">Centro de gestión</a><a className="active" href="/grupos-importar">Crear grupo desde Excel</a><a href="/organizacion">Organización</a></nav></aside><section className="content"><header><div><div className="eyebrow">CARGA MASIVA</div><h1>Crear grupo desde Excel</h1><p className="lead">Sube una planilla Excel o CSV de caravanas y asigna todos sus animales sin seleccionarlos uno por uno.</p></div></header><form className="surface form-grid" onSubmit={save}><label>Nombre del grupo<input required value={name} onChange={e => setName(e.target.value)} placeholder="Ej.: Lote recría 2026" /></label><label>Archivo Excel o CSV<input required type="file" accept=".csv,.xlsx" onChange={e => read(e.target.files?.[0] || null)} /></label><p className="muted full-width">{file?.name || "Sin archivo"}{file?.name?.toLowerCase().endsWith(".xlsx") ? " · Excel listo para cargar" : ` · ${identifiers.length} identificadores encontrados.`}</p><div className="sheet-actions full-width"><button className="button" disabled={!file || !identifiers.length}>Crear grupo y asignar</button></div>{message && <p className="notice full-width">{message}</p>}</form></section></main>;
}
