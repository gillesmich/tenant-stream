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
  // Basic PDF structure
  const objects: string[] = [];
  
  // PDF Catalog
  objects.push(`1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj`);

  // Pages object
  objects.push(`2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj`);

  // Page object
  objects.push(`3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Resources <<
  /Font <<
    /F1 4 0 R
  >>
>>
/Contents 5 0 R
>>
endobj`);

  // Font object
  objects.push(`4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj`);

  // Content stream
  let content = `BT
/F1 18 Tf
50 760 Td
(${title}) Tj
0 -28 Td
/F1 12 Tf
(${subtitle}) Tj
/F1 10 Tf
0 0 Td`;

  let yPos = 0;
  sections.forEach((section, index) => {
    const truncatedSection = section.substring(0, 200);
    content += `
0 -${60 + yPos} Td
(${truncatedSection.replace(/[()\\]/g, '\\$&')}) Tj`;
    yPos += 20;
  });

  content += `
ET`;

  objects.push(`5 0 obj
<<
/Length ${content.length}
>>
stream
${content}
endstream
endobj`);

  // Build PDF
  let pdf = '%PDF-1.4\n';
  const xrefPos = pdf.length;
  
  objects.forEach((obj, index) => {
    pdf += `${index + 1} 0 obj\n${obj}\n\n`;
  });

  // Cross-reference table
  pdf += 'xref\n';
  pdf += `0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  
  let pos = 9; // Start after '%PDF-1.4\n'
  objects.forEach(obj => {
    pdf += `${pos.toString().padStart(10, '0')} 00000 n \n`;
    pos += obj.length + 12; // obj length + "X 0 obj\n" + "\n\n"
  });

  // Trailer
  pdf += 'trailer\n';
  pdf += `<<
/Size ${objects.length + 1}
/Root 1 0 R
>>\n`;
  pdf += `startxref\n${pdf.length - pdf.indexOf('xref')}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}