// Upload one file to object storage and register it (ACL owner + company
// provenance), returning its canonical "/objects/…" path. The same three steps
// as the other uploaders (MarketplacePublishOption, submit-offer-modal).
export async function uploadObject(file: File): Promise<string> {
  const auth = { Authorization: `Bearer ${localStorage.getItem("token")}` };
  const urlRes = await fetch("/api/objects/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify({ fileSize: file.size, fileType: file.type }),
  });
  if (!urlRes.ok) throw new Error("upload-url");
  const { uploadURL } = await urlRes.json();
  const put = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  if (!put.ok) throw new Error("upload");
  const meta = await fetch("/api/objects/metadata", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify({ fileURL: uploadURL }),
  });
  if (!meta.ok) throw new Error("metadata");
  const { objectPath } = await meta.json();
  return objectPath as string;
}
