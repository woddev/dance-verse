import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Google Auth helpers ---

function base64url(input: Uint8Array): string {
  let binary = "";
  for (const b of input) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createJWT(serviceAccount: any): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const enc = new TextEncoder();
  const headerB64 = base64url(enc.encode(JSON.stringify(header)));
  const claimB64 = base64url(enc.encode(JSON.stringify(claim)));
  const sigInput = `${headerB64}.${claimB64}`;

  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(sigInput))
  );

  return `${sigInput}.${base64url(signature)}`;
}

async function getAccessToken(serviceAccount: any): Promise<string> {
  const jwt = await createJWT(serviceAccount);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google auth failed: ${errText}`);
  }
  const data = await res.json();
  return data.access_token;
}

// --- Google Drive helpers ---

async function findOrCreateFolder(
  accessToken: string,
  name: string,
  parentId: string
): Promise<string> {
  const q = `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchData = await searchRes.json();
  if (searchData.files?.length > 0) return searchData.files[0].id;

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create folder '${name}': ${errText}`);
  }
  const createData = await createRes.json();
  return createData.id;
}

async function uploadFileToDrive(
  accessToken: string,
  fileName: string,
  mimeType: string,
  fileBytes: Uint8Array,
  parentId: string
): Promise<{ id: string; webViewLink: string }> {
  const metadata = { name: fileName, parents: [parentId] };
  const boundary = "drive_upload_boundary_" + Date.now();
  const metaPart = JSON.stringify(metadata);

  const parts = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metaPart}\r\n`,
    `--${boundary}\r\nContent-Type: ${mimeType}\r\nContent-Transfer-Encoding: binary\r\n\r\n`,
  ];
  const endPart = `\r\n--${boundary}--`;

  const enc = new TextEncoder();
  const part1 = enc.encode(parts[0]);
  const part2 = enc.encode(parts[1]);
  const part3 = enc.encode(endPart);

  const body = new Uint8Array(part1.length + part2.length + fileBytes.length + part3.length);
  body.set(part1, 0);
  body.set(part2, part1.length);
  body.set(fileBytes, part1.length + part2.length);
  body.set(part3, part1.length + part2.length + fileBytes.length);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Drive upload failed: ${errText}`);
  }
  return await res.json();
}

// --- Main handler ---

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const saKeyStr = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!saKeyStr) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY not configured");
    const rootFolderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID");
    if (!rootFolderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID not configured");

    const serviceAccount = JSON.parse(saKeyStr);
    const accessToken = await getAccessToken(serviceAccount);

    const body = await req.json();
    const {
      producer_name,
      file_type, // "track" | "artwork" | "contract"
      file_name,
      mime_type,
      storage_path, // path in deal-assets bucket
      track_id,
      contract_id,
    } = body;

    if (!producer_name || !file_type || !file_name || !storage_path) {
      throw new Error("Missing required fields: producer_name, file_type, file_name, storage_path");
    }

    // Download file from Supabase storage
    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: fileBlob, error: dlErr } = await svc.storage
      .from("deal-assets")
      .download(storage_path);
    if (dlErr || !fileBlob) throw new Error(`Failed to download from storage: ${dlErr?.message}`);

    const fileBytes = new Uint8Array(await fileBlob.arrayBuffer());

    // Build folder hierarchy: Root > Producers > {Producer Name} > {Contracts|Tracks}
    const producersFolder = await findOrCreateFolder(accessToken, "Producers", rootFolderId);
    const producerFolder = await findOrCreateFolder(accessToken, producer_name, producersFolder);

    let targetFolder: string;
    if (file_type === "contract") {
      targetFolder = await findOrCreateFolder(accessToken, "Contracts", producerFolder);
    } else {
      targetFolder = await findOrCreateFolder(accessToken, "Tracks", producerFolder);
    }

    // Upload
    const contentType = mime_type || "application/octet-stream";
    const result = await uploadFileToDrive(accessToken, file_name, contentType, fileBytes, targetFolder);

    const driveUrl = result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`;

    // Update database with Drive URL via RPC functions
    if (contract_id) {
      const { error: updateErr } = await svc.rpc("update_contract_drive_url", {
        p_contract_id: contract_id,
        p_drive_url: driveUrl,
      });
      if (updateErr) console.error("Contract drive URL update failed:", updateErr.message);
    }
    if (track_id) {
      const { error: updateErr } = await svc.rpc("update_track_drive_url", {
        p_track_id: track_id,
        p_drive_url: driveUrl,
      });
      if (updateErr) console.error("Track drive URL update failed:", updateErr.message);
    }

    return new Response(JSON.stringify({ success: true, drive_url: driveUrl, file_id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("sync-to-drive error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
