import { createRequire } from "module";
import mammoth from "mammoth";

const require = createRequire(import.meta.url);
// pdf-parse is CJS; default export is the parse function
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export type UploadFileInput = {
  fileName: string;
  mimeType?: string;
  contentBase64: string;
};

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function candidateNameFromFile(fileName: string): string | undefined {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base.length >= 2 ? base.slice(0, 80) : undefined;
}

export async function extractTextFromUpload(file: UploadFileInput): Promise<{
  resumeText: string;
  candidateName?: string;
  fileName: string;
}> {
  if (!file.contentBase64?.trim()) throw new Error("empty_file");
  const buf = Buffer.from(file.contentBase64, "base64");
  if (!buf.length) throw new Error("empty_file");
  if (buf.length > MAX_BYTES) throw new Error("file_too_large");

  const ext = extOf(file.fileName || "");
  const mime = (file.mimeType ?? "").toLowerCase();
  let text = "";

  if (ext === "txt" || ext === "md" || mime.startsWith("text/")) {
    text = buf.toString("utf8");
  } else if (ext === "pdf" || mime === "application/pdf") {
    const parsed = await pdfParse(buf);
    text = parsed.text ?? "";
  } else if (
    ext === "docx" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer: buf });
    text = result.value ?? "";
  } else if (ext === "doc") {
    throw new Error("doc_unsupported");
  } else {
    throw new Error("unsupported_type");
  }

  const resumeText = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (resumeText.length < 40) throw new Error("resume_too_short");

  const fromFile = candidateNameFromFile(file.fileName);
  return {
    resumeText,
    candidateName: fromFile || undefined,
    fileName: file.fileName,
  };
}
