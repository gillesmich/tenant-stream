import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inventoryId } = await req.json();

    if (!inventoryId) {
      return new Response(
        JSON.stringify({ error: 'inventoryId is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch inventory data
    const { data: inventory, error } = await supabase
      .from('inventories')
      .select(`
        *,
        properties(address, title, surface, property_type)
      `)
      .eq('id', inventoryId)
      .single();

    if (error || !inventory) {
      console.error('Error fetching inventory:', error);
      return new Response(
        JSON.stringify({ error: 'Inventory not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate inventory data
    if (!validateInventoryData(inventory)) {
      return new Response(
        JSON.stringify({ error: 'Invalid inventory data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate HTML content
    const htmlContent = generateInventoryHTML(inventory);

    // Generate PDF from HTML
    const pdfBytes = generatePDFFromHTML(htmlContent);

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="etat-des-lieux-${inventoryId}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function validateInventoryData(inventory: any): boolean {
  return !!(
    inventory.inventory_date &&
    inventory.inventory_type &&
    inventory.rooms &&
    Array.isArray(inventory.rooms)
  );
}

function generateInventoryHTML(inventory: any): string {
  const property = inventory.properties;
  const rooms = inventory.rooms || [];
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>État des Lieux</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 20px; }
        .room { margin-bottom: 15px; border: 1px solid #ddd; padding: 10px; }
        .room-header { font-weight: bold; margin-bottom: 10px; }
        .condition { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
        .condition-neuf { background-color: #22c55e; color: white; }
        .condition-bon { background-color: #3b82f6; color: white; }
        .condition-moyen { background-color: #f59e0b; color: white; }
        .condition-mauvais { background-color: #ef4444; color: white; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>ÉTAT DES LIEUX</h1>
        <h2>${inventory.inventory_type === 'entree' ? 'D\'ENTRÉE' : 'DE SORTIE'}</h2>
      </div>
      
      <div class="section">
        <h3>INFORMATIONS GÉNÉRALES</h3>
        <p><strong>Date:</strong> ${new Date(inventory.inventory_date).toLocaleDateString('fr-FR')}</p>
        <p><strong>Propriété:</strong> ${property?.title || 'Non spécifiée'}</p>
        <p><strong>Adresse:</strong> ${property?.address || 'Non spécifiée'}</p>
        ${property?.surface ? `<p><strong>Surface:</strong> ${property.surface} m²</p>` : ''}
        ${property?.property_type ? `<p><strong>Type:</strong> ${property.property_type}</p>` : ''}
      </div>
      
      <div class="section">
        <h3>DÉTAIL DES PIÈCES</h3>
        ${rooms.map((room: any) => `
          <div class="room">
            <div class="room-header">
              ${room.name}
              <span class="condition condition-${room.condition}">
                ${getConditionLabel(room.condition)}
              </span>
            </div>
            ${room.description ? `<p><strong>Description:</strong> ${room.description}</p>` : ''}
            ${room.photos && room.photos.length > 0 ? `<p><strong>Photos:</strong> ${room.photos.length} photo(s) attachée(s)</p>` : ''}
          </div>
        `).join('')}
      </div>
      
      ${inventory.general_comments ? `
        <div class="section">
          <h3>COMMENTAIRES GÉNÉRAUX</h3>
          <p>${inventory.general_comments}</p>
        </div>
      ` : ''}
      
      <div class="section" style="margin-top: 40px;">
        <p>Date de génération: ${new Date().toLocaleDateString('fr-FR')}</p>
      </div>
    </body>
    </html>
  `;
}

function getConditionLabel(condition: string): string {
  const labels: { [key: string]: string } = {
    'neuf': 'Neuf',
    'bon': 'Bon état',
    'moyen': 'État moyen',
    'mauvais': 'Mauvais état'
  };
  return labels[condition] || condition;
}

function generatePDFFromHTML(htmlContent: string): Uint8Array {
  const getTagText = (tag: string) => {
    const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(htmlContent);
    return match ? stripHtmlEntities(match[1].trim()) : '';
  };

  const title = getTagText('h1') || 'ÉTAT DES LIEUX';
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

  // Prepare PDF objects (same stable approach as lease function)
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