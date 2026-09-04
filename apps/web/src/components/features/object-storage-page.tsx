import { useCallback, useEffect, useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductShell } from "@/components/product-shell";
import { authClient } from "@/lib/auth-client";
import "./object-storage-page.css";

type StoredObject = { id: string; fileName: string; contentType: string; byteSize: number; visibility: "private" | "public"; provider: string; createdAt: string };

export function ObjectStoragePage() {
  const { data: session, isPending } = authClient.useSession();
  const [objects, setObjects] = useState<StoredObject[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [status, setStatus] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/storage/objects", { headers: { Accept: "application/json" } });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message || "Unable to load objects.");
    setObjects(body.data.objects);
  }, []);
  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      window.location.replace(`/login?returnTo=${encodeURIComponent("/app/storage")}`);
      return;
    }
    void load().catch((error) => setStatus(error.message));
  }, [isPending, load, session?.user?.id]);
  const upload = async () => {
    if (!file) return;
    setStatus("Uploading…");
    const response = await fetch("/api/storage/objects", { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream", "X-File-Name": file.name, "X-Object-Visibility": visibility }, body: file });
    const body = await response.json();
    if (!response.ok) { setStatus(body.error?.message || "Upload failed."); return; }
    setFile(null);
    setStatus("Upload complete.");
    await load();
  };
  const remove = async (id: string) => {
    const response = await fetch(`/api/storage/objects/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) { setStatus("Delete failed."); return; }
    setStatus("Object deleted.");
    await load();
  };
  return <ProductShell activePath="/app/storage"><main className="storage-page"><header><div><span>Object storage</span><h1>Files</h1><p>Private by default, server-authorized, and backed by the selected R2 or S3-compatible Provider.</p></div></header><div className="storage-upload"><label><span>File</span><input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label><label><span>Visibility</span><select value={visibility} onChange={(event) => setVisibility(event.target.value as "private" | "public")}><option value="private">Private</option><option value="public">Public</option></select></label><Button type="button" disabled={!file} onClick={() => void upload()}><Upload size={16} />Upload</Button></div>{status ? <p className="storage-status" role="status">{status}</p> : null}<div className="storage-list">{objects.length ? objects.map((object) => <article key={object.id}><div><strong>{object.fileName}</strong><small>{object.contentType} · {object.byteSize.toLocaleString()} bytes · {object.visibility} · {object.provider}</small></div><div><Button asChild size="sm" variant="outline"><a href={`/api/storage/objects/${encodeURIComponent(object.id)}`}><Download size={15} />Download</a></Button><Button type="button" size="sm" variant="outline" onClick={() => void remove(object.id)}><Trash2 size={15} />Delete</Button></div></article>) : <p>No files uploaded.</p>}</div></main></ProductShell>;
}
