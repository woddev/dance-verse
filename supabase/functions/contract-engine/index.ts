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
        const body = await req.json();
        if (!body.offer_id) throw new Error("Missing offer_id");

        // Check if caller is admin or producer
        const { data: roleRows } = await svc
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .in("role", ["admin", "super_admin"]);
        const isAdmin = (roleRows?.length ?? 0) > 0;

        let contractId: string;

        if (isAdmin) {
          // Admin path: use admin_generate_contract
          const { data: cId, error: genErr } = await svc.rpc("admin_generate_contract", {
            p_user_id: userId,
            p_offer_id: body.offer_id,
          });
          if (genErr) throw new Error(genErr.message);
          contractId = cId;
        } else {
          // Producer path: use auto_generate_contract (no admin check, offer must be accepted)
          const { data: cId, error: genErr } = await svc.rpc("auto_generate_contract", {
            p_offer_id: body.offer_id,
          });
          if (genErr) throw new Error(genErr.message);
          contractId = cId;
        }

        // Step 2: Fetch rendered body using admin RPC (works with service role)
        const { data: contractRows, error: cdErr } = await svc.rpc("admin_contract_detail", {
          p_user_id: userId,
          p_contract_id: contractId,
        });
        // If admin RPC fails (non-admin user), try producer RPC
        let renderedBody: string | null = null;
        if (cdErr || !contractRows?.length) {
          const { data: prodRows } = await svc.rpc("producer_contract_detail", {
            p_user_id: userId,
            p_contract_id: contractId,
          });
          renderedBody = prodRows?.[0]?.rendered_body;
        } else {
          renderedBody = contractRows[0]?.rendered_body;
        }
        if (!renderedBody) {
          console.error("Contract fetch error, contractId:", contractId);
          throw new Error("Contract render failed");
        }

        // Step 3: Generate PDF
        const pdfBytes = generatePDF(renderedBody);

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
        if (isAdmin) {
          const { error: updateErr2 } = await svc.rpc("admin_update_contract_pdf", {
            p_user_id: userId,
            p_contract_id: contractId,
            p_pdf_url: filePath,
            p_hash_checksum: hashChecksum,
          });
          if (updateErr2) throw new Error(`Failed to update contract PDF: ${updateErr2.message}`);

          // Step 7: Transition to sent_for_signature
          const { error: sendErr } = await svc.rpc("admin_send_contract", {
            p_user_id: userId,
            p_contract_id: contractId,
          });
          if (sendErr) {
            console.log("Send contract deferred:", sendErr.message);
          }
        } else {
          // Producer auto-generate path: use service role to update directly
          // Update PDF URL and hash
          const { error: upErr } = await svc
            .schema("deals" as any)
            .from("contracts")
            .update({ pdf_url: filePath, hash_checksum: hashChecksum })
            .eq("id", contractId);
          if (upErr) throw new Error(`Failed to update contract PDF: ${upErr.message}`);

          // Transition to sent_for_signature using deals.transition_contract_state
          // We call it via raw SQL since it's in the deals schema
          const { error: transErr } = await svc.rpc("admin_send_contract", {
            p_user_id: userId,
            p_contract_id: contractId,
          });
          // If admin_send_contract fails due to role check, do it directly
          if (transErr) {
            // Direct update via service role
            const { error: directErr } = await svc
              .schema("deals" as any)
              .from("contracts")
              .update({ status: "sent_for_signature" })
              .eq("id", contractId);
            if (directErr) console.log("Status transition deferred:", directErr.message);
            // Log state history
            await svc
              .schema("deals" as any)
              .from("contract_state_history")
              .insert({
                contract_id: contractId,
                previous_state: "generated",
                new_state: "sent_for_signature",
                changed_by: userId,
              });
          }
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

      // Append signature page to PDF and recalculate hash
      case "append-signature": {
        const body = await req.json();
        const { contract_id, signer_role, signer_name, signed_at } = body;
        if (!contract_id || !signer_role) throw new Error("Missing contract_id or signer_role");

        // Verify caller has any relevant role
        const { data: roleCheck } = await svc
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .in("role", ["admin", "super_admin", "producer"]);
        if (!roleCheck?.length) throw new Error("Access denied");

        // Use service role to get contract data (bypasses role checks)
        // Query admin_contract_detail with a known-good admin approach:
        // Since svc is service role, we can use any admin user or query directly
        // Simplest: use admin_contract_detail but pass userId — if producer, it will fail
        // So we try both approaches
        let contract: any = null;
        const { data: adminRows } = await svc.rpc("admin_contract_detail", {
          p_user_id: userId,
          p_contract_id: contract_id,
        });
        contract = adminRows?.[0];
        if (!contract) {
          // For producer callers: use producer_contract_detail
          const { data: prodRows } = await svc.rpc("producer_contract_detail", {
            p_user_id: userId,
            p_contract_id: contract_id,
          });
          contract = prodRows?.[0];
        }
        if (!contract?.pdf_url) throw new Error("No existing PDF to append signature to");

        // Download existing PDF
        const { data: existingPdf, error: dlErr } = await svc.storage
          .from("deal-assets")
          .download(contract.pdf_url);
        if (dlErr || !existingPdf) throw new Error("Failed to download existing PDF");

        const existingText = await existingPdf.text();

        // Build signature page text
        const sigDate = signed_at || new Date().toISOString();
        const signaturePage = [
          "",
          "═".repeat(60),
          "SIGNATURE PAGE",
          "═".repeat(60),
          "",
          `Signer Role: ${signer_role.toUpperCase()}`,
          `Signer Name: ${signer_name || "N/A"}`,
          `Signed At:   ${new Date(sigDate).toUTCString()}`,
          "",
          "By affixing this electronic signature, the above-named party",
          "acknowledges and agrees to the terms set forth in this contract.",
          "",
          `Digital Signature: [${signer_role.toUpperCase()}_SIGNATURE_${Date.now()}]`,
          "",
          "═".repeat(60),
        ].join("\n");

        // Regenerate full PDF with signature page appended
        const renderedBody = contract.rendered_body || "";
        const fullText = renderedBody + "\n\n" + signaturePage;
        const newPdfBytes = generatePDF(fullText);

        // Calculate new hash
        const newHash = await sha256(new TextDecoder().decode(newPdfBytes));

        // Upload new PDF (overwrites old)
        const filePath = contract.pdf_url;
        const { error: upErr } = await svc.storage
          .from("deal-assets")
          .upload(filePath, newPdfBytes, {
            contentType: "application/pdf",
            upsert: true,
          });
        if (upErr) throw new Error(`PDF re-upload failed: ${upErr.message}`);

        // Update hash via direct service-role update (bypasses RLS)
        // We need a special function that allows hash update on signed contracts
        const { error: hashErr } = await svc.rpc("update_contract_hash_after_signature", {
          p_contract_id: contract_id,
          p_hash_checksum: newHash,
        });
        if (hashErr) throw new Error(`Hash update failed: ${hashErr.message}`);

        result = { success: true, new_hash: newHash };
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
