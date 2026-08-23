import re

data_parts = [
r'''1: /**
2:  * ERP Portal — Complete System Architecture Data
3:  * Total Nodes: 280+
4:  * Roles: Master Admin, Super Admin, Teacher, Student, Parent, Driver, Accountant
5:  */
6: 
7: const TREE_DATA = {
8:   name: "ERP PORTAL",
9:   desc: "Multi-Tenant School ERP SaaS Platform",
10:   icon: "🌐",
11:   color: "master",
12:   children: [
13:     // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14:     // 🛠️ PLATFORM CORE & INFRASTRUCTURE
15:     // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16:     {
17:       name: "PLATFORM CORE",
18:       desc: "Cloud infrastructure, security, auth & databases",
19:       icon: "🛠️",
20:       color: "general",
21:       children: [
22:         {
23:           name: "Authentication & Identity",
24:           desc: "Secure login, roles, and sessions",
25:           icon: "🔐",
26:           color: "general",
27:           children: [
28:             { name: "Role-Based Access (RBAC)", desc: "Strict permissions for 7 user roles", icon: "🛡️", color: "general" },
29:             { name: "JWT Session Management", desc: "Stateless, secure API authentication", icon: "🔑", color: "general" },
30:             { name: "Multi-Factor Auth (MFA)", desc: "Optional OTP for Master & Super Admins", icon: "📱", color: "general" },
31:             { name: "OAuth Integration", desc: "Google/Microsoft login for teachers & students", icon: "🌐", color: "general" },
32:             { name: "Session Hijacking", desc: "Prevent stolen tokens from being reused", icon: "⚠️", color: "edge", edge: true }
33:           ]
34:         },
35:         {
36:           name: "Data Privacy & Security",
37:           desc: "Protecting sensitive student/school data",
38:           icon: "🛡️",
39:           color: "general",
40:           children: [
41:             { name: "Tenant Data Isolation", desc: "Row-Level Security (RLS) in PostgreSQL", icon: "🧱", color: "general" },
42:             { name: "End-to-End Encryption", desc: "Encrypting sensitive fields at rest", icon: "🔒", color: "general" },
43:             { name: "PII Masking", desc: "Masking phone/email for unauthorized roles", icon: "🕵️", color: "general" },
44:             { name: "Data Breach Prevention", desc: "Rate limiting and abnormal activity detection", icon: "⚠️", color: "edge", edge: true }
45:           ]
46:         },
47:         {
48:           name: "SaaS App Builder Engine",
49:           desc: "White-labeling and dynamic UI",
50:           icon: "🏗️",
51:           color: "general",
52:           children: [
53:             { name: "Dynamic Theming", desc: "Custom colors & logos per school tenant", icon: "🎨", color: "general" },
54:             { name: "Custom Domain Mapping", desc: "e.g., erp.schoolname.com via CNAME", icon: "🌐", color: "general" },
55:             { name: "Feature Toggles", desc: "Enable/disable modules based on subscription", icon: "🎛️", color: "general" },
56:             { name: "White-label Mobile App", desc: "Generate distinct APK/iOS apps per school", icon: "📱", color: "general" },
57:             { name: "Theme Conflict", desc: "Ensure accessibility with bad custom colors", icon: "⚠️", color: "edge", edge: true }
58:           ]
59:         },
60:         {
61:           name: "Database Architecture",
62:           desc: "Scalable data storage",
63:           icon: "🗄️",
64:           color: "general",
65:           children: [
66:             { name: "PostgreSQL Core DB", desc: "Relational data with Prisma ORM", icon: "🐘", color: "general" },
67:             { name: "Redis Caching", desc: "Fast retrieval for config & sessions", icon: "⚡", color: "general" },
68:             { name: "Automated Backups", desc: "Daily snapshots & point-in-time recovery", icon: "💾", color: "general" },
69:             { name: "Tenant Scaling Limit", desc: "Handling DB performance at 10,000+ tenants", icon: "⚠️", color: "edge", edge: true }
70:           ]
71:         },
72:         {
73:           name: "API & Integrations",
74:           desc: "External connections and webhooks",
75:           icon: "🔌",
76:           color: "general",
77:           children: [
78:             { name: "Offline Sync Engine", desc: "Local-first architecture with background sync queue", icon: "📴", color: "general" },
79:             { name: "Payment Gateway (Razorpay)", desc: "Fee collection via SmartCollect", icon: "💳", color: "general" },
80:             { name: "SMS Gateway (DLT)", MSG91: "Transactional SMS delivery", icon: "💬", color: "general" },
81:             { name: "WhatsApp Business API", desc: "Automated WhatsApp alerts", icon: "🟢", color: "general" },
82:             { name: "AI Engine (Gemini)", desc: "Narrative report and alert generation", icon: "🤖", color: "general" },
83:             { name: "Third-party API Failure", desc: "Graceful fallback if external API is down", icon: "⚠️", color: "edge", edge: true }
84:           ]
85:         }
86:       ]
87:     },
88: 
89:     // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
90:     // 👑 MASTER ADMIN
91:     // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
92:     {
93:       name: "MASTER ADMIN",
94:       desc: "Platform Owner • Developer-level access",
95:       icon: "👑",
96:       color: "master",
97:       children: [
98:         {
99:           name: "School Management",''',
r'''100:           desc: "Create & manage multiple school tenants",
101:           icon: "🏫",
102:           color: "master",
103:           children: [
104:             { name: "Create New School", desc: "Name, logo, address, academic year config", icon: "➕", color: "master" },
105:             { name: "Edit School Details", desc: "Update school info, branding, contact", icon: "✏️", color: "master" },
106:             { name: "Activate / Deactivate", desc: "Enable or suspend school access", icon: "🔄", color: "master" },
107:             { name: "School-Specific Settings", desc: "Custom config per school (grading scale, shifts)", icon: "⚙️", color: "master" },
108:             { name: "Duplicate School Name", desc: "Prevent two schools with identical names in same city", icon: "⚠️", color: "edge", edge: true },
109:             { name: "Data Isolation", desc: "Ensure School A cannot access School B data", icon: "⚠️", color: "edge", edge: true }
110:           ]
111:         },
112:         {
113:           name: "Super Admin Assignment",
114:           desc: "Assign Principal/Head to each school",
115:           icon: "🔑",
116:           color: "master",
117:           children: [
118:             { name: "Assign Principal Account", desc: "Create Super Admin credentials for school", icon: "👤", color: "master" },
119:             { name: "Transfer Authority", desc: "Change Principal mid-year (old → new)", icon: "🔁", color: "master" },
120:             { name: "Only One Active Super Admin", desc: "Prevent multiple principals with full access simultaneously", icon: "⚠️", color: "edge", edge: true }
121:           ]
122:         },
123:         {
124:           name: "Subscription Management",
125:           desc: "Plans, billing & usage for SaaS model",
126:           icon: "💎",
127:           color: "master",
128:           children: [
129:             { name: "Plan Creation", desc: "Free / Basic / Premium tiers with feature limits", icon: "📋", color: "master" },
130:             { name: "Billing & Invoicing", desc: "Auto-generate monthly/yearly invoices", icon: "🧾", color: "master" },
131:             { name: "Usage Analytics", desc: "Track active users, storage, API calls per school", icon: "📊", color: "master" },
132:             { name: "Graceful Downgrade", desc: "No data loss when school downgrades plan", icon: "⚠️", color: "edge", edge: true }
133:           ]
134:         },
135:         {
136:           name: "Global Analytics",
137:           desc: "Platform-wide insights & health",
138:           icon: "📊",
139:           color: "master",
140:           children: [
141:             { name: "Total Schools", desc: "Count of active/inactive/trial schools", icon: "🏫", color: "master" },
142:             { name: "Active Users", desc: "Total users across all schools", icon: "👥", color: "master" },
143:             { name: "Revenue Dashboard", desc: "MRR, ARR, churn rate", icon: "💰", color: "master" },
144:             { name: "System Health", desc: "Server uptime, DB load, error rates", icon: "🖥️", color: "master" }
145:           ]
146:         },
147:         {
148:           name: "System Settings",
149:           desc: "Global platform configuration",
150:           icon: "⚙️",
151:           color: "master",
152:           children: [
153:             { name: "Default Permissions Template", desc: "Baseline RBAC for new schools", icon: "🔒", color: "master" },
154:             { name: "Feature Flags", desc: "Enable/disable modules globally or per school", icon: "🚩", color: "master" },
155:             { name: "Maintenance Mode", desc: "Take platform offline for updates", icon: "🔧", color: "master" }
156:           ]
157:         }
158:       ]
159:     },
160: 
161:     // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
162:     // 🎓 SUPER ADMIN (Principal)
163:     // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
164:     {
165:       name: "SUPER ADMIN (Principal)",
166:       desc: "Full school access • role=SUPER_ADMIN",
167:       icon: "🎓",
168:       color: "super_admin",
169:       children: [
170:         {
171:           name: "School Dashboard",
172:           desc: "At-a-glance overview of school health",
173:           icon: "📊",
174:           color: "super_admin",
175:           children: [
176:             { name: "Today's Attendance Summary", desc: "% present, absent count, late arrivals", icon: "📋", color: "super_admin" },
177:             { name: "Fee Collection Status", desc: "Collected vs pending for current month", icon: "💰", color: "super_admin" },
178:             { name: "Upcoming Events", desc: "Next exam, PTM, holidays from academic calendar", icon: "📅", color: "super_admin" },
179:             { name: "AI At-Risk Alerts", desc: "Students flagged by Early Warning System", icon: "🚨", color: "super_admin" },
180:             { name: "Syllabus Progress Overview", desc: "Class-wise % completion across subjects", icon: "📚", color: "super_admin" }
181:           ]
182:         },
183:         {
184:           name: "Academic Management",
185:           desc: "Classes, subjects, timetable, syllabus",
186:           icon: "📚",
187:           color: "super_admin",
188:           children: [
189:             {
190:               name: "Class Management",
191:               desc: "Create and organize classes & sections",
192:               icon: "🏛️",
193:               color: "super_admin",
194:               children: [
195:                 { name: "Create Class", desc: "e.g., Class 10-A, Nursery, LKG", icon: "➕", color: "super_admin" },
196:                 { name: "Edit / Delete Class", desc: "Modify class details or remove", icon: "✏️", color: "super_admin" },
197:                 { name: "Section Management", desc: "Sections A, B, C within a class", icon: "📂", color: "super_admin" },
198:                 { name: "Cannot Delete With Active Students", desc: "Block deletion if students are enrolled", icon: "⚠️", color: "edge", edge: true }
199:               ]
200:             },
201:             {
202:               name: "Subject Management",
203:               desc: "Define subjects and assign to classes",
204:               icon: "📖",
205:               color: "super_admin",
206:               children: [
207:                 { name: "Add Subject", desc: "Subject name, code (e.g., MATH-101)", icon: "➕", color: "super_admin" },
208:                 { name: "Assign to Class", desc: "Link subject to specific class/section", icon: "🔗", color: "super_admin" },
209:                 { name: "Removing Subject With Marks", desc: "Prevent deletion if exam marks exist for it", icon: "⚠️", color: "edge", edge: true }
210:               ]
211:             },
212:             {
213:               name: "Class-Teacher Mapping",
214:               desc: "Assign teachers to classes & subjects",
215:               icon: "🔗",
216:               color: "super_admin",
217:               children: [
218:                 { name: "Assign Subject Teacher", desc: "Which teacher teaches which subject in which class", icon: "👨‍🏫", color: "super_admin" },
219:                 { name: "Assign Class Teacher (Head)", desc: "One primary class teacher per section", icon: "⭐", color: "super_admin" },
220:                 { name: "View Mapping Matrix", desc: "Grid view: Teachers × Classes × Subjects", icon: "📊", color: "super_admin" },
221:                 { name: "Same Teacher, Same Period", desc: "AI check: teacher cannot be in two classes at once", icon: "⚠️", color: "edge", edge: true }
222:               ]
223:             },
224:             {
225:               name: "AI Timetable Generator",
226:               desc: "Auto-generate conflict-free schedules",
227:               icon: "🤖",
228:               color: "super_admin",
229:               children: [
230:                 { name: "Input Constraints", desc: "Teacher availability, room limits, subject hours", icon: "📝", color: "super_admin" },
231:                 { name: "Generate Schedule", desc: "AI creates optimal, conflict-free timetable", icon: "⚡", color: "super_admin" },
232:                 { name: "Manual Override", desc: "Principal can swap periods manually after generation", icon: "✋", color: "super_admin" },
233:                 { name: "Insufficient Teachers", desc: "Alert if not enough teachers to fill all slots", icon: "⚠️", color: "edge", edge: true }
234:               ]
235:             },
236:             {
237:               name: "Syllabus Management",
238:               desc: "Define & track syllabus per class per subject",
239:               icon: "📝",
240:               color: "super_admin",
241:               children: [
242:                 { name: "Upload Syllabus", desc: "Topics list per subject per class for the year", icon: "📤", color: "super_admin" },
243:                 { name: "Set Expected Hours", desc: "Expected teaching hours per topic", icon: "⏱️", color: "super_admin" },
244:                 { name: "Track Completion", desc: "Live progress bar of completed vs pending topics", icon: "📊", color: "super_admin" },
245:                 { name: "AI Merge Suggestions", desc: "If behind schedule, AI suggests combining topics", icon: "🤖", color: "super_admin" }
246:               ]
247:             },
248:             {
249:               name: "Academic Calendar",
250:               desc: "School events, exams, holidays",
251:               icon: "📅",
252:               color: "super_admin",
253:               children: [
254:                 { name: "Add Events", desc: "Exams, holidays, PTM, sports day, etc.", icon: "➕", color: "super_admin" },
255:                 { name: "Date-wise View", desc: "Calendar grid with event markers", icon: "📆", color: "super_admin" },
256:                 { name: "Exam on Holiday", desc: "Warn if exam is scheduled on a declared holiday", icon: "⚠️", color: "edge", edge: true }
257:               ]
258:             }
259:           ]
260:         },
261:         {
262:           name: "Teacher Management",
263:           desc: "Add, edit, assign roles to teachers",
264:           icon: "👨‍🏫",
265:           color: "super_admin",
266:           children: [
267:             {
268:               name: "Add / Edit Teacher",
269:               desc: "Teacher profile & credentials",
270:               icon: "👤",
271:               color: "super_admin",
272:               children: [
273:                 { name: "Personal Details", desc: "Name, DOB, contact, address", icon: "📝", color: "super_admin" },
274:                 { name: "Qualification & Experience", desc: "Degrees, certifications, years of experience", icon: "🎓", color: "super_admin" },
275:                 { name: "Login Credentials", desc: "Auto-generate or manual email/password", icon: "🔑", color: "super_admin" },
276:                 { name: "Duplicate Email / Phone", desc: "Block if email or phone already registered", icon: "⚠️", color: "edge", edge: true }
277:               ]
278:             },
279:             {
280:               name: "Roles & Permissions",
281:               desc: "Module-level access for each teacher",
282:               icon: "🔒",
283:               color: "super_admin",
284:               children: [
285:                 { name: "Module Access Control", desc: "Enable/disable specific features per teacher", icon: "✅", color: "super_admin" },
286:                 { name: "Revoking Mid-Session", desc: "Handle when permission removed while teacher is logged in", icon: "⚠️", color: "edge", edge: true }
287:               ]
288:             },
289:             {
290:               name: "Leave Approvals",
291:               desc: "Review teacher leave applications",
292:               icon: "📋",
293:               color: "super_admin",
294:               children: [
295:                 { name: "Pending Approvals", desc: "List of unapproved leave requests", icon: "⏳", color: "super_admin" },
296:                 { name: "AI Substitute Suggestion", desc: "AI recommends which free teacher can cover", icon: "🤖", color: "super_admin" },
297:                 { name: "Leave During Exam", desc: "Flag & warn if teacher is on exam duty during leave dates", icon: "⚠️", color: "edge", edge: true }
298:               ]
299:             }
300:           ]
301:         },
302:         {
303:           name: "Student Management",
304:           desc: "Enrollment, profiles, parent linking",
305:           icon: "👨‍🎓",
306:           color: "super_admin",
307:           children: [
308:             {
309:               name: "Enrollment",
310:               desc: "Add students to the school",
311:               icon: "📝",
312:               color: "super_admin",
313:               children: [
314:                 { name: "Add Student", desc: "Name, DOB, class, section, roll number", icon: "➕", color: "super_admin" },
315:                 { name: "Bulk Import", desc: "Upload CSV/Excel for mass enrollment", icon: "📤", color: "super_admin" },
316:                 { name: "Auto Roll Number", desc: "System assigns sequential roll numbers", icon: "🔢", color: "super_admin" },
317:                 { name: "Duplicate Roll Number", desc: "Prevent same roll no in same class-section", icon: "⚠️", color: "edge", edge: true }
318:               ]
319:             },
320:             {
321:               name: "Profile Management",
322:               desc: "Student personal & medical info",
323:               icon: "👤",
324:               color: "super_admin",
325:               children: [
326:                 { name: "Personal Details", desc: "Name, DOB, address, blood group", icon: "📝", color: "super_admin" },
327:                 { name: "Medical Information", desc: "Allergies, medications, special needs", icon: "🏥", color: "super_admin" },
328:                 { name: "Previous School Records", desc: "TC from previous school, previous marks", icon: "📁", color: "super_admin" },
329:                 { name: "Profile Photo", desc: "Upload student photo for ID & records", icon: "📷", color: "super_admin" }
330:               ]
331:             },
332:             {
333:               name: "Parent Account Linking",
334:               desc: "Connect parent to student profile",
335:               icon: "👨‍👩‍👦",
336:               color: "super_admin",
337:               children: [
338:                 { name: "Link by Phone / Email", desc: "Parent receives invite to create account", icon: "🔗", color: "super_admin" },
339:                 { name: "Multiple Children", desc: "One parent account linked to multiple students", icon: "👥", color: "super_admin" },
340:                 { name: "Wrong Student Linked", desc: "Admin must verify & fix incorrect parent-student mapping", icon: "⚠️", color: "edge", edge: true }
341:               ]
342:             },
343:             {
344:               name: "Promotion / Transfer",
345:               desc: "Year-end class promotion & TC",
346:               icon: "📤",
347:               color: "super_admin",
348:               children: [
349:                 { name: "Promote to Next Class", desc: "Bulk or individual promotion at year-end", icon: "⬆️", color: "super_admin" },
350:                 { name: "Transfer Certificate (TC)", desc: "Generate official TC document", icon: "📄", color: "super_admin" },
351:                 { name: "Promoting Failed Student", desc: "Confirm intent if student hasn't passed exams", icon: "⚠️", color: "edge", edge: true }
352:               ]
353:             }
354:           ]
355:         },
356:         {
357:           name: "Communication",
358:           desc: "Notices, announcements, SMS",
359:           icon: "📢",
360:           color: "super_admin",
361:           children: [
362:             {
363:               name: "Notice Board",
364:               desc: "Create & publish notices",
365:               icon: "📌",
366:               color: "super_admin",
367:               children: [
368:                 { name: "AI Smart Notices", desc: "Auto-draft notices in multiple languages via Gemini", icon: "🤖", color: "super_admin" },
369:                 { name: "Create Notice", desc: "Title, body, attachments", icon: "✏️", color: "super_admin" },
370:                 { name: "Target by Role", desc: "Send to Teachers only, Parents only, or all", icon: "🎯", color: "super_admin" },
371:                 { name: "Target by Class", desc: "Send to specific class/section", icon: "🏛️", color: "super_admin" },
372:                 { name: "Schedule Notice", desc: "Publish at a future date/time", icon: "⏰", color: "super_admin" },
373:                 { name: "Sending to Inactive Users", desc: "Skip deactivated accounts, log delivery failures", icon: "⚠️", color: "edge", edge: true }
374:               ]
375:             },
376:             {
377:               name: "Bulk SMS (DLT)",
378:               desc: "Professional transactional SMS",
379:               icon: "📱",
380:               color: "super_admin",
381:               children: [
382:                 { name: "Template Management", desc: "DLT-approved SMS templates", icon: "📋", color: "super_admin" },
383:                 { name: "Recipient Selection", desc: "Class-wise or role-wise selection", icon: "👥", color: "super_admin" },
384:                 { name: "Delivery Reports", desc: "Track sent/delivered/failed status", icon: "📊", color: "super_admin" },
385:                 { name: "DLT Template Not Approved", desc: "Fallback message if template rejected by TRAI", icon: "⚠️", color: "edge", edge: true }
386:               ]
387:             }
388:           ]
389:         },
390:         {
391:           name: "Transport Management",
392:           desc: "Vehicles, routes, drivers",
393:           icon: "🚌",
394:           color: "super_admin",
395:           children: [
396:             {
397:               name: "Vehicle Management",
398:               desc: "Register & track school vehicles",
399:               icon: "🚐",
400:               color: "super_admin",''',
r'''              color: "super_admin",
401:               children: [
402:                 { name: "Add Vehicle", desc: "Bus number, capacity, registration", icon: "➕", color: "super_admin" },
403:                 { name: "Fitness Certificate", desc: "Track validity & renewal dates", icon: "📜", color: "super_admin" },
404:                 { name: "Overcapacity Assignment", desc: "Block if students assigned exceed bus capacity", icon: "⚠️", color: "edge", edge: true }
405:               ]
406:             },
407:             {
408:               name: "Route Management",
409:               desc: "Define routes, stops, timings",
410:               icon: "🗺️",
411:               color: "super_admin",
412:               children: [
413:                 { name: "Define Route", desc: "Route name, stops with lat/lng, timings", icon: "📍", color: "super_admin" },
414:                 { name: "Assign Vehicle to Route", desc: "Link bus to a specific route", icon: "🔗", color: "super_admin" },
415:                 { name: "Route Without Driver", desc: "Alert if route has vehicle but no driver assigned", icon: "⚠️", color: "edge", edge: true }
416:               ]
417:             },
418:             {
419:               name: "Driver Assignment",
420:               desc: "Assign drivers & conductors",
421:               icon: "🧑‍✈️",
422:               color: "super_admin",
423:               children: [
424:                 { name: "Assign Driver", desc: "Link driver to vehicle & route", icon: "🔗", color: "super_admin" },
425:                 { name: "License Verification", desc: "Verify driving license validity", icon: "🪪", color: "super_admin" },
426:                 { name: "Driver on Multiple Vehicles", desc: "Prevent one driver assigned to two buses simultaneously", icon: "⚠️", color: "edge", edge: true }
427:               ]
428:             }
429:           ]
430:         },
431:         {
432:           name: "Fee Management",
433:           desc: "Fee structure, payments, reconciliation",
434:           icon: "💰",
435:           color: "super_admin",
436:           children: [
437:             {
438:               name: "Fee Structure Setup",
439:               desc: "Define fees per class per year",
440:               icon: "📋",
441:               color: "super_admin",
442:               children: [
443:                 { name: "Define Fee Types", desc: "Tuition, Transport, Library, Sports, Lab", icon: "📂", color: "super_admin" },
444:                 { name: "Set Amount per Class", desc: "Different fee for different classes", icon: "💵", color: "super_admin" },
445:                 { name: "Due Date & Late Fee", desc: "Monthly/quarterly dues with penalty config", icon: "📅", color: "super_admin" },
446:                 { name: "Changing Fee Mid-Year", desc: "Handle students who paid old rate vs new rate", icon: "⚠️", color: "edge", edge: true }
447:               ]
448:             },
449:             {
450:               name: "Auto Fee Reconciliation",
451:               desc: "Razorpay SmartCollect integration",
452:               icon: "🤖",
453:               color: "super_admin",
454:               children: [
455:                 { name: "SmartCollect Integration", desc: "Virtual bank accounts via Razorpay API", icon: "🏦", color: "super_admin" },
456:                 { name: "Virtual Account per Student", desc: "Unique UPI/Account number for each student", icon: "🔢", color: "super_admin" },
457:                 { name: "Auto Mark as Paid", desc: "Webhook triggers fee status update on payment", icon: "✅", color: "super_admin" },
458:                 { name: "Partial Payment", desc: "Handle when parent pays less than full amount", icon: "⚠️", color: "edge", edge: true }
459:               ]
460:             },
461:             {
462:               name: "Concession / Scholarship",
463:               desc: "Fee discounts for eligible students",
464:               icon: "🎁",
465:               color: "super_admin",
466:               children: [
467:                 { name: "Apply Discount", desc: "Percentage or fixed amount discount", icon: "💸", color: "super_admin" },
468:                 { name: "Category-based", desc: "Staff child, sibling, merit, EWS", icon: "📂", color: "super_admin" },
469:                 { name: "Concession Exceeds Fee", desc: "Prevent discount amount greater than actual fee", icon: "⚠️", color: "edge", edge: true }
470:               ]
471:             },
472:             {
473:               name: "Financial Reports",
474:               desc: "Collection, dues, expense summaries",
475:               icon: "📊",
476:               color: "super_admin",
477:               children: [
478:                 { name: "Collection Summary", desc: "Daily/monthly/yearly collection reports", icon: "📈", color: "super_admin" },
479:                 { name: "Defaulters List", desc: "Students with overdue fees", icon: "📋", color: "super_admin" },
480:                 { name: "Expense Tracking", desc: "School's operational expenses", icon: "💸", color: "super_admin" },
481:                 { name: "Export to Excel / PDF", desc: "Download reports in standard formats", icon: "📥", color: "super_admin" }
482:               ]
483:             }
484:           ]
485:         },
486:         {
487:           name: "Reports & Analytics",
488:           desc: "School-wide insights & AI alerts",
489:           icon: "📊",
490:           color: "super_admin",
491:           children: [
492:             {
493:               name: "Attendance Reports",
494:               desc: "Comprehensive attendance analytics",
495:               icon: "📋",
496:               color: "super_admin",
497:               children: [
498:                 { name: "Class-wise Summary", desc: "Attendance % per class per month", icon: "🏛️", color: "super_admin" },
499:                 { name: "Student-wise Detail", desc: "Individual student attendance records", icon: "👤", color: "super_admin" },
500:                 { name: "Monthly / Yearly Trends", desc: "Visual charts showing attendance patterns", icon: "📈", color: "super_admin" },
501:                 { name: "Export Options", desc: "Download as Excel, PDF, or CSV", icon: "📥", color: "super_admin" }
502:               ]
503:             },
504:             {
505:               name: "Exam & Result Reports",
506:               desc: "Performance analytics across exams",
507:               icon: "📝",
508:               color: "super_admin",
509:               children: [
510:                 { name: "Class Toppers", desc: "Rank list per class per exam", icon: "🏆", color: "super_admin" },
511:                 { name: "Subject-wise Analysis", desc: "Average, highest, lowest marks per subject", icon: "📊", color: "super_admin" },
512:                 { name: "Grade Distribution", desc: "How many A, B, C, D, Fail per exam", icon: "📈", color: "super_admin" }
513:               ]
514:             },
515:             {
516:               name: "AI At-Risk Early Warning",
517:               desc: "Proactive student risk detection",
518:               icon: "🚨",
519:               color: "super_admin",
520:               children: [
521:                 { name: "Attendance Drop Detection", desc: "Flag sudden drop in attendance pattern", icon: "📉", color: "super_admin" },
522:                 { name: "Performance Decline", desc: "Alert when marks drop significantly across exams", icon: "⬇️", color: "super_admin" },
523:                 { name: "Homework Non-Submission", desc: "Track students consistently not submitting", icon: "📝", color: "super_admin" },
524:                 { name: "False Positive Alerts", desc: "Allow dismissing alerts with reason (e.g., medical leave)", icon: "⚠️", color: "edge", edge: true }
525:               ]
526:             },
527:             {
528:               name: "Behavioral & Skill Report (AI)",
529:               desc: "Year-long personality assessment",
530:               icon: "🧠",
531:               color: "super_admin",
532:               children: [
533:                 { name: "Tag Aggregation", desc: "Collect all teacher-assigned tags for a student", icon: "🏷️", color: "super_admin" },
534:                 { name: "AI Narrative Generation", desc: "Gemini API generates personality report from tags", icon: "🤖", color: "super_admin" },
535:                 { name: "Report Card Integration", desc: "Attach AI report alongside marks in final report", icon: "📄", color: "super_admin" }
536:               ]
537:             }
538:           ]
539:         }
540:       ]
541:     },
542: 
543:     // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
544:     // 👨‍🏫 TEACHER
545:     // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
546:     {
547:       name: "TEACHER",
548:       desc: "Class management • Attendance • Results",
549:       icon: "👨‍🏫",
550:       color: "teacher",
551:       children: [
552:         {
553:           name: "Teacher Dashboard",
554:           desc: "Today's tasks & schedule overview",
555:           icon: "📊",
556:           color: "teacher",
557:           children: [
558:             { name: "Today's Schedule", desc: "List of classes to teach today with room numbers", icon: "📅", color: "teacher" },
559:             { name: "Pending Tasks", desc: "Unmarked attendance, unchecked homework", icon: "⏳", color: "teacher" },
560:             { name: "Notifications", desc: "Leave approval updates, notices from admin", icon: "🔔", color: "teacher" }
561:           ]
562:         },
563:         {
564:           name: "Attendance Marking",
565:           desc: "Daily student attendance management",
566:           icon: "✅",
567:           color: "teacher",
568:           children: [
569:             { name: "Mark Present / Absent / Late", desc: "Select class → mark each student's status", icon: "📋", color: "teacher" },
570:             { name: "Bulk Mark (All Present)", desc: "One-click mark all present, then edit exceptions", icon: "⚡", color: "teacher" },
571:             { name: "Edit Past Attendance", desc: "Modify previous day's attendance (requires approval)", icon: "✏️", color: "teacher" },
572:             { name: "Offline Mode", desc: "Mark attendance without internet, auto-sync later", icon: "📴", color: "teacher" },
573:             { name: "Wrong Date Attendance", desc: "Prevent marking attendance for future dates", icon: "⚠️", color: "edge", edge: true }
574:           ]
575:         },
576:         {
577:           name: "Homework Management",
578:           desc: "Create & track homework assignments",
579:           icon: "📝",
580:           color: "teacher",
581:           children: [
582:             { name: "Create Homework", desc: "Title, description, due date, class/section", icon: "➕", color: "teacher" },
583:             { name: "Attach Files", desc: "Upload PDF, images, or links as reference", icon: "📎", color: "teacher" },
584:             { name: "View Submissions", desc: "Check which students submitted and when", icon: "📥", color: "teacher" },
585:             { name: "Due Date in Past", desc: "Warn if teacher sets due date that already passed", icon: "⚠️", color: "edge", edge: true }
586:           ]
587:         },
588:         {
589:           name: "Exam & Result Management",
590:           desc: "Create exams, upload marks, publish results",
591:           icon: "📊",
592:           color: "teacher",
593:           children: [
594:             { name: "Create Exam", desc: "Exam name, subject, date, total marks, passing marks", icon: "➕", color: "teacher" },
595:             { name: "Upload Marks", desc: "Manual entry or bulk Excel import", icon: "📤", color: "teacher" },
596:             { name: "Auto Grade Calculation", desc: "System calculates grade from marks & grading scale", icon: "🤖", color: "teacher" },
597:             { name: "Publish Results", desc: "Make results visible to students & parents", icon: "📢", color: "teacher" },
598:             { name: "Marks Exceeding Total", desc: "Block if entered marks > total marks of exam", icon: "⚠️", color: "edge", edge: true }
599:           ]
600:         },
601:         {
602:           name: "Syllabus Progress",
603:           desc: "Update topic completion status",
604:           icon: "📚",
605:           color: "teacher",
606:           children: [
607:             { name: "Mark Topic Completed", desc: "Check off taught topics from syllabus list", icon: "✅", color: "teacher" },
608:             { name: "View Progress Bar", desc: "Visual indicator of syllabus completion %", icon: "📊", color: "teacher" },
609:             { name: "AI Catch-up Suggestions", desc: "If behind schedule, AI suggests topic merging strategies", icon: "🤖", color: "teacher" }
610:           ]
611:         },
612:         {
613:           name: "Student Behavioral Tags",
614:           desc: "Tag students with personality traits",
615:           icon: "🏷️",
616:           color: "teacher",
617:           children: [
618:             { name: "Add Tag", desc: "Leadership, Creative, Helpful, Distracted, etc.", icon: "➕", color: "teacher" },
619:             { name: "View Tag History", desc: "See all tags given to a student over time", icon: "📋", color: "teacher" },
620:             { name: "Inappropriate Tag", desc: "Moderate/block offensive or biased tags", icon: "⚠️", color: "edge", edge: true }
621:           ]
622:         },
623:         {
624:           name: "Leave Application",
625:           desc: "Apply for personal leave",
626:           icon: "🏖️",
627:           color: "teacher",
628:           children: [
629:             { name: "Apply for Leave", desc: "Select type (Sick/Casual/Personal), dates, reason", icon: "📝", color: "teacher" },
630:             { name: "Track Status", desc: "Pending / Approved / Rejected status", icon: "📋", color: "teacher" },
631:             { name: "AI Substitute View", desc: "See who AI suggests as replacement", icon: "🤖", color: "teacher" },
632:             { name: "Leave During Exam Duty", desc: "Warn if teacher has exam supervision during leave dates", icon: "⚠️", color: "edge", edge: true }
633:           ]
634:         },
635:         {
636:           name: "Class Schedule View",
637:           desc: "Teacher's personal timetable",
638:           icon: "📅",
639:           color: "teacher",
640:           children: [
641:             { name: "Weekly Timetable", desc: "Day-wise period-wise schedule", icon: "📆", color: "teacher" },
642:             { name: "Room Assignment", desc: "Which room/lab for each period", icon: "🏫", color: "teacher" },
643:             { name: "Substitution Alerts", desc: "Notifications when assigned as substitute", icon: "🔔", color: "teacher" }
644:           ]
645:         }
646:       ]
647:     },
648: 
649:     // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
650:     // 👨‍🎓 STUDENT
651:     // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
652:     {
653:       name: "STUDENT",
654:       desc: "View attendance, results, homework, leave",
655:       icon: "👨‍🎓",
656:       color: "student",
657:       children: [
658:         {
659:           name: "Student Dashboard",
660:           desc: "Personal overview & quick access",
661:           icon: "📊",
662:           color: "student",
663:           children: [
664:             { name: "Profile Overview", desc: "Photo, name, class, roll number, section", icon: "👤", color: "student" },
665:             { name: "Today's Schedule", desc: "Today's classes with subject & teacher info", icon: "📅", color: "student" },
666:             { name: "Upcoming Tests", desc: "Next scheduled exams with subjects & dates", icon: "📝", color: "student" },
667:             { name: "Pending Homework", desc: "Homework due today or overdue", icon: "⏳", color: "student" }
668:           ]
669:         },
670:         {
671:           name: "Attendance View",
672:           desc: "Personal attendance records",
673:           icon: "📋",
674:           color: "student",
675:           children: [
676:             { name: "Calendar View", desc: "Color-coded calendar (green=present, red=absent)", icon: "📆", color: "student" },
677:             { name: "Monthly Summary", desc: "Attendance % per month", icon: "📊", color: "student" },
678:             { name: "Below Minimum %", desc: "Alert if attendance drops below school requirement (e.g., 75%)", icon: "⚠️", color: "edge", edge: true }
679:           ]
680:         },
681:         {
682:           name: "Results & Report Cards",
683:           desc: "Exam marks and grade cards",
684:           icon: "📊",
685:           color: "student",
686:           children: [
687:             { name: "Exam-wise Marks", desc: "Marks for each exam with subject breakdown", icon: "📝", color: "student" },
688:             { name: "Grade Card View", desc: "Official grade card format", icon: "📄", color: "student" },
689:             { name: "Progress Trend Chart", desc: "Visual chart showing marks trend over exams", icon: "📈", color: "student" },
690:             { name: "Download Report Card", desc: "PDF download of official report card", icon: "📥", color: "student" }
691:           ]
692:         },
693:         {
694:           name: "Homework",
695:           desc: "View & submit assignments",
696:           icon: "📝",
697:           color: "student",
698:           children: [
699:             { name: "View Assigned", desc: "List of all homework with due dates", icon: "📋", color: "student" },
700:             { name: "Submit Online", desc: "Upload file (PDF/image) as submission", icon: "📤", color: "student" },''',
r'''700:             { name: "Submit Online", desc: "Upload file (PDF/image) as submission", icon: "📤", color: "student" },
701:             { name: "Submission Status", desc: "Submitted / Pending / Late indicator", icon: "✅", color: "student" },
702:             { name: "Late Submission", desc: "Mark as late if submitted after due date", icon: "⚠️", color: "edge", edge: true }
703:           ]
704:         },
705:         {
706:           name: "Syllabus Progress View",
707:           desc: "Track what's been taught",
708:           icon: "📚",
709:           color: "student",
710:           children: [
711:             { name: "Subject-wise Topics", desc: "All topics listed per subject", icon: "📖", color: "student" },
712:             { name: "Completed vs Pending", desc: "Visual split of done & remaining", icon: "📊", color: "student" },
713:             { name: "Progress Percentage", desc: "Overall & per-subject completion %", icon: "📈", color: "student" }
714:           ]
715:         },
716:         {
717:           name: "Timetable View",
718:           desc: "Class schedule",
719:           icon: "📅",
720:           color: "student",
721:           children: [
722:             { name: "Today's Classes", desc: "Current day's full schedule", icon: "📋", color: "student" },
723:             { name: "Full Week Schedule", desc: "Monday to Saturday period grid", icon: "📆", color: "student" },
724:             { name: "Teacher Info per Period", desc: "Which teacher for which subject", icon: "👨‍🏫", color: "student" }
725:           ]
726:         },
727:         {
728:           name: "Leave Application",
729:           desc: "Apply for leave online",
730:           icon: "🏖️",
731:           color: "student",
732:           children: [
733:             { name: "Apply for Leave", desc: "Select dates, type, reason", icon: "📝", color: "student" },
734:             { name: "Parent Consent Required", desc: "Leave needs parent's approval first, then school", icon: "👨‍👩‍👦", color: "student" },
735:             { name: "Track Application", desc: "View status: Pending → Parent Approved → School Approved", icon: "📋", color: "student" },
736:             { name: "Leave During Exam", desc: "Warn student that exam is scheduled during leave dates", icon: "⚠️", color: "edge", edge: true }
737:           ]
738:         },
739:         {
740:           name: "Notice Board",
741:           desc: "School announcements",
742:           icon: "📌",
743:           color: "student",
744:           children: [
745:             { name: "All Notices", desc: "Chronological list of all notices", icon: "📋", color: "student" },
746:             { name: "Filtered by Relevance", desc: "Show only notices targeting student's class", icon: "🎯", color: "student" },
747:             { name: "Read / Unread", desc: "Visual indicator for new notices", icon: "🔵", color: "student" }
748:           ]
749:         },
750:         {
751:           name: "Transport Details",
752:           desc: "Bus route & driver info",
753:           icon: "🚌",
754:           color: "student",
755:           children: [
756:             { name: "Assigned Route", desc: "Route name, stop list, timings", icon: "🗺️", color: "student" },
757:             { name: "Bus Number & Timing", desc: "Bus registration & pickup/drop time", icon: "🚐", color: "student" },
758:             { name: "Driver Contact", desc: "Driver name & phone number", icon: "📞", color: "student" }
759:           ]
760:         },
761:         {
762:           name: "Document Vault",
763:           desc: "Secure digital document storage",
764:           icon: "🔒",
765:           color: "student",
766:           children: [
767:             { name: "Report Cards", desc: "All years' report cards stored digitally", icon: "📄", color: "student" },
768:             { name: "Certificates", desc: "Achievement certificates, participation certs", icon: "🏆", color: "student" },
769:             { name: "Medical Records", desc: "Vaccination records, health checkup reports", icon: "🏥", color: "student" }
770:           ]
771:         }
772:       ]
773:     },
774: 
775:     // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
776:     // 👨‍👩‍👦 PARENT
777:     // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
778:     {
779:       name: "PARENT",
780:       desc: "Child monitoring • Fee payment • Communication",
781:       icon: "👨‍👩‍👦",
782:       color: "parent",
783:       children: [
784:         {
785:           name: "Parent Dashboard",
786:           desc: "Child-centric overview",
787:           icon: "📊",
788:           color: "parent",
789:           children: [
790:             { name: "Child Selector", desc: "Switch between children if parent has multiple kids", icon: "👥", color: "parent" },
791:             { name: "Quick Summary", desc: "Attendance %, pending fees, last exam marks", icon: "📋", color: "parent" },
792:             { name: "Notifications", desc: "Fee reminders, notice alerts, leave updates", icon: "🔔", color: "parent" },
793:             { name: "No Child Linked", desc: "Show setup wizard if parent account has no child linked", icon: "⚠️", color: "edge", edge: true }
794:           ]
795:         },
796:         {
797:           name: "Attendance View",
798:           desc: "Child's attendance tracking",
799:           icon: "📋",
800:           color: "parent",
801:           children: [
802:             { name: "Attendance Calendar", desc: "Color-coded monthly calendar of child's attendance", icon: "📆", color: "parent" },
803:             { name: "Absent Days List", desc: "List of all absent dates with leave status", icon: "📋", color: "parent" },
804:             { name: "Attendance Percentage", desc: "Overall & monthly attendance %", icon: "📊", color: "parent" }
805:           ]
806:         },
807:         {
808:           name: "Marks & Results",
809:           desc: "Child's academic performance",
810:           icon: "📊",
811:           color: "parent",
812:           children: [
813:             { name: "Exam Results", desc: "Subject-wise marks for each exam", icon: "📝", color: "parent" },
814:             { name: "Progress Trends", desc: "Visual chart showing improvement/decline", icon: "📈", color: "parent" },
815:             { name: "Download Report Card", desc: "PDF download of official report", icon: "📥", color: "parent" }
816:           ]
817:         },
818:         {
819:           name: "Fee Payment",
820:           desc: "View dues & pay online/offline",
821:           icon: "💳",
822:           color: "parent",
823:           children: [
824:             { name: "View Fee Dues", desc: "Breakup: Tuition, Transport, Late Fee, etc.", icon: "📋", color: "parent" },
825:             { name: "Pay Online (Razorpay)", desc: "UPI, Card, NetBanking payment gateway", icon: "💳", color: "parent" },
826:             { name: "Offline Payment → Receipt", desc: "Pay at school counter, receipt auto-generated on portal", icon: "🧾", color: "parent" },
827:             { name: "Payment History", desc: "All past payments with transaction IDs", icon: "📜", color: "parent" },
828:             { name: "Download Receipt (PDF)", desc: "Official fee receipt download", icon: "📥", color: "parent" },
829:             { name: "Payment Failure / Retry", desc: "Handle failed online payment, allow retry without double charge", icon: "⚠️", color: "edge", edge: true }
830:           ]
831:         },
832:         {
833:           name: "Syllabus Progress",
834:           desc: "Track child's course coverage",
835:           icon: "📚",
836:           color: "parent",
837:           children: [
838:             { name: "Subject-wise Completion", desc: "% of syllabus covered per subject", icon: "📊", color: "parent" },
839:             { name: "Comparison with Expected", desc: "Is teacher on track vs expected schedule?", icon: "📈", color: "parent" }
840:           ]
841:         },
842:         {
843:           name: "Behavioral Report (AI)",
844:           desc: "AI-generated personality assessment",
845:           icon: "🧠",
846:           color: "parent",
847:           children: [
848:             { name: "Year-long Tag Summary", desc: "All behavioral tags given by teachers", icon: "🏷️", color: "parent" },
849:             { name: "AI Narrative Report", desc: "Detailed personality assessment by AI", icon: "🤖", color: "parent" },
850:             { name: "Strengths & Improvements", desc: "Clear list of strong areas & areas needing work", icon: "📋", color: "parent" }
851:           ]
852:         },
853:         {
854:           name: "Teacher Information",
855:           desc: "Child's teachers & contact",
856:           icon: "👨‍🏫",
857:           color: "parent",
858:           children: [
859:             { name: "Class Teacher Details", desc: "Name, subject, contact of class teacher", icon: "⭐", color: "parent" },
860:             { name: "Subject Teacher List", desc: "All subject teachers with names & subjects", icon: "📋", color: "parent" },
861:             { name: "Teacher Changed Mid-Year", desc: "Notify parent when subject teacher changes", icon: "⚠️", color: "edge", edge: true }
862:           ]
863:         },
864:         {
865:           name: "Transport Details",
866:           desc: "Child's bus route & driver",
867:           icon: "🚌",
868:           color: "parent",
869:           children: [
870:             { name: "Route & Stops", desc: "Route name, stop sequence, timings", icon: "🗺️", color: "parent" },
871:             { name: "Driver Details", desc: "Driver name, phone, license number", icon: "🧑‍✈️", color: "parent" },
872:             { name: "Route Changed Without Notice", desc: "Alert parent if route/timing changed without prior notification", icon: "⚠️", color: "edge", edge: true }
873:           ]
874:         },
875:         {
876:           name: "Notice Board",
877:           desc: "School announcements",
878:           icon: "📌",
879:           color: "parent",
880:           children: [
881:             { name: "School Notices", desc: "General school announcements", icon: "📋", color: "parent" },
882:             { name: "Fee Reminders", desc: "Automated fee due date reminders", icon: "💰", color: "parent" },
883:             { name: "Exam Schedule", desc: "Upcoming exam dates & subjects", icon: "📅", color: "parent" }
884:           ]
885:         },
886:         {
887:           name: "Leave Approval",
888:           desc: "Approve child's leave applications",
889:           icon: "✅",
890:           color: "parent",
891:           children: [
892:             { name: "View Applications", desc: "All leave requests from child", icon: "📋", color: "parent" },
893:             { name: "Approve / Reject", desc: "Parent gives consent before school processes", icon: "👍", color: "parent" },
894:             { name: "Approving During Exam", desc: "Strong warning if child is taking leave during scheduled exam", icon: "⚠️", color: "edge", edge: true }
895:           ]
896:         },
897:         {
898:           name: "Document Vault",
899:           desc: "Access child's secured documents",
900:           icon: "🔒",
901:           color: "parent",
902:           children: [
903:             { name: "Report Cards", desc: "Download all years' report cards", icon: "📄", color: "parent" },
904:             { name: "Transfer Certificates", desc: "TC issued by school", icon: "📜", color: "parent" },
905:             { name: "Medical Records", desc: "Health checkup & vaccination records", icon: "🏥", color: "parent" },
906:             { name: "Download / Share", desc: "Download as PDF or share via link", icon: "📤", color: "parent" }
907:           ]
908:         }
909:       ]
910:     },
911: 
912:     // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
913:     // 🚌 DRIVER / CONDUCTOR
914:     // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
915:     {
916:       name: "DRIVER / CONDUCTOR",
917:       desc: "Profile, route details, vehicle status",
918:       icon: "🚌",
919:       color: "driver",
920:       children: [
921:         {
922:           name: "Profile Management",
923:           desc: "Personal & professional details",
924:           icon: "👤",
925:           color: "driver",
926:           children: [
927:             { name: "Personal Details", desc: "Name, phone, address, emergency contact", icon: "📝", color: "driver" },
928:             { name: "License Number & Validity", desc: "DL number with expiry tracking", icon: "🪪", color: "driver" },
929:             { name: "Emergency Contact", desc: "Family member contact for emergencies", icon: "📞", color: "driver" },
930:             { name: "License Expired", desc: "Alert & restrict access if driving license has expired", icon: "⚠️", color: "edge", edge: true }
931:           ]
932:         },
933:         {
934:           name: "Route Details",
935:           desc: "Assigned route information",
936:           icon: "🗺️",
937:           color: "driver",
938:           children: [
939:             { name: "Assigned Route", desc: "Route name with all stop details", icon: "📍", color: "driver" },
940:             { name: "Stop Timings", desc: "Expected arrival time at each stop", icon: "⏰", color: "driver" },
941:             { name: "Student List on Route", desc: "Names & pickup points of students on this route", icon: "👥", color: "driver" },
942:             { name: "No Route Assigned", desc: "Show 'Contact Admin' if driver has no route", icon: "⚠️", color: "edge", edge: true }
943:           ]
944:         },
945:         {
946:           name: "Vehicle Status",
947:           desc: "Bus details & compliance",
948:           icon: "🚐",
949:           color: "driver",
950:           children: [
951:             { name: "Bus Number", desc: "Registration number & model", icon: "🔢", color: "driver" },
952:             { name: "Capacity & Load", desc: "Total seats vs assigned students", icon: "📊", color: "driver" },
953:             { name: "Fitness Certificate", desc: "Certificate validity & renewal reminder", icon: "📜", color: "driver" }
954:           ]
955:         }
956:       ]
957:     },
958: 
959:     // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
960:     // 💼 ACCOUNTANT
961:     // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
962:     {
963:       name: "ACCOUNTANT",
964:       desc: "Fee collection • Receipts • Expenses • Reports",
965:       icon: "💼",
966:       color: "accountant",
967:       children: [
968:         {
969:           name: "Fee Collection Dashboard",
970:           desc: "Today's collections & pending overview",
971:           icon: "💰",
972:           color: "accountant",
973:           children: [
974:             { name: "Today's Collections", desc: "Total amount collected today (online + offline)", icon: "📊", color: "accountant" },
975:             { name: "Pending Dues Overview", desc: "Total outstanding across all students", icon: "📋", color: "accountant" },
976:             { name: "Class-wise Summary", desc: "Collection % per class", icon: "🏛️", color: "accountant" },
977:             { name: "Manual Entry Mismatch", desc: "Flag when cash collected doesn't match system records", icon: "⚠️", color: "edge", edge: true }
978:           ]
979:         },
980:         {
981:           name: "Receipt Generation",
982:           desc: "Create & print fee receipts",
983:           icon: "🧾",
984:           color: "accountant",
985:           children: [
986:             { name: "Online Payment Receipt", desc: "Auto-generated when online payment succeeds", icon: "💳", color: "accountant" },
987:             { name: "Offline Payment Receipt", desc: "Manually generate for cash/cheque payments", icon: "💵", color: "accountant" },
988:             { name: "Bulk Receipt Print", desc: "Print multiple receipts for a date range", icon: "🖨️", color: "accountant" },
989:             { name: "Duplicate Receipt Number", desc: "System enforces unique receipt numbers, block duplicates", icon: "⚠️", color: "edge", edge: true }
990:           ]
991:         },
992:         {
993:           name: "Expense Management",
994:           desc: "Track school operational expenses",
995:           icon: "💸",
996:           color: "accountant",
997:           children: [
998:             { name: "Add Expense", desc: "Category, amount, date, description", icon: "➕", color: "accountant" },
999:             { name: "Attach Receipt / Invoice", desc: "Upload vendor bill or invoice scan", icon: "📎", color: "accountant" },
1000:             { name: "Approval Workflow", desc: "Expenses above threshold need Principal's approval", icon: "✅", color: "accountant" },
1001:             { name: "Expense Exceeds Budget", desc: "Warn if category expense exceeds allocated budget", icon: "⚠️", color: "edge", edge: true }
1002:           ]
1003:         },
1004:         {
1005:           name: "Auto Reconciliation View",
1006:           desc: "SmartCollect payment matching",
1007:           icon: "🤖",
1008:           color: "accountant",
1009:           children: [
1010:             { name: "SmartCollect Dashboard", desc: "Overview of all virtual account payments", icon: "📊", color: "accountant" },
1011:             { name: "Matched Payments", desc: "Payments auto-matched to students", icon: "✅", color: "accountant" },
1012:             { name: "Unmatched / Pending", desc: "Payments requiring manual resolution", icon: "⏳", color: "accountant" },
1013:             { name: "Wrong Virtual Account", desc: "Payment sent to incorrect student's virtual account", icon: "⚠️", color: "edge", edge: true }
1014:           ]
1015:         },
1016:         {
1017:           name: "Financial Reports",
1018:           desc: "Comprehensive financial analytics",
1019:           icon: "📊",
1020:           color: "accountant",
1021:           children: [
1022:             { name: "Income vs Expense", desc: "Monthly/yearly income vs expense comparison", icon: "📈", color: "accountant" },
1023:             { name: "Monthly Statement", desc: "Detailed month-wise financial statement", icon: "📋", color: "accountant" },
1024:             { name: "Tax-ready Export", desc: "Export data formatted for tax filing", icon: "📤", color: "accountant" },
1025:             { name: "Audit Trail Log", desc: "Immutable log of all financial transactions", icon: "🔒", color: "accountant" }
1026:           ]
1027:         }
1028:       ]
1029:     }
1030:   ]
1031: };
1032: 
1033: // ── Color Palette ──
1034: const COLORS = {
1035:   master:      { bg: "#2d1b69", border: "#7c3aed", text: "#e9d5ff" },
1036:   super_admin: { bg: "#1e3a5f", border: "#2563eb", text: "#bfdbfe" },
1037:   teacher:     { bg: "#064e3b", border: "#059669", text: "#a7f3d0" },
1038:   student:     { bg: "#164e63", border: "#0891b2", text: "#a5f3fc" },
1039:   parent:      { bg: "#78350f", border: "#d97706", text: "#fde68a" },
1040:   driver:      { bg: "#44403c", border: "#78716c", text: "#d6d3d1" },
1041:   accountant:  { bg: "#7f1d1d", border: "#dc2626", text: "#fecaca" },
1042:   general:     { bg: "#1f2937", border: "#6b7280", text: "#d1d5db" },
1043:   edge:        { bg: "#450a0a", border: "#991b1b", text: "#fca5a5", dashed: true }
1044: };
1045: 
1046: // ── Legend Data ──
1047: const LEGEND = [
1048:   { label: "Master Admin", color: "#7c3aed" },
1049:   { label: "Super Admin (Principal)", color: "#2563eb" },
1050:   { label: "Teacher", color: "#059669" },
1051:   { label: "Student", color: "#0891b2" },
1052:   { label: "Parent", color: "#d97706" },
1053:   { label: "Driver / Conductor", color: "#78716c" },
1054:   { label: "Accountant", color: "#dc2626" },
1055:   { label: "⚠ Edge Case", color: "#991b1b", dashed: true }
1056: ];
1057: ''']

final_output = ""
# Using regex to remove the <line_number>: prefix from each line
for part in data_parts:
    lines = part.split('\n')
    for line in lines:
        if line == "":
            continue
        cleaned_line = re.sub(r'^\d+:\s?', '', line)
        
        # If the line was originally just a number, it will be empty now
        # Also need to handle cases where it was empty string
        # Actually it's easier to just match the pattern
        match = re.match(r'^\d+:\s(.*)$', line)
        if match:
            final_output += match.group(1) + "\n"
        elif re.match(r'^\d+:$', line):
            final_output += "\n"

# A few overlap lines between parts need to be skipped or handled.
# Wait, part 1 ends at 99, part 2 starts at 100... wait part 2 first line is "100:           desc: "Create & manage multiple school tenants","
# BUT part 1 ends with "99:           name: "School Management",". So there is no overlap in line numbers.
# I just need to write the file.

with open(r"c:\Users\ayyub\.gemini\antigravity\scratch\ERP Portal\diagram_data.js", "w", encoding="utf-8") as f:
    f.write(final_output)
