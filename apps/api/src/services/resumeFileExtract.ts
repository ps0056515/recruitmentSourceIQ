import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

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

/** Soft hint only — real name should come from resume text. */
function candidateNameHintFromFile(fileName: string): string | undefined {
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_]+/g, " ")
    .replace(/\b\d+(\.\d+)?\s*\+?\s*years?\b.*$/i, "")
    .replace(/\b(angular|react|node|java|python|full\s*stack|developer|engineer|resume|cv)\b.*$/i, "")
    .replace(/[-–—|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (base.length < 2 || base.length > 40 || /\d/.test(base)) return undefined;
  return base;
}

async function extractPdfText(buf: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy().catch(() => undefined);
  }
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
    text = await extractPdfText(buf);
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

  return {
    resumeText,
    candidateName: candidateNameHintFromFile(file.fileName),
    fileName: file.fileName,
  };
}
