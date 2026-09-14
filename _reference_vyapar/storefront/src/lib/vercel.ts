/**
 * Vercel Domains API Integration
 * Automatically provisions SSL certificates and routes traffic for tenant custom domains.
 */

export async function addCustomDomainToVercel(domain: string, redirectTarget?: string) {
  const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
  const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
  const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

  if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
    console.warn('[Vercel API] Missing VERCEL_API_TOKEN or VERCEL_PROJECT_ID in environment. Skipping domain mapping.');
    return { success: false, error: 'Missing Vercel credentials' };
  }

  try {
    // API Route to add a domain to a Vercel Project
    // Documentation: https://vercel.com/docs/rest-api/endpoints/projects#add-a-domain-to-a-project
    let url = `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`;
    if (VERCEL_TEAM_ID) {
      url += `?teamId=${VERCEL_TEAM_ID}`;
    }

    const payload: any = { name: domain };
    
    // If a redirect target is provided, set up Edge network 308 redirect
    if (redirectTarget) {
      payload.redirect = redirectTarget;
      payload.redirectStatusCode = 308;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Vercel API Error]', data);
      return { success: false, error: data.error?.message || 'Failed to map domain to Vercel' };
    }

    console.log(`[Vercel API] Successfully mapped custom domain: ${domain}`);
    return { success: true, data };
  } catch (error: any) {
    console.error('[Vercel API Exception]', error);
    return { success: false, error: error.message };
  }
}

export async function checkDomainStatusFromVercel(domain: string) {
  const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
  const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
  const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

  if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
    return { success: false, error: 'Missing Vercel credentials' };
  }

  try {
    let url = `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`;
    if (VERCEL_TEAM_ID) {
      url += `?teamId=${VERCEL_TEAM_ID}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error?.message || 'Failed to check domain status' };
    }

    return { 
      success: true, 
      verified: data.verified,
      status: data.verified ? 'active' : 'pending',
      verification: data.verification // Contains DNS records needed (type, domain, value)
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removeCustomDomainFromVercel(domain: string) {
  const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
  const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
  const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

  if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
    return { success: false, error: 'Missing Vercel credentials' };
  }

  try {
    let url = `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`;
    if (VERCEL_TEAM_ID) {
      url += `?teamId=${VERCEL_TEAM_ID}`;
    }

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.error?.message || 'Failed to remove domain' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
