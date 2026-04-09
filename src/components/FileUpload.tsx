import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Paperclip, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";

interface UploadedFile {
  name: string;
  path: string;
  url: string;
  type: string;
}

interface FileUploadProps {
  userId: string;
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
}

const ACCEPTED = "image/png,image/jpeg,image/webp,image/gif,application/pdf";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function FileUpload({ userId, files, onChange, maxFiles = 5 }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected?.length) return;

    const remaining = maxFiles - files.length;
    if (remaining <= 0) { toast.error(`Max ${maxFiles} files allowed`); return; }

    setUploading(true);
    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < Math.min(selected.length, remaining); i++) {
      const file = selected[i];
      if (file.size > MAX_SIZE) { toast.error(`${file.name} exceeds 5MB limit`); continue; }

      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from("question-attachments")
        .upload(path, file, { contentType: file.type });

      if (error) { toast.error(`Failed to upload ${file.name}`); continue; }

      const { data: { publicUrl } } = supabase.storage
        .from("question-attachments")
        .getPublicUrl(path);

      newFiles.push({ name: file.name, path, url: publicUrl, type: file.type });
    }

    onChange([...files, ...newFiles]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = async (index: number) => {
    const file = files[index];
    await supabase.storage.from("question-attachments").remove([file.path]);
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        onChange={handleUpload}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading || files.length >= maxFiles}
        onClick={() => inputRef.current?.click()}
        className="border-border text-muted-foreground hover:border-primary hover:text-primary"
      >
        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Paperclip className="mr-2 h-4 w-4" />}
        {uploading ? "Uploading..." : "Attach Files"}
      </Button>
      <p className="text-xs text-muted-foreground">PDF or images up to 5MB each (max {maxFiles})</p>

      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {files.map((file, i) => (
            <div key={i} className="relative group rounded-lg border border-border bg-card overflow-hidden">
              {file.type.startsWith("image/") ? (
                <img src={file.url} alt={file.name} className="w-full h-24 object-cover" />
              ) : (
                <div className="flex items-center justify-center h-24 bg-muted/50">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              )}
              <div className="p-1.5">
                <p className="text-xs text-muted-foreground truncate">{file.name}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 rounded-full bg-background/80 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3 text-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type { UploadedFile };
