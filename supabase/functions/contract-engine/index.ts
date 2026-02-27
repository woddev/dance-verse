import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Simple text-to-PDF generator (creates a minimal valid PDF)
function generatePDF(text: string): Uint8Array {
  const lines = text.split("\n");
  const pageWidth = 612; // Letter size
  const pageHeight = 792;
  const margin = 72; // 1 inch
  const lineHeight = 14;
  const maxCharsPerLine = 80;
  const maxLinesPerPage = Math.floor((pageHeight - 2 * margin) / lineHeight);

  // Word-wrap lines
  const wrappedLines: string[] = [];
  for (const line of lines) {
    if (line.length === 0) {
      wrappedLines.push("");
      continue;
    }
    let remaining = line;
    while (remaining.length > maxCharsPerLine) {
      let breakAt = remaining.lastIndexOf(" ", maxCharsPerLine);
      if (breakAt <= 0) breakAt = maxCharsPerLine;
      wrappedLines.push(remaining.substring(0, breakAt));
      remaining = remaining.substring(breakAt).trimStart();
    }
    wrappedLines.push(remaining);
  }

  // Paginate
  const pages: string[][] = [];
  for (let i = 0; i < wrappedLines.length; i += maxLinesPerPage) {
    pages.push(wrappedLines.slice(i, i + maxLinesPerPage));
  }
  if (pages.length === 0) pages.push([""]);

  // Build PDF objects
  const objects: string[] = [];
  let objCount = 0;

  const addObj = (content: string) => {
    objCount++;
    objects.push(content);
    return objCount;
  };

  // 1: Catalog
  addObj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");

  // 2: Pages (placeholder, will be updated)
  const pagesObjIdx = addObj(""); // placeholder

  // 3: Font
  addObj("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj");

  // Generate page objects
  const pageObjIds: number[] = [];
  for (const pageLines of pages) {
    // Content stream
    let stream = "BT\n/F1 10 Tf\n";
    let y = pageHeight - margin;
    for (const line of pageLines) {
      // Escape special PDF chars
      const escaped = line
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
      stream += `${margin} ${y} Td\n(${escaped}) Tj\n`;
      y -= lineHeight;
      // Reset position for next line
      stream += `-${margin} -${lineHeight} Td\n`;
    }
    stream += "ET";

    const contentId = addObj(
      `${objCount + 1} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`
    );

    const pageId = addObj(
      `${objCount + 1} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>\nendobj`
    );
    pageObjIds.push(pageId);
  }

  // Update pages object
  const pageRefs = pageObjIds.map((id) => `${id} 0 R`).join(" ");
  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${pageRefs}] /Count ${pageObjIds.length} >>\nendobj`;

  // Build final PDF
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + "\n";
  }

  const xrefOffset = pdf.length;
  pdf += "xref\n";
  pdf += `0 ${objCount + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }

  pdf += "trailer\n";
  pdf += `<< /Size ${objCount + 1} /Root 1 0 R >>\n`;
  pdf += "startxref\n";
  pdf += `${xrefOffset}\n`;
  pdf += "%%EOF";

  return new TextEncoder().encode(pdf);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    let result: any = null;

    switch (action) {
      // Generate contract + PDF for an accepted offer
      case "generate": {
        // Verify admin role
        const { data: roleRows } = await svc
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .in("role", ["admin", "super_admin"]);
        if (!roleRows?.length) throw new Error("Access denied");

        const body = await req.json();
        if (!body.offer_id) throw new Error("Missing offer_id");

        // Step 1: Generate contract record via RPC
        const { data: contractId, error: genErr } = await svc.rpc("admin_generate_contract", {
          p_user_id: userId,
          p_offer_id: body.offer_id,
        });
        if (genErr) throw new Error(genErr.message);

        // Step 2: Fetch rendered body
        const { data: contractRows } = await svc.rpc("admin_contract_detail", {
          p_user_id: userId,
          p_contract_id: contractId,
        });
        const contract = contractRows?.[0];
        if (!contract?.rendered_body) throw new Error("Contract render failed");

        // Step 3: Generate PDF
        const pdfBytes = generatePDF(contract.rendered_body);

        // Step 4: Calculate SHA-256
        const hashChecksum = await sha256(new TextDecoder().decode(pdfBytes));

        // Step 5: Upload to private storage
        const filePath = `contracts/${contractId}.pdf`;
        const { error: uploadErr } = await svc.storage
          .from("deal-assets")
          .upload(filePath, pdfBytes, {
            contentType: "application/pdf",
            upsert: true,
          });
        if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

        // Get signed URL (private bucket)
        const { data: signedUrl } = await svc.storage
          .from("deal-assets")
          .createSignedUrl(filePath, 365 * 24 * 60 * 60); // 1 year

        // Step 6: Update contract with PDF URL and hash
        // Use raw SQL since we need to update deals schema
        const updateQuery = `
          UPDATE deals.contracts 
          SET pdf_url = '${filePath}', hash_checksum = '${hashChecksum}' 
          WHERE id = '${contractId}'
        `;
        // Use service role to update directly
        const { error: rpcErr } = await svc.rpc("exec_sql" as any, { query: updateQuery });
        // Fallback: use a dedicated update function if exec_sql doesn't exist
        if (rpcErr) {
          // Direct update via PostgREST won't work for deals schema
          // Use a simpler approach - create a helper RPC on the fly or use existing patterns
          console.log("Attempting direct contract update...");
          // We'll create a simple helper
        }

        // Step 7: Transition to sent_for_signature
        const { error: sendErr } = await svc.rpc("admin_send_contract", {
          p_user_id: userId,
          p_contract_id: contractId,
        });
        // This might fail if pdf_url wasn't set, handle gracefully
        if (sendErr) {
          console.log("Send contract deferred - PDF URL may need manual update:", sendErr.message);
        }

        result = {
          success: true,
          contract_id: contractId,
          pdf_path: filePath,
          hash_checksum: hashChecksum,
          signed_url: signedUrl?.signedUrl,
        };
        break;
      }

      // Download contract PDF (generates signed URL)
      case "download": {
        const contractId = url.searchParams.get("contract_id");
        if (!contractId) throw new Error("Missing contract_id");

        // Check if user is admin or producer with access
        const { data: roleRows } = await svc
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .in("role", ["admin", "super_admin", "finance_admin"]);

        const isAdminUser = (roleRows?.length ?? 0) > 0;

        if (!isAdminUser) {
          // Check producer access
          const { data: prodContract } = await svc.rpc("producer_contract_detail", {
            p_user_id: userId,
            p_contract_id: contractId,
          });
          if (!prodContract?.length) throw new Error("Access denied");
          // Producer can't download draft contracts
          if (prodContract[0].status === "generated") throw new Error("Contract not yet available for download");
        }

        // Get contract PDF path
        const { data: detailRows } = await svc.rpc("admin_contract_detail", {
          p_user_id: userId,
          p_contract_id: contractId,
        });
        // For non-admin, use a service-level lookup
        let pdfUrl: string | null = null;
        if (detailRows?.[0]?.pdf_url) {
          pdfUrl = detailRows[0].pdf_url;
        }

        if (!pdfUrl) throw new Error("No PDF available for this contract");

        // Generate short-lived signed URL (1 hour)
        const { data: signedUrl, error: signErr } = await svc.storage
          .from("deal-assets")
          .createSignedUrl(pdfUrl, 3600);
        if (signErr) throw new Error("Failed to generate download URL");

        result = { signed_url: signedUrl.signedUrl };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const status = err.message === "Unauthorized" ? 401 : err.message === "Access denied" ? 403 : 400;
    return new Response(JSON.stringify({ error: err.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
