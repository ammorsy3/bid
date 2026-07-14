import { ObjectStorageService } from "./objectStorage";

const MAX_TEXT_LENGTH = 30000; // ~8K tokens

const objectStorage = new ObjectStorageService();

/**
 * Extract text from a buffer based on content type
 */
export async function extractTextFromBuffer(buffer: Buffer, contentType: string): Promise<string> {
  try {
    if (contentType === "application/pdf" || contentType.includes("pdf")) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      // Insert page markers for AI to reference page numbers
      const pages = (result as any).pages || [];
      if (pages.length > 0) {
        return pages.map((p: any) => `--- PAGE ${p.num} ---\n${p.text}`).join("\n");
      }
      return result.text || "";
    }

    if (
      contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      contentType.includes("docx")
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value || "";
    }

    // Plain text fallback
    if (contentType.startsWith("text/")) {
      return buffer.toString("utf-8");
    }

    return "";
  } catch (error) {
    console.error("Text extraction error:", error);
    return "";
  }
}

/**
 * Fetch a file from object storage and extract its text content.
 * objectPath should be like "/objects/uploads/uuid.pdf"
 */
export async function fetchAndExtractFile(objectPath: string): Promise<string> {
  try {
    const file = await objectStorage.getObjectEntityFile(objectPath);
    const { buffer, contentType } = await objectStorage.downloadToBuffer(file);

    const text = await extractTextFromBuffer(buffer, contentType);

    // Truncate to prevent excessive token usage
    if (text.length > MAX_TEXT_LENGTH) {
      return text.slice(0, MAX_TEXT_LENGTH) + "\n...[truncated]";
    }

    return text;
  } catch (error) {
    console.error(`Failed to extract text from ${objectPath}:`, error);
    return "";
  }
}
