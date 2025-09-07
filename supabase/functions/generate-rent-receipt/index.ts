import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'

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
      pdfBuffer = await generatePDFFromTemplate(supabaseClient, templateUrl, rent, templateName)
    } else {
      // Use default HTML generation with owner data
      const htmlContent = await generateReceiptHTMLWithOwnerData(supabaseClient, rent)
      pdfBuffer = await generatePDFFromHTML(htmlContent)
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
            .owner-data { display: none; } /* Hidden data for extraction */
        </style>
    </head>
    <body>
        <!-- Hidden owner data for PDF generation -->
        <div class="owner-data" data-owner-id="${rent.owner_id || rent.lease?.owner_id}"></div>
        
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

async function generateReceiptHTMLWithOwnerData(supabaseClient: any, rent: any): Promise<string> {
  // Fetch owner profile for complete information
  let ownerName = '[Nom du propriétaire]'
  let ownerAddress = '[Adresse du propriétaire]'
  
  try {
    const { data: ownerProfile } = await supabaseClient
      .from('profiles')
      .select('first_name,last_name,company,address_line1,address_line2,city,postal_code,country')
      .eq('user_id', rent.owner_id ?? rent.lease?.owner_id)
      .single()
    
    if (ownerProfile) {
      ownerName = ownerProfile.company || [ownerProfile.first_name, ownerProfile.last_name].filter(Boolean).join(' ')
      const addressParts = [
        ownerProfile.address_line1,
        ownerProfile.address_line2,
        ownerProfile.postal_code,
        ownerProfile.city,
        ownerProfile.country
      ].filter(Boolean)
      ownerAddress = addressParts.join(', ')
    }
  } catch (e) {
    console.log('Owner profile lookup failed, using defaults:', e?.message || e)
  }

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
            .owner-data { display: none; } /* Hidden data for extraction */
        </style>
    </head>
    <body>
        <!-- Hidden owner data for PDF generation -->
        <div class="owner-data" 
             data-owner-name="${ownerName}" 
             data-owner-address="${ownerAddress}"></div>
        
        <div class="header">
            <h1 class="title">QUITTANCE DE LOYER</h1>
        </div>

        <div class="section">
            <h3>Propriétaire</h3>
            <p>Nom/Société: ${ownerName}</p>
            <p>Adresse: ${ownerAddress}</p>
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

async function generatePDFFromTemplate(supabaseClient: any, templateUrl: string, rent: any, templateName?: string): Promise<Uint8Array> {
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

    const templateBytes = new Uint8Array(await templateData.arrayBuffer())
    const pdfDoc = await PDFDocument.load(templateBytes)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

    const property = rent.lease?.property || {}
    const tenant = rent.lease?.tenant || {}
    const periodStart = new Date(rent.period_start)
    const periodEnd = new Date(rent.period_end)
    const paidDate = rent.paid_date ? new Date(rent.paid_date).toLocaleDateString('fr-FR') : 'Non payé'

    // Try to fill AcroForm fields if present
    try {
      const form = pdfDoc.getForm()
      const fields = form.getFields()
      console.log('PDF form fields detected:', fields.map((f: any) => f.getName()))

      // If there are fields, attempt intelligent mapping based on field names
      if (fields.length > 0) {
        // Fetch owner profile for landlord name and address
        let ownerName = ''
        let ownerAddress = ''
        try {
          const { data: ownerProfile } = await supabaseClient
            .from('profiles')
            .select('first_name,last_name,company,address_line1,address_line2,city,postal_code,country')
            .eq('user_id', rent.owner_id ?? rent.lease?.owner_id)
            .single()
          if (ownerProfile) {
            ownerName = ownerProfile.company || [ownerProfile.first_name, ownerProfile.last_name].filter(Boolean).join(' ')
            const addressParts = [
              ownerProfile.address_line1,
              ownerProfile.address_line2,
              ownerProfile.postal_code,
              ownerProfile.city,
              ownerProfile.country
            ].filter(Boolean)
            ownerAddress = addressParts.join(', ')
          }
        } catch (e) {
          console.log('Owner profile lookup failed, continuing without:', e?.message || e)
        }

        const monthLabel = periodStart.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
        const amount = (n: any) => Number(n ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

        const values: Record<string, string> = {
          locataire: `${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim(),
          tenant: `${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim(),
          bailleur: ownerName,
          proprietaire: ownerName,
          owner: ownerName,
          landlord: ownerName,
          adressebailleur: ownerAddress,
          adresseproprietaire: ownerAddress,
          owneraddress: ownerAddress,
          landlordaddress: ownerAddress,
          adresse: property.address ?? '',
          address: property.address ?? '',
          ville: property.city ?? '',
          city: property.city ?? '',
          codepostal: property.postal_code ?? '',
          postal: property.postal_code ?? '',
          mois: monthLabel,
          periode: `Du ${periodStart.toLocaleDateString('fr-FR')} au ${periodEnd.toLocaleDateString('fr-FR')}`,
          month: monthLabel,
          loyer: amount(rent.rent_amount),
          rent: amount(rent.rent_amount),
          charges: amount(rent.charges_amount),
          total: amount(rent.total_amount),
          date: new Date().toLocaleDateString('fr-FR'),
          paiement: paidDate,
        }

        const setIfMatch = (fieldName: string) => {
          const key = fieldName.toLowerCase().replace(/\s|_/g, '')
          // Try direct match, then includes-based heuristics
          const direct = Object.keys(values).find(k => key === k)
          if (direct) return values[direct]
          if (key.includes('locataire') || key.includes('tenant')) return values.locataire
          if (key.includes('bailleur') || key.includes('proprietaire') || key.includes('owner') || key.includes('landlord')) return values.bailleur
          if (key.includes('adressebailleur') || key.includes('adresseproprietaire') || key.includes('owneraddress') || key.includes('landlordaddress')) return values.adressebailleur
          if (key.includes('adresse') || key.includes('address')) return values.adresse
          if (key.includes('ville') || key.includes('city')) return values.ville
          if (key.includes('codepostal') || key.includes('postal') || key.includes('cp')) return values.codepostal
          if (key.includes('periode') || key.includes('mois') || key.includes('month')) return values.periode
          if (key.includes('loyer') || key.includes('rent')) return values.loyer
          if (key.includes('charge')) return values.charges
          if (key.includes('total')) return values.total
          if (key.includes('date')) return values.date
          if (key.includes('paiement') || key.includes('paid')) return values.paiement
          return undefined
        }

        let filledCount = 0
        for (const f of fields) {
          const name = f.getName()
          const val = setIfMatch(name)
          if (val !== undefined) {
            try {
              // Prefer text fields
              const tf = form.getTextField(name)
              tf.setText(String(val))
              filledCount++
              console.log(`Filled field: ${name} -> ${val}`)
            } catch (_) {
              // Not a text field; ignore gracefully
              console.log(`Skipped non-text field: ${name}`)
            }
          } else {
            console.log(`No mapping for field: ${name}`)
          }
        }

        // If nothing filled by name, try sequential fallback based on typical receipt order
        if (filledCount === 0) {
          console.log('No fields matched by name; applying sequential fallback mapping', { templateName })
          const monthLabel = periodStart.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
          const seqValues = [
            // 1. Mois/Période (souvent en premier sur les quittances)
            (values.mois || monthLabel || ''),
            // 2. Bailleur (owner)
            (values.bailleur || ''),
            // 3. Adresse du bailleur
            (values.adressebailleur || ownerAddress || ''),
            // 4. Locataire (tenant)
            (values.locataire || ''),
            // 5. Adresse du bien
            (values.adresse || ''),
            // 6. Code postal du bien
            (values.codepostal || ''),
            // 7. Ville du bien
            (values.ville || ''),
            // 8. Loyer
            (values.loyer || ''),
            // 9. Charges
            (values.charges || ''),
            // 10. Total
            (values.total || ''),
            // 11. Date
            (values.date || ''),
            // 12. Paiement (date ou statut)
            (values.paiement || '')
          ]
          const allFields = form.getFields()
          for (let i = 0; i < Math.min(seqValues.length, allFields.length); i++) {
            const name = allFields[i].getName()
            try {
              const tf = form.getTextField(name)
              tf.setText(String(seqValues[i] ?? ''))
              filledCount++
              console.log(`Sequentially filled field #${i + 1} (${name}) -> ${seqValues[i]}`)
            } catch (_) {
              console.log(`Skipped non-text field during sequential mapping: ${name}`)
            }
          }
        }

        // Update appearances and flatten to keep values visible everywhere
        try { form.updateFieldAppearances(font) } catch (_) {}
        try { form.flatten() } catch (_) {}

        const pdfBytes = await pdfDoc.save()
        if (filledCount > 0) return pdfBytes
        console.log('Form detected but no fields mapped, falling back to simple overlay text')
      } else {
        console.log('No form fields detected, drawing simple overlay text')
      }
    } catch (e) {
      console.log('No AcroForm or failed to process form fields, fallback to overlay text:', e?.message || e)
    }

    // Fallback overlay text rendering
    const page = pdfDoc.getPages()[0]
    const { height } = page.getSize()
    const left = 50
    let y = height - 60

    const lines = [
      'Quittance de loyer',
      `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim(),
      `${property.address || ''}`.trim(),
      `Période: ${periodStart.toLocaleDateString('fr-FR')} - ${periodEnd.toLocaleDateString('fr-FR')}`,
      `Loyer: ${rent.rent_amount ?? 0}€  Charges: ${rent.charges_amount ?? 0}€  Total: ${rent.total_amount ?? 0}€`,
      `Paiement: ${paidDate}`
    ]

    lines.forEach((text, idx) => {
      if (text && String(text).trim().length > 0) {
        page.drawText(String(text), { x: left, y: y - idx * 16, size: idx === 0 ? 14 : 11, font, color: rgb(0, 0, 0) })
      }
    })

    const pdfBytes = await pdfDoc.save()
    return pdfBytes

  } catch (error) {
    console.error('Error processing template:', error)
    console.log('Falling back to default HTML generation')
    const htmlContent = await generateReceiptHTMLWithOwnerData(supabaseClient, rent)
    return generatePDFFromHTML(htmlContent)
  }
}

async function generatePDFFromHTML(htmlContent: string): Promise<Uint8Array> {
  // Create a proper PDF using pdf-lib instead of raw PDF code
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842]) // A4 size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  const { width, height } = page.getSize()
  let y = height - 80
  const leftMargin = 50
  const rightMargin = width - 50
  
  // Extract data from HTML content for structured PDF
  const property = extractDataFromHTML(htmlContent, 'property')
  const tenant = extractDataFromHTML(htmlContent, 'tenant')
  const amounts = extractDataFromHTML(htmlContent, 'amounts')
  const dates = extractDataFromHTML(htmlContent, 'dates')
  const owner = extractDataFromHTML(htmlContent, 'owner')
  
  // Title
  page.drawText('QUITTANCE DE LOYER', {
    x: leftMargin,
    y: y,
    size: 20,
    font: boldFont,
    color: rgb(0, 0, 0),
  })
  y -= 60
  
  // Landlord section
  page.drawText('BAILLEUR :', {
    x: leftMargin,
    y: y,
    size: 12,
    font: boldFont,
  })
  y -= 25
  page.drawText(`Nom/Société : ${owner.name || '[Nom du propriétaire]'}`, {
    x: leftMargin,
    y: y,
    size: 10,
    font: font,
  })
  y -= 20
  page.drawText(`Adresse : ${owner.address || '[Adresse du propriétaire]'}`, {
    x: leftMargin,
    y: y,
    size: 10,
    font: font,
  })
  y -= 40
  
  // Tenant section
  page.drawText('LOCATAIRE :', {
    x: leftMargin,
    y: y,
    size: 12,
    font: boldFont,
  })
  y -= 25
  page.drawText(`Nom : ${tenant.name || '[Nom du locataire]'}`, {
    x: leftMargin,
    y: y,
    size: 10,
    font: font,
  })
  y -= 40
  
  // Property section
  page.drawText('BIEN LOUÉ :', {
    x: leftMargin,
    y: y,
    size: 12,
    font: boldFont,
  })
  y -= 25
  page.drawText(`Adresse : ${property.address || '[Adresse du bien]'}`, {
    x: leftMargin,
    y: y,
    size: 10,
    font: font,
  })
  y -= 20
  page.drawText(`Ville : ${property.city || '[Ville]'} ${property.postalCode || '[Code postal]'}`, {
    x: leftMargin,
    y: y,
    size: 10,
    font: font,
  })
  y -= 20
  page.drawText(`Type : ${property.type || '[Type de bien]'}`, {
    x: leftMargin,
    y: y,
    size: 10,
    font: font,
  })
  y -= 40
  
  // Payment details
  page.drawText('DÉTAILS DU PAIEMENT :', {
    x: leftMargin,
    y: y,
    size: 12,
    font: boldFont,
  })
  y -= 25
  page.drawText(`Période : ${dates.period || '[Période]'}`, {
    x: leftMargin,
    y: y,
    size: 10,
    font: font,
  })
  y -= 20
  page.drawText(`Date de paiement : ${dates.payment || 'Non payé'}`, {
    x: leftMargin,
    y: y,
    size: 10,
    font: font,
  })
  y -= 20
  page.drawText(`Loyer : ${amounts.rent || '0'}€`, {
    x: leftMargin,
    y: y,
    size: 10,
    font: font,
  })
  y -= 20
  if (amounts.charges && parseFloat(amounts.charges) > 0) {
    page.drawText(`Charges : ${amounts.charges}€`, {
      x: leftMargin,
      y: y,
      size: 10,
      font: font,
    })
    y -= 20
  }
  page.drawText(`TOTAL PAYÉ : ${amounts.total || '0'}€`, {
    x: leftMargin,
    y: y,
    size: 12,
    font: boldFont,
  })
  y -= 40
  
  // Declaration text
  const declarationText = `Je soussigné(e), propriétaire du logement désigné ci-dessus, ${dates.payment ? 'reconnaît avoir reçu' : 'demande le paiement de'} la somme de ${amounts.total || '0'}€ ${dates.payment ? 'de' : 'à'} ${tenant.name || 'Monsieur/Madame [Nom du locataire]'}, locataire dudit logement, pour ${dates.payment ? 'le paiement du' : 'le'} loyer et charges de la période ${dates.period || '[période]'}.`
  
  // Word wrap for declaration
  const words = declarationText.split(' ')
  let line = ''
  const maxWidth = rightMargin - leftMargin - 20
  
  for (const word of words) {
    const testLine = line + word + ' '
    const testWidth = font.widthOfTextAtSize(testLine, 10)
    
    if (testWidth > maxWidth && line.length > 0) {
      page.drawText(line.trim(), {
        x: leftMargin,
        y: y,
        size: 10,
        font: font,
      })
      y -= 20
      line = word + ' '
    } else {
      line = testLine
    }
  }
  
  if (line.trim().length > 0) {
    page.drawText(line.trim(), {
      x: leftMargin,
      y: y,
      size: 10,
      font: font,
    })
    y -= 40
  }
  
  // Signature section
  page.drawText(`Fait le ${new Date().toLocaleDateString('fr-FR')}`, {
    x: rightMargin - 200,
    y: y,
    size: 10,
    font: font,
  })
  y -= 20
  page.drawText('Signature du propriétaire', {
    x: rightMargin - 200,
    y: y,
    size: 10,
    font: font,
  })
  
  // Signature line
  page.drawLine({
    start: { x: rightMargin - 200, y: y - 40 },
    end: { x: rightMargin - 50, y: y - 40 },
    thickness: 1,
    color: rgb(0, 0, 0),
  })
  
  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}

function extractDataFromHTML(htmlContent: string, section: string): any {
  // Extract data from the HTML content for structured display
  const doc = htmlContent
  
  if (section === 'owner') {
    const nameMatch = doc.match(/data-owner-name="([^"]*)"/)
    const addressMatch = doc.match(/data-owner-address="([^"]*)"/)
    
    return {
      name: nameMatch ? nameMatch[1] : '',
      address: addressMatch ? addressMatch[1] : ''
    }
  }
  
  if (section === 'tenant') {
    const nameMatch = doc.match(/Nom:<\/span>\s*([^<]+)/)
    return {
      name: nameMatch ? nameMatch[1].trim() : ''
    }
  }
  
  if (section === 'property') {
    const addressMatch = doc.match(/Adresse:<\/span>\s*([^<]+)/)
    const cityMatch = doc.match(/Ville:<\/span>\s*([^<]+)/)
    const typeMatch = doc.match(/Type:<\/span>\s*([^<]+)/)
    
    return {
      address: addressMatch ? addressMatch[1].trim() : '',
      city: cityMatch ? cityMatch[1].trim().split(' ')[0] : '',
      postalCode: cityMatch ? cityMatch[1].trim().split(' ')[1] : '',
      type: typeMatch ? typeMatch[1].trim() : ''
    }
  }
  
  if (section === 'amounts') {
    const rentMatch = doc.match(/Loyer:<\/span>\s*([0-9.]+)/)
    const chargesMatch = doc.match(/Charges:<\/span>\s*([0-9.]+)/)
    const totalMatch = doc.match(/Total payé:<\/span>\s*([0-9.]+)/)
    
    return {
      rent: rentMatch ? rentMatch[1] : '',
      charges: chargesMatch ? chargesMatch[1] : '',
      total: totalMatch ? totalMatch[1] : ''
    }
  }
  
  if (section === 'dates') {
    const periodMatch = doc.match(/Période:<\/span>\s*([^<]+)/)
    const paymentMatch = doc.match(/Date de paiement:<\/span>\s*([^<]+)/)
    
    return {
      period: periodMatch ? periodMatch[1].trim() : '',
      payment: paymentMatch ? paymentMatch[1].trim() : ''
    }
  }
  
  return {}
}