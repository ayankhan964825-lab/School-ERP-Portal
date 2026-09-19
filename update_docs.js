const fs = require('fs');

const addendum = `
## [v2.0 SaaS Architecture Upgrades]
This document has been upgraded with the following SaaS features:
1. **ERPVyapar Rebranding**: The platform is now named ERPVyapar.
2. **Multi-School Login Logic**: Users belonging to multiple schools will be prompted with a "Select School" box upon logging in.
3. **Dedicated School Login Panels**: Generic login is deprecated. Each school has dedicated URLs (\`/school/[slug]/staff-login\` and \`/school/[slug]/student-login\`).
4. **Custom Domains**: Schools can attach custom domains (e.g., \`gmacademy.com\`) stored in the \`customDomain\` field, routed dynamically via Next.js middleware.
5. **Custom Roles (RBAC)**: The hardcoded Role enum is replaced by a dynamic \`SystemRole\` table allowing Super Admins to create customized roles combining multiple permissions (e.g., Admissions + Transport).
6. **Master Admin Portal**: The developer/agency portal is strictly isolated at a secret \`/hq\` route. Master Admins cannot use school login pages.
`;

['prd.md', 'trd.md', 'system_design.md', 'design.md', 'phase.md'].forEach(file => {
  if (fs.existsSync(file)) {
    fs.appendFileSync(file, addendum);
    console.log('Appended to ' + file);
  }
});
