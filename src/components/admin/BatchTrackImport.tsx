import { useState, useMemo, useCallback } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Download, X, AlertTriangle, CheckCircle2, Loader2, FileDown, RefreshCw, Plus } from "lucide-react";

const CSV_COLUMNS = [
  "title", "artist_name", "album", "genre", "mood", "bpm", "duration_seconds",
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

// Fields shown in the diff view
const DIFF_DISPLAY_FIELDS = ["title", "artist_name", "album", "genre", "bpm", "audio_url", "status", "isrc"];

interface ExistingTrack {
  id: string;
  title: string;
  artist_name: string;
  isrc?: string | null;
  audio_url?: string | null;
  genre?: string | null;
  bpm?: number | null;
  album?: string | null;
  status?: string;
  [key: string]: any;
}

interface ParsedRow {
  data: Record<string, any>;
  errors: string[];
  removed: boolean;
  /** If this row matches an existing track, this holds the match info */
  matchedTrack?: ExistingTrack;
  /** The fields that differ between CSV row and existing track */
  changedFields?: string[];
}

type Step = "upload" | "mapping" | "preview" | "review_updates" | "importing" | "result";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTracks: ExistingTrack[];
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

function formatValue(val: any): string {
  if (val === null || val === undefined || val === "") return "—";
  if (Array.isArray(val)) return val.join(", ");
  return String(val);
}

export default function BatchTrackImport({ open, onOpenChange, existingTracks, callAdmin, onSuccess }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("upload");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [headerMap, setHeaderMap] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<{ inserted: number; updated: number; errors: number; errorRows: ParsedRow[] } | null>(null);
  const [fileName, setFileName] = useState("");
  const [approvedUpdates, setApprovedUpdates] = useState<Set<number>>(new Set());

  function reset() {
    setStep("upload");
    setRawHeaders([]);
    setRawData([]);
    setHeaderMap({});
    setRows([]);
    setImportResult(null);
    setFileName("");
    setApprovedUpdates(new Set());
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
        const map: Record<string, string> = {};
        for (const h of headers) {
          const match = CSV_COLUMNS.find(c => fuzzyMatch(h, c));
          if (match) map[h] = match;
        }
        setHeaderMap(map);
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

  /** Find matching existing track: ISRC first, then title+artist */
  function findMatch(mapped: Record<string, any>): ExistingTrack | undefined {
    if (mapped.isrc) {
      const byIsrc = existingTracks.find(t => t.isrc && t.isrc.toLowerCase() === mapped.isrc.toLowerCase());
      if (byIsrc) return byIsrc;
    }
    const title = (mapped.title ?? "").toLowerCase().trim();
    const artist = (mapped.artist_name ?? "").toLowerCase().trim();
    if (title && artist) {
      return existingTracks.find(t =>
        t.title.toLowerCase().trim() === title &&
        t.artist_name.toLowerCase().trim() === artist
      );
    }
    return undefined;
  }

  /** Determine which fields differ between CSV row and existing track */
  function getChangedFields(csvData: Record<string, any>, existing: ExistingTrack): string[] {
    const changed: string[] = [];
    for (const key of Object.keys(csvData)) {
      if (key === "status" && !csvData[key]) continue; // don't flag default status
      const csvVal = csvData[key];
      const existingVal = existing[key];
      
      // Normalize for comparison
      const csvStr = formatValue(csvVal);
      const existStr = formatValue(existingVal);
      if (csvStr !== existStr && csvStr !== "—") {
        changed.push(key);
      }
    }
    return changed;
  }

  function buildRows(data: Record<string, string>[], map: Record<string, string>) {
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

      // Check for existing track match
      const matchedTrack = findMatch(mapped);
      const changedFields = matchedTrack ? getChangedFields(mapped, matchedTrack) : undefined;

      return { data: mapped, errors, removed: false, matchedTrack, changedFields };
    });

    setRows(parsed);
  }

  function confirmMapping() {
    buildRows(rawData, headerMap);
    setStep("preview");
  }

  const newRows = useMemo(() => rows.filter(r => !r.removed && r.errors.length === 0 && !r.matchedTrack), [rows]);
  const updateRows = useMemo(() => rows.filter(r => !r.removed && r.errors.length === 0 && r.matchedTrack && (r.changedFields?.length ?? 0) > 0), [rows]);
  const unchangedRows = useMemo(() => rows.filter(r => !r.removed && r.errors.length === 0 && r.matchedTrack && (r.changedFields?.length ?? 0) === 0), [rows]);
  const invalidRows = useMemo(() => rows.filter(r => !r.removed && r.errors.length > 0), [rows]);

  function removeRow(idx: number) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, removed: true } : r));
  }

  function toggleUpdateApproval(idx: number) {
    setApprovedUpdates(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  function approveAllUpdates() {
    const allIdxs = rows.map((r, i) => ({ r, i })).filter(({ r }) => !r.removed && r.errors.length === 0 && r.matchedTrack && (r.changedFields?.length ?? 0) > 0).map(({ i }) => i);
    setApprovedUpdates(new Set(allIdxs));
  }

  async function handleImport() {
    setStep("importing");
    try {
      let insertedCount = 0;
      let updatedCount = 0;

      // Insert new tracks
      if (newRows.length > 0) {
        const toInsert = newRows.map(r => r.data);
        const inserted = await callAdmin("batch-create-tracks", {}, { tracks: toInsert });
        insertedCount = Array.isArray(inserted) ? inserted.length : 0;
      }

      // Update approved existing tracks
      const approvedUpdateRows = updateRows.filter((_, i) => {
        const globalIdx = rows.indexOf(updateRows[i]);
        return approvedUpdates.has(globalIdx);
      });
      if (approvedUpdateRows.length > 0) {
        const toUpdate = approvedUpdateRows.map(r => ({
          id: r.matchedTrack!.id,
          ...r.data,
        }));
        const updated = await callAdmin("batch-update-tracks", {}, { tracks: toUpdate });
        updatedCount = Array.isArray(updated) ? updated.length : 0;
      }

      // Log upload history
      try {
        await callAdmin("log-track-upload", {}, {
          filename: fileName,
          row_count: rows.filter(r => !r.removed).length,
          success_count: insertedCount + updatedCount,
          error_count: invalidRows.length,
        });
      } catch { /* non-critical */ }

      setImportResult({ inserted: insertedCount, updated: updatedCount, errors: invalidRows.length, errorRows: invalidRows });
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
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Batch Import Tracks"}
            {step === "mapping" && "Map CSV Headers"}
            {step === "preview" && "Preview Import"}
            {step === "review_updates" && "Review Data Updates"}
            {step === "importing" && "Importing..."}
            {step === "result" && "Import Complete"}
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV file with track data. Existing tracks will be matched by ISRC first, then by title + artist name. You'll get to approve any updates before they're saved.
            </p>
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
                  {headerMap[h] && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
              <Button onClick={confirmMapping}>Continue to Preview</Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <Badge variant="default" className="gap-1"><Plus className="h-3 w-3" />{newRows.length} new</Badge>
              {updateRows.length > 0 && <Badge variant="secondary" className="gap-1"><RefreshCw className="h-3 w-3" />{updateRows.length} updates detected</Badge>}
              {unchangedRows.length > 0 && <Badge variant="outline">{unchangedRows.length} unchanged (skipped)</Badge>}
              {invalidRows.length > 0 && <Badge variant="destructive">{invalidRows.length} invalid</Badge>}
            </div>

            {/* New tracks table */}
            {newRows.length > 0 && (
              <>
                <h3 className="text-sm font-semibold mt-2">New Tracks</h3>
                <div className="max-h-[30vh] overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Artist</TableHead>
                        <TableHead>Genre</TableHead>
                        <TableHead>Audio URL</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => {
                        if (r.removed || r.errors.length > 0 || r.matchedTrack) return null;
                        return (
                          <TableRow key={i}>
                            <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                            <TableCell className="font-medium">{r.data.title}</TableCell>
                            <TableCell>{r.data.artist_name}</TableCell>
                            <TableCell>{r.data.genre ?? "—"}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-xs">{r.data.audio_url ? "✓" : "—"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removeRow(i)}><X className="h-3 w-3" /></Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

            {/* Invalid rows */}
            {invalidRows.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-destructive">Invalid Rows (will be skipped)</h3>
                <div className="max-h-[20vh] overflow-auto rounded-md border border-destructive/20">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Artist</TableHead>
                        <TableHead>Issues</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => {
                        if (r.removed || r.errors.length === 0) return null;
                        return (
                          <TableRow key={i} className="bg-destructive/5">
                            <TableCell className="text-xs">{i + 1}</TableCell>
                            <TableCell>{r.data.title || "—"}</TableCell>
                            <TableCell>{r.data.artist_name || "—"}</TableCell>
                            <TableCell><span className="text-xs text-destructive">{r.errors.join(", ")}</span></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
              {updateRows.length > 0 ? (
                <Button onClick={() => setStep("review_updates")}>
                  Review {updateRows.length} Updates →
                </Button>
              ) : (
                <Button onClick={handleImport} disabled={newRows.length === 0}>
                  Import {newRows.length} New Tracks
                </Button>
              )}
            </DialogFooter>
          </div>
        )}

        {step === "review_updates" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The following tracks already exist and have different data in the CSV. Select which updates to approve.
            </p>
            <div className="flex justify-between items-center">
              <Badge variant="secondary">{approvedUpdates.size} of {updateRows.length} approved</Badge>
              <Button variant="outline" size="sm" onClick={approveAllUpdates}>Approve All</Button>
            </div>

            <div className="max-h-[50vh] overflow-auto space-y-3">
              {rows.map((r, i) => {
                if (r.removed || r.errors.length > 0 || !r.matchedTrack || !r.changedFields?.length) return null;
                const isApproved = approvedUpdates.has(i);
                return (
                  <div key={i} className={`rounded-lg border p-3 transition-colors ${isApproved ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <Checkbox checked={isApproved} onCheckedChange={() => toggleUpdateApproval(i)} />
                      <span className="font-medium text-sm">{r.matchedTrack.title}</span>
                      <span className="text-xs text-muted-foreground">by {r.matchedTrack.artist_name}</span>
                      <Badge variant="outline" className="ml-auto text-xs">{r.changedFields.length} field{r.changedFields.length > 1 ? "s" : ""} changed</Badge>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-1 text-xs ml-7">
                      <span className="font-medium text-muted-foreground">Field</span>
                      <span></span>
                      <span className="font-medium text-muted-foreground">New Value</span>
                      {r.changedFields.map(field => (
                        <>
                          <div key={`${field}-label`} className="text-muted-foreground capitalize">{field.replace(/_/g, " ")}</div>
                          <span key={`${field}-arrow`} className="text-muted-foreground">→</span>
                          <div key={`${field}-new`}>
                            <span className="text-primary font-medium">{formatValue(r.data[field])}</span>
                            <span className="text-muted-foreground ml-1">(was: {formatValue(r.matchedTrack![field])})</span>
                          </div>
                        </>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("preview")}>Back</Button>
              <Button onClick={handleImport} disabled={newRows.length === 0 && approvedUpdates.size === 0}>
                Import {newRows.length > 0 ? `${newRows.length} new` : ""}{newRows.length > 0 && approvedUpdates.size > 0 ? " + " : ""}{approvedUpdates.size > 0 ? `${approvedUpdates.size} update${approvedUpdates.size > 1 ? "s" : ""}` : ""}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Processing {newRows.length + approvedUpdates.size} tracks...</p>
          </div>
        )}

        {step === "result" && importResult && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-6 gap-2">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <p className="text-lg font-semibold">
                {importResult.inserted > 0 && `${importResult.inserted} tracks imported`}
                {importResult.inserted > 0 && importResult.updated > 0 && ", "}
                {importResult.updated > 0 && `${importResult.updated} tracks updated`}
              </p>
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
