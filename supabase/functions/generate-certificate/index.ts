import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// Generate a unique certificate code
function generateCertificateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'VC-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Format date in Portuguese
function formatDate(date: Date): string {
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
}

// Generate SVG certificate (can be converted to PDF on client)
function generateCertificateSVG(
  studentName: string,
  moduleTitle: string | null,
  certificateType: string,
  certificateCode: string,
  issuedAt: Date
): string {
  const title = certificateType === 'course' 
    ? 'Certificado de Conclusão do Curso'
    : `Certificado de Conclusão do Módulo`;
  
  const description = certificateType === 'course'
    ? 'concluiu com êxito o curso completo de programação'
    : `concluiu com êxito o módulo "${moduleTitle}"`;

  const formattedDate = formatDate(issuedAt);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#d4af37" />
      <stop offset="50%" style="stop-color:#f4d03f" />
      <stop offset="100%" style="stop-color:#d4af37" />
    </linearGradient>
    <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#8b5cf6" />
      <stop offset="100%" style="stop-color:#a78bfa" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="800" height="600" fill="url(#bgGradient)"/>
  
  <!-- Decorative Border -->
  <rect x="20" y="20" width="760" height="560" fill="none" stroke="url(#goldGradient)" stroke-width="3" rx="10"/>
  <rect x="30" y="30" width="740" height="540" fill="none" stroke="url(#goldGradient)" stroke-width="1" rx="8"/>
  
  <!-- Top Decorative Line -->
  <line x1="100" y1="80" x2="700" y2="80" stroke="url(#goldGradient)" stroke-width="2"/>
  
  <!-- Logo/Icon Area -->
  <circle cx="400" cy="120" r="35" fill="url(#primaryGradient)"/>
  <text x="400" y="130" font-family="Arial, sans-serif" font-size="30" fill="white" text-anchor="middle">🎓</text>
  
  <!-- Title -->
  <text x="400" y="190" font-family="Georgia, serif" font-size="28" fill="url(#goldGradient)" text-anchor="middle" font-weight="bold">
    ${title}
  </text>
  
  <!-- Subtitle -->
  <text x="400" y="230" font-family="Arial, sans-serif" font-size="14" fill="#a0a0a0" text-anchor="middle">
    VIBE CLASS - Aprenda Programação com IA
  </text>
  
  <!-- Certificate Text -->
  <text x="400" y="280" font-family="Arial, sans-serif" font-size="16" fill="#e0e0e0" text-anchor="middle">
    Certificamos que
  </text>
  
  <!-- Student Name -->
  <text x="400" y="330" font-family="Georgia, serif" font-size="36" fill="white" text-anchor="middle" font-weight="bold">
    ${studentName}
  </text>
  
  <!-- Underline for name -->
  <line x1="150" y1="345" x2="650" y2="345" stroke="url(#goldGradient)" stroke-width="1"/>
  
  <!-- Description -->
  <text x="400" y="390" font-family="Arial, sans-serif" font-size="16" fill="#e0e0e0" text-anchor="middle">
    ${description}
  </text>
  
  ${certificateType === 'module' ? `
  <text x="400" y="420" font-family="Arial, sans-serif" font-size="14" fill="#a0a0a0" text-anchor="middle">
    do curso de programação da plataforma Vibe Class
  </text>
  ` : ''}
  
  <!-- Date -->
  <text x="400" y="470" font-family="Arial, sans-serif" font-size="14" fill="#a0a0a0" text-anchor="middle">
    Emitido em ${formattedDate}
  </text>
  
  <!-- Bottom Decorative Line -->
  <line x1="100" y1="500" x2="700" y2="500" stroke="url(#goldGradient)" stroke-width="2"/>
  
  <!-- Certificate Code -->
  <text x="400" y="540" font-family="monospace" font-size="12" fill="#8b5cf6" text-anchor="middle">
    Código de Autenticidade: ${certificateCode}
  </text>
  
  <!-- Decorative Corners -->
  <path d="M40,50 L60,50 L60,70" fill="none" stroke="url(#goldGradient)" stroke-width="2"/>
  <path d="M760,50 L740,50 L740,70" fill="none" stroke="url(#goldGradient)" stroke-width="2"/>
  <path d="M40,550 L60,550 L60,530" fill="none" stroke="url(#goldGradient)" stroke-width="2"/>
  <path d="M760,550 L740,550 L740,530" fill="none" stroke="url(#goldGradient)" stroke-width="2"/>
  
  <!-- Stars Decoration -->
  <text x="100" y="120" font-size="20" fill="url(#goldGradient)">★</text>
  <text x="700" y="120" font-size="20" fill="url(#goldGradient)">★</text>
  <text x="100" y="490" font-size="20" fill="url(#goldGradient)">★</text>
  <text x="700" y="490" font-size="20" fill="url(#goldGradient)">★</text>
</svg>`;
}

serve(async (req) => {
  // Handle CORS
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { studentId, studentName, moduleId, moduleTitle, certificateType } = await req.json();

    if (!studentId || !studentName || !certificateType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if certificate already exists
    let existingQuery = supabase
      .from('certificates')
      .select('*')
      .eq('student_id', studentId)
      .eq('certificate_type', certificateType);

    if (moduleId) {
      existingQuery = existingQuery.eq('module_id', moduleId);
    }

    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      // Return existing certificate
      const svg = generateCertificateSVG(
        existing.student_name,
        existing.module_title,
        existing.certificate_type,
        existing.certificate_code,
        new Date(existing.issued_at)
      );

      return new Response(
        JSON.stringify({ 
          certificate: existing,
          svg,
          message: 'Certificate already exists'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate new certificate
    const certificateCode = generateCertificateCode();
    const issuedAt = new Date();

    const { data: newCert, error: insertError } = await supabase
      .from('certificates')
      .insert({
        student_id: studentId,
        student_name: studentName,
        module_id: moduleId || null,
        module_title: moduleTitle || null,
        certificate_type: certificateType,
        certificate_code: certificateCode,
        issued_at: issuedAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating certificate:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create certificate' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const svg = generateCertificateSVG(
      studentName,
      moduleTitle,
      certificateType,
      certificateCode,
      issuedAt
    );

    return new Response(
      JSON.stringify({ 
        certificate: newCert,
        svg,
        message: 'Certificate created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-certificate:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
