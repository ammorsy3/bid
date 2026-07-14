import { createClient } from "@supabase/supabase-js";
import { Response } from "express";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for object storage.",
  );
}

// Buckets are addressed by name. The service-role key bypasses RLS, so all
// access decisions are made by canAccessObject() before we ever touch storage.
export const PRIVATE_BUCKET = process.env.SUPABASE_PRIVATE_BUCKET ?? "private-files";
export const PUBLIC_BUCKET = process.env.SUPABASE_PUBLIC_BUCKET ?? "public-files";

export const supabaseStorage = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
).storage;

// A handle to an object in a bucket. Replaces the GCS `File` object that the
// previous Replit-backed implementation passed around.
export interface StoredObject {
  bucket: string;
  // Key within the bucket, e.g. "uploads/<uuid>".
  name: string;
  // App-relative path, e.g. "/objects/uploads/<uuid>". This is what is stored
  // in the database and what object_acl rows are keyed by.
  objectPath: string;
  isPublic: boolean;
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

function makeObject(bucket: string, name: string): StoredObject {
  return {
    bucket,
    name,
    objectPath: `/objects/${name}`,
    isPublic: bucket === PUBLIC_BUCKET,
  };
}

// Strips the "/objects/" prefix and returns the bucket key.
function toObjectKey(objectPath: string): string {
  if (!objectPath.startsWith("/objects/")) {
    throw new ObjectNotFoundError();
  }
  const key = objectPath.slice("/objects/".length);
  if (!key || key.includes("..")) {
    throw new ObjectNotFoundError();
  }
  return key;
}

async function objectExists(bucket: string, name: string): Promise<boolean> {
  const slash = name.lastIndexOf("/");
  const dir = slash === -1 ? "" : name.slice(0, slash);
  const base = slash === -1 ? name : name.slice(slash + 1);

  const { data, error } = await supabaseStorage
    .from(bucket)
    .list(dir, { search: base, limit: 100 });

  if (error) return false;
  return (data ?? []).some((entry) => entry.name === base);
}

export class ObjectStorageService {
  constructor() {}

  // Downloads an object to the response.
  async downloadObject(
    object: StoredObject,
    res: Response,
    cacheTtlSec: number = 3600,
  ) {
    try {
      const { data, error } = await supabaseStorage
        .from(object.bucket)
        .download(object.name);

      if (error || !data) {
        if (!res.headersSent) {
          res.status(404).json({ error: "Object not found" });
        }
        return;
      }

      const isPublic =
        object.isPublic ||
        (await getObjectAclPolicy(object))?.visibility === "public";

      res.set({
        "Content-Type": data.type || "application/octet-stream",
        "Content-Length": String(data.size),
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
      });

      Readable.fromWeb(data.stream() as any)
        .on("error", (err) => {
          console.error("Stream error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Error streaming file" });
          }
        })
        .pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Size in bytes, or 0 if it cannot be determined.
  async getObjectSize(object: StoredObject): Promise<number> {
    const slash = object.name.lastIndexOf("/");
    const dir = slash === -1 ? "" : object.name.slice(0, slash);
    const base = slash === -1 ? object.name : object.name.slice(slash + 1);

    const { data, error } = await supabaseStorage
      .from(object.bucket)
      .list(dir, { search: base, limit: 100 });

    if (error) return 0;
    const entry = (data ?? []).find((e) => e.name === base);
    return (entry?.metadata as { size?: number } | undefined)?.size ?? 0;
  }

  // Reads an object into a buffer (used by text extraction).
  async downloadToBuffer(
    object: StoredObject,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const { data, error } = await supabaseStorage
      .from(object.bucket)
      .download(object.name);

    if (error || !data) {
      throw new ObjectNotFoundError();
    }

    return {
      buffer: Buffer.from(await data.arrayBuffer()),
      contentType: data.type || "application/octet-stream",
    };
  }

  // Returns a short-lived signed URL the browser can PUT the file straight to.
  async getObjectEntityUploadURL(): Promise<string> {
    const name = `uploads/${randomUUID()}`;

    const { data, error } = await supabaseStorage
      .from(PRIVATE_BUCKET)
      .createSignedUploadUrl(name);

    if (error || !data) {
      throw new Error(`Failed to create signed upload URL: ${error?.message}`);
    }

    return data.signedUrl;
  }

  // Gets a private object entity from its app path.
  async getObjectEntityFile(objectPath: string): Promise<StoredObject> {
    const key = toObjectKey(objectPath);
    const object = makeObject(PRIVATE_BUCKET, key);

    if (!(await objectExists(object.bucket, object.name))) {
      throw new ObjectNotFoundError();
    }
    return object;
  }

  // Gets a public file (profile pictures, logos, etc.) from its app path.
  async getPublicFile(objectPath: string): Promise<StoredObject> {
    const key = toObjectKey(objectPath);
    const object = makeObject(PUBLIC_BUCKET, key);

    if (!(await objectExists(object.bucket, object.name))) {
      throw new ObjectNotFoundError();
    }
    return object;
  }

  async searchPublicObject(filePath: string): Promise<StoredObject | null> {
    const object = makeObject(PUBLIC_BUCKET, filePath);
    return (await objectExists(object.bucket, object.name)) ? object : null;
  }

  // Maps a raw upload URL back to the app-relative "/objects/..." path.
  // Supabase signed upload URLs look like:
  //   https://<ref>.supabase.co/storage/v1/object/upload/sign/<bucket>/<key>?token=...
  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("http")) {
      return rawPath;
    }

    let pathname: string;
    try {
      pathname = new URL(rawPath).pathname;
    } catch {
      return rawPath;
    }

    for (const bucket of [PRIVATE_BUCKET, PUBLIC_BUCKET]) {
      const marker = `/${bucket}/`;
      const at = pathname.indexOf(marker);
      if (at !== -1) {
        const key = pathname.slice(at + marker.length);
        if (key) return `/objects/${decodeURIComponent(key)}`;
      }
    }

    return rawPath;
  }

  // Sets the ACL policy for the object entity and returns the normalized path.
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const object = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(object, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: StoredObject;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      object: objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }

  // Upload a file buffer directly to private storage.
  async uploadFile({
    buffer,
    filename,
    contentType,
    aclPolicy,
  }: {
    buffer: Buffer;
    filename: string;
    contentType: string;
    aclPolicy?: ObjectAclPolicy;
  }): Promise<{ url: string; path: string }> {
    const extension = filename.includes(".") ? filename.split(".").pop() : "";
    const objectId = randomUUID();
    const name = `uploads/${extension ? `${objectId}.${extension}` : objectId}`;

    const { error } = await supabaseStorage
      .from(PRIVATE_BUCKET)
      .upload(name, buffer, { contentType, upsert: false });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    const object = makeObject(PRIVATE_BUCKET, name);
    if (aclPolicy) {
      await setObjectAclPolicy(object, aclPolicy);
    }

    return { url: object.objectPath, path: object.objectPath };
  }

  // Upload a file to public storage (profile pictures, logos, etc.).
  async uploadPublicFile({
    buffer,
    folder,
    filename,
    contentType,
  }: {
    buffer: Buffer;
    folder: string;
    filename: string;
    contentType: string;
  }): Promise<{ url: string; path: string }> {
    const extension = filename.includes(".") ? filename.split(".").pop() : "";
    const objectId = randomUUID();
    const name = `${folder}/${extension ? `${objectId}.${extension}` : objectId}`;

    const { error } = await supabaseStorage
      .from(PUBLIC_BUCKET)
      .upload(name, buffer, { contentType, upsert: false });

    if (error) {
      throw new Error(`Failed to upload public file: ${error.message}`);
    }

    const object = makeObject(PUBLIC_BUCKET, name);
    await setObjectAclPolicy(object, { visibility: "public" });

    return { url: object.objectPath, path: object.objectPath };
  }
}
