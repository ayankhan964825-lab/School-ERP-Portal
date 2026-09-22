/**
 * Vercel Domains API Utility
 * Used to automatically attach subdomains to the Vercel project when a new school is onboarded.
 */

export async function addDomainToVercel(subdomain: string) {
  try {
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN
    const projectId = process.env.VERCEL_PROJECT_ID
    const token = process.env.VERCEL_ACCESS_TOKEN

    if (!rootDomain || !projectId || !token) {
      console.warn("Vercel API credentials not fully configured. Skipping domain creation.")
      return { success: false, error: "Missing Vercel credentials" }
    }

    // Determine the full domain name
    // e.g. "vinay" + ".schoolsaathi.dpdns.org"
    const fullDomain = `${subdomain}.${rootDomain}`

    const response = await fetch(`https://api.vercel.com/v10/projects/${projectId}/domains`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: fullDomain }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Failed to add domain to Vercel:", errorData)
      return { success: false, error: errorData }
    }

    const data = await response.json()
    console.log(`Successfully added domain ${fullDomain} to Vercel.`)
    return { success: true, data }

  } catch (error) {
    console.error("Error calling Vercel Domains API:", error)
    return { success: false, error }
  }
}
