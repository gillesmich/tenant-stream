import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";


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
  const getTagText = (tag: string) => {
    const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(htmlContent);
    return match ? stripHtmlEntities(match[1].trim()) : '';
  };

  const title = getTagText('h1') || 'CONTRAT DE LOCATION';
  const subtitle = getTagText('h2') || '';

  const sections: string[] = [];
  const sectionRegex = new RegExp('<div[^>]*class=["\'][^"\']*section[^"\']*["\'][^>]*>([\\s\\S]*?)<\\/div>', 'gi');
  let m: RegExpExecArray | null;
  while ((m = sectionRegex.exec(htmlContent)) !== null) {
    const text = stripHtmlTags(m[1]);
    const cleaned = text.replace(/\\s+/g, ' ').trim();
    if (cleaned) sections.push(cleaned);
  }

  return generateStructuredPDF(title, subtitle, sections);
}

function stripHtmlTags(input: string): string {
  return stripHtmlEntities(input.replace(/<[^>]+>/g, ' '));
}

function stripHtmlEntities(input: string): string {
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  };
  return input.replace(/&[a-zA-Z#0-9]+;/g, (e) => entities[e] ?? ' ');
}

function generateStructuredPDF(title: string, subtitle: string, sections: string[]): Uint8Array {
  const sanitize = (s: string) => s.replace(/[\r\n]+/g, ' ').replace(/[()\\]/g, '');
  
  // Fonction pour diviser le texte en lignes de longueur appropriée
  const wrapText = (text: string, maxLength: number = 80): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + ' ' + word).length <= maxLength) {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Build the text content stream with proper formatting
  const lines: string[] = [];
  lines.push('BT');
  lines.push('/F1 16 Tf'); // Titre principal plus grand
  lines.push('50 750 Td');
  lines.push(`(${sanitize(title)}) Tj`);

  if (subtitle) {
    lines.push('0 -24 Td');
    lines.push('/F1 12 Tf');
    lines.push(`(${sanitize(subtitle)}) Tj`);
  }

  lines.push('0 -40 Td'); // Espace après le titre
  lines.push('/F1 10 Tf');

  sections.forEach((section, index) => {
    if (index > 0) {
      lines.push('0 -20 Td'); // Espace entre les sections
    }
    
    // Extraire le titre de section s'il y en a un
    const titleMatch = section.match(/^([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ\s]+):/);
    if (titleMatch) {
      const sectionTitle = titleMatch[1];
      const sectionContent = section.substring(titleMatch[0].length).trim();
      
      // Titre de section en gras
      lines.push('/F1 11 Tf');
      lines.push(`(${sanitize(sectionTitle)}:) Tj`);
      lines.push('0 -16 Td');
      lines.push('/F1 9 Tf');
      
      // Contenu de la section avec retour à la ligne approprié
      const wrappedLines = wrapText(sanitize(sectionContent), 70);
      wrappedLines.forEach((line, lineIndex) => {
        if (lineIndex > 0) lines.push('0 -12 Td');
        lines.push(`(${line}) Tj`);
      });
    } else {
      // Section sans titre spécifique
      const wrappedLines = wrapText(sanitize(section), 70);
      wrappedLines.forEach((line, lineIndex) => {
        if (lineIndex > 0) lines.push('0 -12 Td');
        lines.push(`(${line}) Tj`);
      });
    }
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