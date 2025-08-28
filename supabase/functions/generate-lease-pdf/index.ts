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

    // Pour une vraie implémentation, utiliser une librairie comme Puppeteer ou jsPDF
    // Ici on retourne un PDF simple simulé
    const pdfBuffer = generateSimplePDF(htmlContent);

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

function generateSimplePDF(htmlContent: string): Uint8Array {
  // Simulation d'un PDF basique - dans une vraie implémentation, 
  // utiliser une vraie librairie de génération PDF
  const pdfHeader = "%PDF-1.4\n";
  const pdfContent = `
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Contrat de location généré) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
296
%%EOF
`;

  const fullPdf = pdfHeader + pdfContent;
  return new TextEncoder().encode(fullPdf);
}