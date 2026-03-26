import { useState, useMemo, useCallback } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, X, AlertTriangle, CheckCircle2, Loader2, FileDown } from "lucide-react";

const CSV_COLUMNS = [
  "title", "artist_name", "genre", "mood", "bpm", "duration_seconds",
  "audio_url", "cover_image_url", "tiktok_sound_url", "instagram_sound_url",
  "spotify_url", "usage_rules", "status", "internal_catalog_id", "isrc",
  "version_name", "master_owner", "publishing_owner", "master_split_percent",
  "publishing_split_percent", "pro_affiliation", "content_id_status",
  "sync_clearance", "sample_clearance", "energy_level", "vocal_type",
  "dance_style_fit", "mood_tags", "battle_friendly", "choreography_friendly",
  "freestyle_friendly", "drop_time_seconds", "counts", "available_versions",
  "preview_url", "download_url",
];

const REQUIRED_FIELDS = ["title", "artist_name"];
const BOOLEAN_FIELDS = ["battle_friendly", "choreography_friendly", "freestyle_friendly"];
const NUMERIC_FIELDS = ["bpm", "duration_seconds", "master_split_percent", "publishing_split_percent", "drop_time_seconds", "usage_count", "revenue_generated"];
const JSON_ARRAY_FIELDS = ["dance_style_fit", "mood_tags", "available_versions"];

interface ParsedRow {
  data: Record<string, any>;
  errors: string[];
  isDuplicate: boolean;
  removed: boolean;
}

type Step = "upload" | "mapping" | "preview" | "importing" | "result";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTracks: Array<{ title: string; artist_name: string; isrc?: string | null }>;
  callAdmin: (action: string, params?: Record<string, string>, body?: any) => Promise<any>;
  onSuccess: () => void;
}

function parseBoolean(val: string): boolean {
  const v = val.toLowerCase().trim();
  return v === "true" || v === "yes" || v === "1";
}

function parseJsonArray(val: string): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* fall through */ }
  return val.split(",").map(s => s.trim()).filter(Boolean);
}

function fuzzyMatch(csvHeader: string, dbColumn: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[\s_-]/g, "");
  return normalize(csvHeader) === normalize(dbColumn);
}

export default function BatchTrackImport({ open, onOpenChange, existingTracks, callAdmin, onSuccess }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("upload");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [headerMap, setHeaderMap] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<{ success: number; errors: number; errorRows: ParsedRow[] } | null>(null);
  const [fileName, setFileName] = useState("");

  function reset() {
    setStep("upload");
    setRawHeaders([]);
    setRawData([]);
    setHeaderMap({});
    setRows([]);
    setImportResult(null);
    setFileName("");
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  function downloadTemplate() {
    const csv = CSV_COLUMNS.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "track_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        setRawHeaders(headers);
        setRawData(results.data as Record<string, string>[]);
        // Auto-map headers
        const map: Record<string, string> = {};
        for (const h of headers) {
          const match = CSV_COLUMNS.find(c => fuzzyMatch(h, c));
          if (match) map[h] = match;
        }
        setHeaderMap(map);
        // If all headers match, skip mapping step
        const allMapped = headers.every(h => h in map);
        if (allMapped) {
          buildRows(results.data as Record<string, string>[], map);
          setStep("preview");
        } else {
          setStep("mapping");
        }
      },
      error: () => toast({ title: "Failed to parse CSV", variant: "destructive" }),
    });
  }

  function buildRows(data: Record<string, string>[], map: Record<string, string>) {
    const existingSet = new Set(existingTracks.map(t => `${t.title?.toLowerCase()}|||${t.artist_name?.toLowerCase()}`));
    const existingIsrcs = new Set(existingTracks.map(t => t.isrc?.toLowerCase()).filter(Boolean));

    const parsed: ParsedRow[] = data.map(raw => {
      const mapped: Record<string, any> = {};
      const errors: string[] = [];

      for (const [csvCol, dbCol] of Object.entries(map)) {
        const val = raw[csvCol]?.trim() ?? "";
        if (!val) continue;

        if (BOOLEAN_FIELDS.includes(dbCol)) {
          mapped[dbCol] = parseBoolean(val);
        } else if (NUMERIC_FIELDS.includes(dbCol)) {
          const n = Number(val);
          if (isNaN(n)) {
            errors.push(`${dbCol}: invalid number "${val}"`);
          } else {
            mapped[dbCol] = n;
          }
        } else if (JSON_ARRAY_FIELDS.includes(dbCol)) {
          mapped[dbCol] = parseJsonArray(val);
        } else {
          mapped[dbCol] = val;
        }
      }

      for (const req of REQUIRED_FIELDS) {
        if (!mapped[req]) errors.push(`${req} is required`);
      }

      if (!mapped.status) mapped.status = "active";

      const key = `${(mapped.title ?? "").toLowerCase()}|||${(mapped.artist_name ?? "").toLowerCase()}`;
      const isDuplicate = existingSet.has(key) || (mapped.isrc && existingIsrcs.has(mapped.isrc?.toLowerCase()));

      return { data: mapped, errors, isDuplicate, removed: false };
    });

    setRows(parsed);
  }

  function confirmMapping() {
    buildRows(rawData, headerMap);
    setStep("preview");
  }

  const validRows = useMemo(() => rows.filter(r => !r.removed && r.errors.length === 0), [rows]);
  const invalidRows = useMemo(() => rows.filter(r => !r.removed && r.errors.length > 0), [rows]);
  const duplicateRows = useMemo(() => rows.filter(r => !r.removed && r.isDuplicate), [rows]);

  function removeRow(idx: number) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, removed: true } : r));
  }

  async function handleImport() {
    setStep("importing");
    try {
      const toInsert = validRows.map(r => r.data);
      const inserted = await callAdmin("batch-create-tracks", {}, { tracks: toInsert });
      const successCount = Array.isArray(inserted) ? inserted.length : 0;

      // Log upload history
      try {
        await callAdmin("log-track-upload", {}, {
          filename: fileName,
          row_count: rows.filter(r => !r.removed).length,
          success_count: successCount,
          error_count: invalidRows.length,
        });
      } catch { /* non-critical */ }

      setImportResult({ success: successCount, errors: invalidRows.length, errorRows: invalidRows });
      setStep("result");
      onSuccess();
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
      setStep("preview");
    }
  }

  function downloadErrorReport() {
    if (!importResult) return;
    const errorData = importResult.errorRows.map(r => ({
      ...r.data,
      _errors: r.errors.join("; "),
    }));
    const csv = Papa.unparse(errorData);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "import_errors.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Batch Import Tracks"}
            {step === "mapping" && "Map CSV Headers"}
            {step === "preview" && "Preview Import"}
            {step === "importing" && "Importing..."}
            {step === "result" && "Import Complete"}
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Upload a CSV file with track data. Download the template for the correct format.</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />Download Template
              </Button>
            </div>
            <label className="flex flex-col items-center justify-center w-full h-40 rounded-lg border-2 border-dashed border-muted-foreground/30 cursor-pointer hover:border-muted-foreground/50 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Click to upload CSV</span>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Some CSV headers didn't auto-match. Map them to the correct fields below, or leave as "Skip" to ignore.</p>
            <div className="max-h-[50vh] overflow-y-auto space-y-2">
              {rawHeaders.map(h => (
                <div key={h} className="flex items-center gap-3">
                  <span className="text-sm font-mono w-48 truncate">{h}</span>
                  <span className="text-muted-foreground">→</span>
                  <Select value={headerMap[h] ?? "_skip"} onValueChange={v => setHeaderMap(prev => {
                    const next = { ...prev };
                    if (v === "_skip") delete next[h]; else next[h] = v;
                    return next;
                  })}>
                    <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_skip">Skip</SelectItem>
                      {CSV_COLUMNS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {headerMap[h] && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setStep("upload"); }}>Back</Button>
              <Button onClick={confirmMapping}>Continue to Preview</Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <Badge variant="default">{validRows.length} valid</Badge>
              {invalidRows.length > 0 && <Badge variant="destructive">{invalidRows.length} invalid</Badge>}
              {duplicateRows.length > 0 && <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />{duplicateRows.length} possible duplicates</Badge>}
            </div>
            <div className="max-h-[50vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Artist</TableHead>
                    <TableHead>Genre</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issues</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => r.removed ? null : (
                    <TableRow key={i} className={r.errors.length > 0 ? "bg-destructive/10" : r.isDuplicate ? "bg-accent/50" : ""}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{r.data.title || <span className="text-destructive">Missing</span>}</TableCell>
                      <TableCell>{r.data.artist_name || <span className="text-destructive">Missing</span>}</TableCell>
                      <TableCell>{r.data.genre ?? "—"}</TableCell>
                      <TableCell>{r.data.status ?? "active"}</TableCell>
                      <TableCell>
                        {r.errors.length > 0 && <span className="text-xs text-destructive">{r.errors.join(", ")}</span>}
                        {r.isDuplicate && r.errors.length === 0 && <span className="text-xs text-yellow-600">Possible duplicate</span>}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeRow(i)}><X className="h-3 w-3" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
              <Button onClick={handleImport} disabled={validRows.length === 0}>
                Import {validRows.length} Valid Rows
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Importing {validRows.length} tracks...</p>
          </div>
        )}

        {step === "result" && importResult && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-6 gap-2">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="text-lg font-semibold">{importResult.success} tracks imported</p>
              {importResult.errors > 0 && <p className="text-sm text-muted-foreground">{importResult.errors} rows skipped (invalid)</p>}
            </div>
            {importResult.errors > 0 && (
              <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                <FileDown className="h-4 w-4 mr-2" />Download Error Report
              </Button>
            )}
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
