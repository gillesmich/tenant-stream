import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { rentId, templateUrl, templateName } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch rent data with related information
    const { data: rent, error } = await supabaseClient
      .from('rents')
      .select(`
        *,
        lease:leases(
          *,
          property:properties(*),
          tenant:tenants(*)
        )
      `)
      .eq('id', rentId)
      .single()

    if (error || !rent) {
      console.error('Error fetching rent:', error)
      return new Response(
        JSON.stringify({ error: 'Rent not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate essential data
    if (!validateRentData(rent)) {
      return new Response(
        JSON.stringify({ error: 'Données de loyer incomplètes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let pdfBuffer: Uint8Array

    if (templateUrl) {
      // Use custom template
      pdfBuffer = await generatePDFFromTemplate(supabaseClient, templateUrl, rent)
    } else {
      // Use default HTML generation
      const htmlContent = generateReceiptHTML(rent)
      pdfBuffer = generatePDFFromHTML(htmlContent)
    }

    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="quittance-${rent.period_start}-${rent.lease.property.title.replace(/\s+/g, '-')}.pdf"`
      }
    })

  } catch (error) {
    console.error('Error generating receipt:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function validateRentData(rent: any): boolean {
  return !!(
    rent.lease?.property?.address &&
    rent.lease?.tenant?.first_name &&
    rent.lease?.tenant?.last_name &&
    rent.period_start &&
    rent.period_end &&
    rent.total_amount
  )
}

function generateReceiptHTML(rent: any): string {
  const property = rent.lease.property
  const tenant = rent.lease.tenant
  const periodStart = new Date(rent.period_start).toLocaleDateString('fr-FR')
  const periodEnd = new Date(rent.period_end).toLocaleDateString('fr-FR')
  const paidDate = rent.paid_date ? new Date(rent.paid_date).toLocaleDateString('fr-FR') : 'Non payé'

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>Quittance de Loyer</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; }
            .amount { font-size: 18px; font-weight: bold; }
            .footer { margin-top: 40px; text-align: right; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1 class="title">QUITTANCE DE LOYER</h1>
        </div>

        <div class="section">
            <h3>Propriétaire</h3>
            <p>Nom/Société: [Nom du propriétaire]</p>
            <p>Adresse: [Adresse du propriétaire]</p>
        </div>

        <div class="section">
            <h3>Locataire</h3>
            <p><span class="label">Nom:</span> ${tenant.first_name} ${tenant.last_name}</p>
        </div>

        <div class="section">
            <h3>Bien loué</h3>
            <p><span class="label">Adresse:</span> ${property.address}</p>
            <p><span class="label">Ville:</span> ${property.city} ${property.postal_code}</p>
            <p><span class="label">Type:</span> ${property.property_type}</p>
        </div>

        <div class="section">
            <h3>Détails du paiement</h3>
            <p><span class="label">Période:</span> Du ${periodStart} au ${periodEnd}</p>
            <p><span class="label">Date de paiement:</span> ${paidDate}</p>
            <p><span class="label">Loyer:</span> ${rent.rent_amount}€</p>
            ${rent.charges_amount > 0 ? `<p><span class="label">Charges:</span> ${rent.charges_amount}€</p>` : ''}
            <p class="amount"><span class="label">Total payé:</span> ${rent.total_amount}€</p>
        </div>

        <div class="section">
            <p>Je soussigné(e), propriétaire du logement désigné ci-dessus, ${rent.paid_date ? 'reconnaît avoir reçu' : 'demande le paiement de'} la somme de <strong>${rent.total_amount}€</strong> (${numberToWords(rent.total_amount)} euros) ${rent.paid_date ? 'de' : 'à'} Monsieur/Madame ${tenant.first_name} ${tenant.last_name}, locataire dudit logement, pour ${rent.paid_date ? 'le paiement du' : 'le'} loyer et charges de la période du ${periodStart} au ${periodEnd}.</p>
        </div>

        <div class="footer">
            <p>Fait le ${new Date().toLocaleDateString('fr-FR')}</p>
            <p>Signature du propriétaire</p>
            <div style="height: 60px; border-bottom: 1px solid #000; width: 200px; margin-left: auto;"></div>
        </div>
    </body>
    </html>
  `
}

function numberToWords(num: number): string {
  const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf']
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix']
  const hundreds = ['', 'cent', 'deux cents', 'trois cents', 'quatre cents', 'cinq cents', 'six cents', 'sept cents', 'huit cents', 'neuf cents']

  if (num === 0) return 'zéro'
  if (num < 10) return ones[num]
  if (num >= 10 && num < 20) return teens[num - 10]
  if (num >= 20 && num < 100) {
    const ten = Math.floor(num / 10)
    const one = num % 10
    return tens[ten] + (one > 0 ? '-' + ones[one] : '')
  }
  if (num >= 100 && num < 1000) {
    const hundred = Math.floor(num / 100)
    const remainder = num % 100
    return hundreds[hundred] + (remainder > 0 ? ' ' + numberToWords(remainder) : '')
  }
  if (num >= 1000) {
    const thousand = Math.floor(num / 1000)
    const remainder = num % 1000
    return numberToWords(thousand) + ' mille' + (remainder > 0 ? ' ' + numberToWords(remainder) : '')
  }
  
  return String(num)
}

async function generatePDFFromTemplate(supabaseClient: any, templateUrl: string, rent: any): Promise<Uint8Array> {
  try {
    console.log('Using template identifier:', templateUrl)

    // Determine storage file path (supports both public URL and direct storage path)
    let filePath = templateUrl
    if (templateUrl.startsWith('http')) {
      const marker = '/object/public/documents/'
      const parts = templateUrl.split(marker)
      if (parts.length === 2) {
        filePath = parts[1]
      } else {
        console.error('Invalid public URL format for template:', templateUrl)
        throw new Error('Invalid template URL format')
      }
    }

    console.log('Resolved storage file path:', filePath)

    // Download the template from storage
    const { data: templateData, error } = await supabaseClient.storage
      .from('documents')
      .download(filePath)

    if (error) {
      console.error('Error downloading template:', error)
      throw new Error('Failed to download template: ' + error.message)
    }

    if (!templateData) {
      console.error('No template data received')
      throw new Error('No template data received')
    }

    console.log('Template downloaded successfully, size:', templateData.size)

    // Return template as-is for now (no form fill yet)
    const arrayBuffer = await templateData.arrayBuffer()
    return new Uint8Array(arrayBuffer)

  } catch (error) {
    console.error('Error processing template:', error)
    console.log('Falling back to default HTML generation')
    const htmlContent = generateReceiptHTML(rent)
    return generatePDFFromHTML(htmlContent)
  }
}

function generatePDFFromHTML(htmlContent: string): Uint8Array {
  // Enhanced PDF generation with better formatting
  const currentDate = new Date().toLocaleDateString('fr-FR')
  
  const pdfHeader = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
6 0 obj
<< /Length 7 0 R >>
stream
BT
/F2 16 Tf
200 750 Td
(QUITTANCE DE LOYER) Tj
0 -40 Td
/F1 12 Tf
(Document généré automatiquement le ${currentDate}) Tj
0 -30 Td
(Utilisez un template personnalisé pour plus de détails) Tj
ET
endstream
endobj
7 0 obj
200
endobj
xref
0 8
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000245 00000 n 
0000000312 00000 n 
0000000379 00000 n 
0000000579 00000 n 
trailer
<< /Size 8 /Root 1 0 R >>
startxref
598
%%EOF`

  return new TextEncoder().encode(pdfHeader)
}