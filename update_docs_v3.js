const fs = require('fs');

const addendum = `
## [v3.0 Timetable & Teacher Enrollment Architecture]
This document has been updated with the following architectural decisions for Teacher & Timetable Modules:
1. **Teacher Enrollment**: Supports 3 modes: (A) QR-Based Self-Onboarding via public form, (B) Bulk Excel Import for onboarding 50+ staff instantly, (C) Manual Admin Entry.
2. **Teacher Preferences**: During enrollment, the system captures Max Periods/Week, Core Subjects, and Eligible Classes to define algorithmic limits.
3. **Smart Excel Master Import**: Admin can download a pre-filled Excel template (with dropdowns), fill out the manual timetable, and upload it to auto-create \`ClassTeacher\` mappings and \`TimetablePeriod\` rows instantly.
4. **Auto-Generate Timetable**: A single-click feature that processes the *entire* school at once using advanced algorithms (e.g., Genetic Algorithms) to prevent local minima and avoid conflicts for shared resources (PT/Computer teachers).
5. **Smart Typing Grid**: A keyboard-first dynamic UI for manual timetable entry where typing a teacher's name auto-suggests available teachers and highlights conflicts instantly.
6. **Drag-and-Drop Swapping**: To tweak a fully generated timetable, dragging one assigned period onto another will cleanly *Swap* them without destroying the class subject balance.
7. **Teacher Replacement & Proxies**: Built-in edge-case handling for mid-session teacher resignations (one-click transfer of all periods) and leave proxies (suggesting available teachers for a specific day/period).
`;

['prd.md', 'trd.md', 'system_design.md', 'design.md', 'phase.md'].forEach(file => {
  if (fs.existsSync(file)) {
    fs.appendFileSync(file, addendum);
    console.log('Appended to ' + file);
  }
});
