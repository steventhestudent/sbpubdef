# Deck Spec (Working Draft)

---

## Slide 01

* title: SBPD Intranet — Role-Based SharePoint Platform

* purpose: introduce project, sponsor, and context

* key_message: one SharePoint hub delivers tailored tools and content by role for the Santa Barbara County Public Defender

* time: 0:30

* presenter: -

* on_slide_text:

    * Santa Barbara County Public Defender’s Office
    * Role-based intranet on Microsoft 365 / SharePoint Online
    * CS 4961/4962 · Cal State LA · May 1, 2026
    * Advisor: Dr. Chengyu Sun · Client: Luis Ramirez

* visuals:

    * Simple title treatment: department name and course line as hero text; optional faint background suggesting SharePoint hub navigation (no live data)

* issues:

    * Confirm final event title/date with course staff

---

## Slide 02

* title: Meet the Team

* purpose: establish credibility and contributors

* key_message: a defined engineering team, faculty advisor, and client sponsor delivered the solution

* time: 1:00

* presenter: -

* on_slide_text:

    * (team roster — names and roles)
    * Advisor: Dr. Chengyu Sun
    * Client: Luis Ramirez (SBPD)

* visuals:

    * Grid of headshots or name cards; advisor and client called out in a distinct row or badge so they are impossible to miss

* issues:

    * Replace placeholder when final roster is fixed

---

## Slide 03

* title: The Problem — Fragmentation and Static Access

* purpose: establish need for the system

* key_message: intranet content and workflows were hard to navigate, and the same pages could not safely serve every role

* time: 2:00

* presenter: Krystal

* on_slide_text:

    * Policies, forms, and procedures scattered across libraries and pages
    * Little structure for “who should see what” beyond broad site access
    * High friction for staff looking for role-specific paths (e.g., specialized units)

* visuals:

    * Before: conceptual collage — many document icons / library tiles with no clear entry path (no sensitive data). After hint: single hub motif used again on the next slide for continuity

* issues:

    * Avoid real case or PII in any “before” screenshot

---

## Slide 04

* title: Before vs After — One Hub, Role-Tailored Experiences

* purpose: show transformation at a high level

* key_message: we moved from scattered, one-size-fits-all pages to a single hub where components and content respond to the user’s role

* time: 1:30

* presenter: Krystal

* on_slide_text:

    * Before: manual hunting; same views for disparate jobs; weak alignment between Entra identity and day-to-day tasks
    * After: centralized hub; SPFx components; visibility and tools keyed to Entra security groups

* visuals:

    * Split layout: left “generic intranet page” vs right “same hub with role-specific panels expanded” (mock or sanitized screenshot)

* issues:

    * Transition line to next section: “That shift drove a concrete platform choice.”

---

## Slide 05

* title: Tech Stack — SharePoint First, Then SPFx

* purpose: justify technical approach (requirement, alternatives, decision)

* key_message: SharePoint Online is the mandated intranet surface; SPFx beat low-code alone for the control and UX the roles required

* time: 2:00

* presenter: -

* on_slide_text:

    * Requirement: solution must live in the county’s Microsoft 365 / SharePoint environment
    * Low-code / out-of-box: fast for simple pages; limits custom workflows, dense role logic, and integrated UX across many scenarios
    * SPFx: first-class SharePoint integration, TypeScript/React, packaged solution, room for Azure-backed APIs and Power BI embeds
    * Decision: SPFx as the primary delivery path for the experience layer

* visuals:

    * Two-column decision graphic: “SharePoint-native / low-code” vs “SPFx + services,” with a short bullet list under each and a clear checkmark on the SPFx side

* issues:

    * Keep claims tied to evaluation criteria (role complexity, maintainability), not generic marketing

---

## Slide 06

* title: System Architecture — Identity, Hub, and Apps

* purpose: show how major pieces connect

* key_message: Entra ID and SharePoint anchor the hub; SPFx web parts render the UI; Azure Functions and Power BI extend selected workflows

* time: 2:00

* presenter: -

* on_slide_text:

    * Users authenticate via Microsoft 365 (Entra ID)
    * SharePoint hub hosts pages and lists (directories, assignments, hoteling, procedures, etc.)
    * SPFx delivers web parts and extensions; optional Azure Functions for privileged operations; Power BI embedded where analytics are required

* visuals:

    * Left-to-right diagram: User → Entra ID → SharePoint (site + lists) → SPFx UI layer; arrows downward to “Azure Functions (API)” and “Power BI reports” only where those integrations apply

* issues:

    * Font size and arrow labels must read from the back row

---

## Slide 07

* title: Role-Based Access — Same Site, Different Experience

* purpose: explain core system concept for a mixed audience

* key_message: Entra security groups map to roles; the UI shows the panels and web parts relevant to that role—without maintaining separate sites per job function

* time: 2:00

* presenter: Alondra

* on_slide_text:

    * One hub; experiences differ by role membership
    * Roles include: Guest, PD-Intranet baseline, Attorney, CDD, LOP, Trial Supervisor, HR, Compliance Officer, IT (and related admin groups)
    * CDD: Capital Defense resources; LOP: Legal Office procedural checklists; Trial Supervisor: workload-oriented views

* visuals:

    * Single site chrome with three side-by-side mock panes (sanitized): e.g., Attorney vs LOP vs Trial Supervisor, each showing different primary panel open

* notes:

    * Speak slowly through acronyms: CDD = Capital Defense Division; LOP = legal office procedures workflow, not “lop” generically

* issues:

    * If the audience is non-legal, add one plain sentence per role in speech, not on the slide

---

## Slide 08

* title: Component Overview — From Extensions to Specialized Panels

* purpose: zoom in from architecture to what ships in the solution

* key_message: the package bundles many SPFx web parts plus small extensions; role-specific behavior often lives inside shared containers (e.g., portal resources)

* time: 1:30

* presenter: -

* on_slide_text:

    * Communication & discovery: announcements, events, welcome, staff directory, expert witness directory, portal calendar, blog-style updates
    * Role panels: CDD resource guides, LOP procedure checklist, Trial Supervisor workload (within Portal Resources and related web parts)
    * Operations & assignments: office hoteling, office information, attorney-facing assignments, CMS-driven assignment catalog, portal assignment flow
    * Analytics: urgency portal (Power BI embeds)
    * Platform: theme injector and landing behavior extensions

* visuals:

    * Layered diagram: outer ring “extensions + hub pages,” inner clusters matching the four bullet groups above; label “17 web parts + 2 extensions” only if you will verify at presentation time

* issues:

    * This slide sets vocabulary; feature slides should not repeat the full list—pick one depth story per feature

---

## Slide 09

* title: Office Hoteling — Desks with Calendar Backing

* purpose: demonstrate an operational, day-to-day feature

* key_message: staff reserve workspace through the intranet, with reservation data stored in SharePoint and calendar-oriented follow-through

* time: 2:00

* presenter: Huy

* on_slide_text:

    * Book a desk for a date range from the Office Hoteling web part
    * Reservations persist to a SharePoint list (`HotelingReservations` pattern)
    * Integration path supports calendar confirmation and notification flows (per deployment configuration)

* visuals:

    * Annotated screenshot or mock: weekly grid with a selected desk, reservation confirmation state, and a small callout pointing to “list item created” (no personal email content)

* issues:

    * State clearly if demo tenant vs production behavior differs

---

## Slide 10

* title: Attorney Workload — From Location to Attorney

* purpose: show structured operational visibility for supervisors

* key_message: Trial Supervisors drill from office location to case type to attorney, with filterable views backed by SharePoint data

* time: 2:00

* presenter: Alyssa

* on_slide_text:

    * Hierarchy: location → case type → attorney
    * Search and filters to narrow large rosters
    * Surfaced in the workload experience (including the dedicated Attorney Workload web part where deployed)

* visuals:

    * Sanitized mock of the workload table: columns for location, case type, attorney name, counts; one filter chip active (e.g., office = “Main”)

* issues:

    * Align narrative with whether workload is only in Portal Resources, only standalone web part, or both

---

## Slide 11

* title: LOP Checklist — Procedures as Structured Steps

* purpose: show workflow support for Legal Office Procedures

* key_message: LOP staff work through checklist items stored in SharePoint, with rich step content (documents, links, media) in a single focused panel

* time: 2:00

* presenter: -

* on_slide_text:

    * Procedures modeled as checklist + ordered steps (`LOPProcedureChecklist`, `ProcedureSteps`)
    * In-app viewing of procedure documents and embeds (PDF / linked content / video-style URLs where configured)
    * Search and filters to find a procedure quickly within the LOP role panel

* visuals:

    * Two-panel mock: left = checklist titles and categories; right = step detail with a document preview strip and a “mark progress” affordance (generic labels)

* issues:

    * Clarify in speech that this is distinct from generic “site pages” authoring

---

## Slide 12

* title: CDD Resource Guides — Capital Defense in One Place

* purpose: show specialized resources for Capital Defense Division staff

* key_message: CDD sees curated guides, referral-style materials, and document paths scoped to capital work—not mixed into generic attorney lists

* time: 1:30

* presenter: Jared

* on_slide_text:

    * CDD role opens a dedicated guides experience inside Portal Resources
    * Content organized from controlled libraries (e.g., intranet form database paths)
    * Reduces time spent hunting across folders unrelated to capital cases

* visuals:

    * Mock of CDD panel: section headers (guides, forms, referrals) with generic titles; optional folder-path callout blurred except for “CDD” segment

* issues:

    * Do not show real defendant or case identifiers

---

## Slide 13

* title: Urgency Portal — Embedded Power BI for Supervisors

* purpose: show analytics embedded in SharePoint

* key_message: leadership views urgency metrics via Power BI reports or visuals embedded in a dedicated SPFx web part, with access still governed by M365

* time: 1:30

* presenter: Jonathan

* on_slide_text:

    * Configurable Power BI report and visual URLs
    * Embedded experience titled for operational review (e.g., urgency tracking)
    * Same Entra/SharePoint guardrails as the rest of the hub

* visuals:

    * Placeholder frame labeled “Power BI embed”: show a generic chart (bar or line) with axis labels like “Queue depth” / “Week” — no real county numbers unless approved

* issues:

    * Confirm which reports are approved for public academic demo

---

## Slide 14

* title: Communication Hub — What Everyone Sees First

* purpose: cover cross-cutting communication without re-explaining role panels

* key_message: announcements, directory, and calendar web parts give a shared front door; specialized work happens in the role panels you already saw

* time: 1:30

* presenter: -

* on_slide_text:

    * Announcements and upcoming events for office-wide messaging
    * Staff directory (and expert witness directory where used) for “who to call”
    * Portal calendar and optional blog-style updates for timelines and narratives
    * Intentionally separate from LOP/CDD deep work—this slide is the shared layer

* visuals:

    * Composite mock: top strip = announcement banner; middle = simplified directory cards; bottom = month calendar with one highlighted team event

* issues:

    * Avoid duplicating hoteling or assignment screenshots here

---

## Slide 15

* title: Assignments — Catalog, Steps, Quiz, and Server-Side Progress

* purpose: show training and compliance-style flows with backend integrity

* key_message: admins publish structured assignments from CMS; staff complete steps, acknowledgements, embeds, and quizzes; sensitive mutations can route through Azure Functions

* time: 1:30

* presenter: -

* on_slide_text:

    * Assignment catalog and per-user instances in SharePoint lists
    * Step types include content, embed completion tracking, and quiz gates
    * Optional: Azure Function API for mutations and related Graph operations (e.g., calendar scenarios per deployment guide)

* visuals:

    * Split: left = CMS or catalog list (generic titles); right = assignment player with sidebar steps and a quiz pane stub—no real scores

* issues:

    * If Azure Functions are not deployed in a given environment, say so when demoing

---

## Slide 16

* title: Conclusion — By the Numbers and Lessons Learned

* purpose: close with impact and reflection

* key_message: the solution is measurable in breadth of roles and components; delivery taught lessons about identity, governance, and scope control

* time: 1:30

* presenter: -

* on_slide_text:

    * By the numbers: nine primary role keys in the selector (Guest through IT), seventeen SPFx web parts, two application customizers, many named SharePoint lists for hoteling, procedures, assignments, and directories
    * Lessons: align early on Entra group naming; prototype UX before committing lists; keep Power BI and Function configuration documented per environment; test role switching and “view as” carefully before stakeholder demos

* visuals:

    * Left column: three bold metrics with icons (roles / web parts / integrations); right column: two short lesson bullets with icons (identity, operations)

* issues:

    * Drop or adjust any metric you cannot verify live on demo day

---
