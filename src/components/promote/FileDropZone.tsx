import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Upload, X, Image, Music, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FileDropZoneProps {
  type: "image" | "audio";
  value: string;
  onChange: (url: string) => void;
  className?: string;
}

const ACCEPT_MAP = {
  image: { accept: ".jpg,.jpeg,.png", mimes: ["image/jpeg", "image/png"], label: "JPG or PNG, 1:1 ratio", maxSize: 10 * 1024 * 1024 },
  audio: { accept: ".mp3,.wav", mimes: ["audio/mpeg", "audio/wav", "audio/x-wav"], label: "MP3 or WAV, max 50MB", maxSize: 50 * 1024 * 1024 },
};

export default function FileDropZone({ type, value, onChange, className }: FileDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const config = ACCEPT_MAP[type];

  const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

  const upload = useCallback(async (file: File) => {
    if (!config.mimes.includes(file.type)) {
      toast.error(`Invalid file type. Please upload ${config.label}`);
      return;
    }
    if (file.size > config.maxSize) {
      toast.error(`File too large. Max ${config.maxSize / (1024 * 1024)}MB`);
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${type}s/${Date.now()}_${sanitizeName(file.name)}`;

    const { error } = await supabase.storage
      .from("promotion-uploads")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("promotion-uploads")
      .getPublicUrl(path);

    setFileName(file.name);
    onChange(urlData.publicUrl);
    setUploading(false);
  }, [type, config, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, [upload]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  };

  const clear = () => {
    onChange("");
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const Icon = type === "image" ? Image : Music;

  if (value && !uploading) {
    return (
      <div className={cn("relative rounded-lg border border-border bg-muted/40 overflow-hidden", className)}>
        {type === "image" ? (
          <div className="relative aspect-square w-full max-w-[200px] mx-auto">
            <img src={value} alt="Cover" className="w-full h-full object-cover rounded-lg" />
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Music className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName || "Audio uploaded"}</p>
              <audio controls src={value} className="w-full mt-2 h-8" />
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={clear}
          className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-full p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={cn(
        "relative cursor-pointer rounded-lg border-2 border-dashed transition-colors p-6 text-center",
        dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30",
        uploading && "pointer-events-none opacity-70",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={config.accept}
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-2">
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <div className="p-3 rounded-full bg-muted">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div>
          <p className="text-sm font-medium">
            {uploading ? "Uploading…" : "Drag & drop or click to upload"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{config.label}</p>
        </div>
      </div>
    </div>
  );
}
