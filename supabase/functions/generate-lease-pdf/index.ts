import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leaseId } = await req.json();
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Récupérer les données du bail
    const { data: lease, error: leaseError } = await supabaseAdmin
      .from("leases")
      .select(`
        *,
        properties (*),
        tenants (*)
      `)
      .eq("id", leaseId)
      .single();

    if (leaseError || !lease) {
      throw new Error("Bail introuvable");
    }

    // Générer le contenu HTML du bail
    const htmlContent = generateLeaseHTML(lease);

    // Valider les données du bail avant génération
    if (!validateLeaseData(lease)) {
      throw new Error("Données du bail incomplètes ou invalides");
    }

    // Créer un PDF avec le contenu structuré
    const pdfBuffer = generatePDFFromHTML(htmlContent);

    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="bail-${leaseId}.pdf"`
      }
    });

  } catch (error: any) {
    console.error("Erreur génération PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

function validateLeaseData(lease: any): boolean {
  const required = [
    lease.properties?.address,
    lease.tenants?.first_name,
    lease.tenants?.last_name,
    lease.start_date,
    lease.rent_amount,
    lease.lease_type
  ];
  
  return required.every(field => field !== null && field !== undefined && field !== '');
}

function generateLeaseHTML(lease: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Contrat de Location</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 40px; }
        .section { margin-bottom: 30px; }
        .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .party { width: 45%; }
        .signature { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>CONTRAT DE LOCATION</h1>
        <h2>${lease.lease_type === 'meuble' ? 'LOGEMENT MEUBLÉ' : 'LOGEMENT VIDE'}</h2>
      </div>

      <div class="parties">
        <div class="party">
          <h3>BAILLEUR</h3>
          <p><strong>Nom:</strong> [À compléter]</p>
          <p><strong>Adresse:</strong> [À compléter]</p>
        </div>
        <div class="party">
          <h3>LOCATAIRE</h3>
          <p><strong>Nom:</strong> ${lease.tenants?.first_name} ${lease.tenants?.last_name}</p>
          <p><strong>Email:</strong> ${lease.tenants?.email || 'Non renseigné'}</p>
        </div>
      </div>

      <div class="section">
        <h3>DÉSIGNATION DU LOCAL</h3>
        <p><strong>Adresse:</strong> ${lease.properties?.address}</p>
        <p><strong>Type:</strong> ${lease.properties?.property_type}</p>
        <p><strong>Surface:</strong> ${lease.properties?.surface || 'Non renseignée'} m²</p>
        <p><strong>Nombre de pièces:</strong> ${lease.properties?.rooms || 'Non renseigné'}</p>
      </div>

      <div class="section">
        <h3>DURÉE ET CONDITIONS FINANCIÈRES</h3>
        <p><strong>Date de début:</strong> ${new Date(lease.start_date).toLocaleDateString('fr-FR')}</p>
        <p><strong>Date de fin:</strong> ${lease.end_date ? new Date(lease.end_date).toLocaleDateString('fr-FR') : 'Indéterminée'}</p>
        <p><strong>Loyer mensuel:</strong> ${lease.rent_amount}€</p>
        <p><strong>Charges:</strong> ${lease.charges_amount || 0}€</p>
        <p><strong>Dépôt de garantie:</strong> ${lease.deposit_amount || 'Aucun'}€</p>
      </div>

      <div class="section">
        <h3>OBLIGATIONS</h3>
        <p>Le locataire s'engage à:</p>
        <ul>
          <li>Payer le loyer et les charges aux échéances convenues</li>
          <li>Occuper personnellement le logement</li>
          <li>Entretenir le logement en bon état</li>
          <li>Respecter le règlement intérieur</li>
        </ul>
      </div>

      ${lease.notes ? `
      <div class="section">
        <h3>NOTES PARTICULIÈRES</h3>
        <p>${lease.notes}</p>
      </div>
      ` : ''}

      <div class="signature">
        <div class="parties">
          <div class="party">
            <p>Signature du bailleur</p>
            <br><br><br>
            <p>Date: _______________</p>
          </div>
          <div class="party">
            <p>Signature du locataire</p>
            <br><br><br>
            <p>Date: _______________</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generatePDFFromHTML(htmlContent: string): Uint8Array {
  // Extraire les données importantes du HTML pour créer un PDF structuré
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");
  
  // Extraire le texte principal
  const title = doc?.querySelector('h1')?.textContent || "CONTRAT DE LOCATION";
  const subtitle = doc?.querySelector('h2')?.textContent || "";
  const sections = Array.from(doc?.querySelectorAll('.section') || [])
    .map(section => section.textContent?.trim() || "")
    .filter(text => text.length > 0);
  
  return generateStructuredPDF(title, subtitle, sections);
}

function generateStructuredPDF(title: string, subtitle: string, sections: string[]): Uint8Array {
  const sanitize = (s: string) => s.replace(/[\r\n]+/g, ' ').replace(/[()\\]/g, '');

  // Build the text content stream
  let yPos = 760; // start near top of page (height 792)
  const lines: string[] = [];
  lines.push('BT');
  lines.push('/F1 18 Tf');
  lines.push(`50 ${yPos} Td`);
  lines.push(`(${sanitize(title)}) Tj`);

  if (subtitle) {
    lines.push('0 -28 Td');
    lines.push('/F1 12 Tf');
    lines.push(`(${sanitize(subtitle)}) Tj`);
  }

  lines.push('/F1 10 Tf');
  let currentY = 704; // move down below headings
  let lastY = yPos - 28 - 28; // approximate last Y used

  sections.forEach((section) => {
    if (currentY < 100) return; // simple single-page guard
    const text = sanitize(section).substring(0, 500);

    // Move down relative to previous line
    const deltaY = currentY - lastY;
    lines.push(`0 ${deltaY} Td`); // relative vertical move
    lines.push(`(${text}) Tj`);

    lastY = currentY;
    currentY -= 60;
  });

  lines.push('ET');

  const contentStream = lines.join('\n');
  const encoder = new TextEncoder();

  // Prepare PDF objects
  const header = '%PDF-1.4\n';

  const obj1 = `1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n\n`;

  const obj2 = `2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n\n`;

  const obj3 = `3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Resources <<\n  /Font <<\n    /F1 4 0 R\n  >>\n>>\n/Contents 5 0 R\n>>\nendobj\n\n`;

  const obj4 = `4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n\n`;

  const contentBytes = encoder.encode(contentStream);
  const obj5Header = `5 0 obj\n<<\n/Length ${contentBytes.length}\n>>\nstream\n`;
  const obj5Footer = `\nendstream\nendobj\n\n`;

  // Build body and compute byte offsets
  const offsets: number[] = []; // index = object number
  let body = '';
  let pos = header.length; // byte position starts after header

  // Object 1
  offsets[1] = pos; body += obj1; pos += obj1.length;
  // Object 2
  offsets[2] = pos; body += obj2; pos += obj2.length;
  // Object 3
  offsets[3] = pos; body += obj3; pos += obj3.length;
  // Object 4
  offsets[4] = pos; body += obj4; pos += obj4.length;
  // Object 5 (stream)
  offsets[5] = pos; body += obj5Header; pos += obj5Header.length;
  body += contentStream; pos += contentStream.length;
  body += obj5Footer; pos += obj5Footer.length;

  const xrefPos = header.length + body.length;
  const pad = (n: number) => n.toString().padStart(10, '0');

  const xref = `xref\n0 6\n0000000000 65535 f \n${pad(offsets[1])} 00000 n \n${pad(offsets[2])} 00000 n \n${pad(offsets[3])} 00000 n \n${pad(offsets[4])} 00000 n \n${pad(offsets[5])} 00000 n \n`;

  const trailer = `trailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n${xrefPos}\n%%EOF\n`;

  const pdf = header + body + xref + trailer;
  return encoder.encode(pdf);
}