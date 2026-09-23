"use client";
import { useState } from "react";
import Papa from "papaparse";

type ImportType = "ANIMALS" | "WEIGHINGS" | "SALES";
type InputData = { type: ImportType; headers: string[]; rows: Record<string, unknown>[]; fileName?: string };
type Preview = { mapping: Record<string, string | null>; rows: Array<{ rowNumber: number; status: string; errors: string[]; normalized: Record<string, unknown> }>; validRows: number; errorRows: number };

export default function ImportPage() {
  const [type, setType] = useState<ImportType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [input, setInput] = useState<InputData | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  function choose(value: ImportType) { setType(value); setFile(null); setInput(null); setPreview(null); setMessage(""); }
  async function previewResponse(next: File, data: InputData | FormData) {
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/v1/imports/preview", data instanceof FormData ? { method: "POST", body: data } : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "No se pudo preparar la vista previa.");
      setPreview(payload.data); setInput(payload.input ?? data); setFile(next);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo preparar la vista previa."); }
    finally { setLoading(false); }
  }
  function readFile(next: File | null) {
    if (!next || !type) return;
    if (next.name.toLowerCase().endsWith(".xlsx")) { const data = new FormData(); data.append("type", type); data.append("file", next); void previewResponse(next, data); return; }
    Papa.parse<Record<string, unknown>>(next, { header: true, skipEmptyLines: true, complete: (result) => void previewResponse(next, { type, headers: result.meta.fields ?? [], rows: result.data }) });
  }
  async function commit() {
    if (!file || !type || !preview || !input) return;
    setLoading(true); setMessage("");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const fileHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) => byte.toString(16).padStart(2, "0")).join("");
      const response = await fetch("/api/v1/imports/commit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...input, type, fileHash, fileName: file.name }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "No se pudo confirmar la importación.");
      setMessage(`Importación confirmada: ${preview.validRows} filas válidas.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo confirmar la importación."); }
    finally { setLoading(false); }
  }
  return <main className="shell"><aside className="sidebar"><a className="brand" href="/">PROCREARE</a><div className="farm">Finca principal<span>Importar</span></div><nav><a href="/">Inicio</a><a href="/animales">Animales</a><a href="/pesajes/lote">Pesajes</a><a href="/ventas">Ventas</a><a className="active" href="/importar">Importar</a></nav></aside><section className="content"><header><div><div className="eyebrow">CARGA SEGURA DE DATOS</div><h1>Importar</h1><p className="lead">Revisa las filas antes de guardar cambios.</p></div></header><div className="surface"><h2>1. Elige qué importar</h2><div className="empty-actions"><button className={type === "ANIMALS" ? "button" : "secondary"} onClick={() => choose("ANIMALS")}>Animales</button><button className={type === "WEIGHINGS" ? "button" : "secondary"} onClick={() => choose("WEIGHINGS")}>Pesajes</button><button className={type === "SALES" ? "button" : "secondary"} onClick={() => choose("SALES")}>Ventas</button></div>{type && <><h2>2. Selecciona CSV o Excel</h2><label>Archivo<input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => readFile(event.target.files?.[0] ?? null)} /></label>{loading && <p className="muted">Procesando…</p>}{preview && <div className="notice"><div><strong>{file?.name}</strong><p>{preview.validRows} filas válidas · {preview.errorRows} con errores</p></div><button className="button" onClick={commit} disabled={loading || preview.errorRows > 0}>Confirmar importación</button></div>}{preview?.rows.slice(0, 8).map((row) => <p className={row.status === "VALID" ? "muted" : "form-error"} key={row.rowNumber}>Fila {row.rowNumber}: {row.status === "VALID" ? "lista" : row.errors.join(" ")}</p>)}{message && <p className="form-error" role="status">{message}</p>}</>}</div></section></main>;
}
