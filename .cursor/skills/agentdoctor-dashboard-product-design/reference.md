# AgentDoctor Dashboard Product Design — Full Spec

Use with [SKILL.md](SKILL.md). Backend truth is authoritative. Do not invent capabilities.

IMPORTANT:
Do not invent backend capabilities.
Before changing UI, inspect the existing API routes, contracts, dashboard handlers, types, and existing frontend implementation.

Treat backend truth as authoritative.

==================================================
# 1. DESIGN PHILOSOPHY
==================================================

Use this hierarchy:

PROJECT
↓
UNDERSTAND
↓
CHECK
↓
ACT
↓
VERIFY

The user should immediately understand:

1. What project am I looking at?
2. What is the current state?
3. Is anything important wrong?
4. What should I do next?
5. Where can I investigate deeper?

Use progressive disclosure.

Simple information first.
Technical details second.
Raw JSON only inside expandable technical/debug panels.

==================================================
# 2. DASHBOARD HOME
==================================================

Redesign Home as a real Project Overview.

Top area:

AgentDoctor
Project name
Project type
technology stack
Git status
last analysis
overall project state

Then show high-value cards:

- Project Health
- Tests
- Security
- Architecture
- Dependencies
- Changes
- AI Agent
- Evidence / Verification

Each card must contain:
- current state
- concise explanation
- confidence/status indicator
- click-through action where supported

Do NOT invent numerical scores.

If the backend does not provide a numeric score, use semantic states such as:

Healthy
Attention
Warning
Blocked
Unknown
Not analyzed

Do not fabricate percentages.

==================================================
# 3. VERSION CONSISTENCY
==================================================

Fix all visible version inconsistencies.

The UI must obtain the AgentDoctor version from the canonical backend/package source.

Never hardcode:

AgentDoctor 2.0

if the actual product version is 3.0.0.

Audit:
- page title
- header
- footer
- API status
- about/version panel
- dashboard metadata

There must be one authoritative version source.

==================================================
# 4. NAVIGATION
==================================================

Replace the crowded top link list with a clean information architecture.

Primary navigation should be grouped conceptually.

Suggested structure:

OVERVIEW
- Home
- Project Chat

UNDERSTAND
- Project DNA
- Architecture / Map
- Graph
- Dependencies
- Search

CHECK
- Security
- Tests
- Changes
- Requirements
- Evidence

INTELLIGENCE
- What-if
- Decisions
- Memory
- Evolution
- Digital Twin

OPERATIONS
- Infrastructure
- Incidents
- Forensics

LEARNING
- Learn
- Viva
- Documentation

SYSTEM
- Doctors
- Settings / Technical details

Only expose routes that actually exist.

If some routes are experimental, label them honestly.

Do not create fake pages just to make navigation look complete.

==================================================
# 5. SAFETY / STATUS BANNER
==================================================

The current technical banner is too dominant.

Move low-level messages such as:

- evaluate-only
- local identity hint
- loopback
- OIDC experimental
- no cloud writes

into a compact:

System & Safety Status

component.

Example:

Safety
Local-only • Read-only dashboard • No cloud writes

Then allow:

View technical details

to expand the complete diagnostic information.

Do not hide important safety information.
Just present it progressively.

==================================================
# 6. RAW JSON
==================================================

Never render huge raw JSON as the primary Home experience.

Create reusable components:

StatusCard
ProjectOverview
HealthCard
SecurityCard
TestCard
ArchitectureCard
ChangeCard
AgentCard
EvidenceCard
TechnicalDetails

Raw JSON should only appear under:

Technical Details
API Response
Debug Information

with:
- collapsible sections
- monospace typography
- copy button
- readable formatting

==================================================
# 7. PROJECT IDENTITY
==================================================

Every page should clearly know which project is active.

Show:

Project name
Root directory
Git branch
project type
detected technologies

But don't make absolute filesystem paths visually dominant.

Example:

AgentDoctor
TypeScript / Node.js
Git repository
main
12 technologies detected

Then:

Root:
~/Projects/AgentDoctor

inside secondary metadata.

==================================================
# 8. EMPTY STATES
==================================================

Design useful empty states.

Never show:

[]

{}

No data

instead explain:

WHAT IS MISSING
WHY IT MATTERS
WHAT THE USER CAN DO

Example:

No test framework detected

AgentDoctor could not identify a configured test runner for this project.

[Inspect project]

==================================================
# 9. TRUTH MODEL
==================================================

AgentDoctor has a strong evidence/truth model.

The UI must preserve it.

Use visible labels:

VERIFIED
INFERRED
UNKNOWN
EXTERNAL

Do not visually imply certainty where the backend does not have certainty.

Where appropriate show:

Source
File
Line/range
Evidence type
Confidence

Never fabricate evidence.

==================================================
# 10. SECURITY UX
==================================================

Security should be understandable.

Do not dump scanner JSON.

Show:

Security overview

Secrets
Path safety
Prompt injection
Dependency concerns
Policy status
Forensic findings

Each finding should contain:

Severity
Status
What happened
Why it matters
Evidence
Recommended action

Use technical details as expandable content.

==================================================
# 11. AI AGENT UX
==================================================

AI should not dominate the entire product.

AgentDoctor must work for users who never use Cursor/Claude/Codex.

If AI tooling exists:
show:

AI-assisted development detected

and relevant controls.

If no AI tooling exists:

AgentDoctor works normally without AI coding agents.

Do NOT make "no Cursor config found" look like an error.

==================================================
# 12. STUDENT EXPERIENCE
==================================================

AgentDoctor is also intended for students.

Student-facing pages must not look like internal engineering diagnostics.

For learning surfaces:

Use:
- simple explanations
- project walkthrough
- how the project works
- viva preparation
- documentation
- learning roadmap
- recommended next step

Avoid unnecessary jargon.

Keep the same underlying product engine.

Do not create a separate codebase.

==================================================
# 13. VISUAL LANGUAGE
==================================================

Create a professional engineering-product visual language.

Prefer:

- dark professional interface
- strong typography hierarchy
- restrained accent colors
- cards with meaningful grouping
- generous spacing
- subtle borders
- readable code blocks
- clear status badges
- responsive layout
- accessible contrast

Avoid:

- excessive gradients
- excessive glassmorphism
- giant decorative illustrations
- meaningless charts
- rainbow colors
- oversized headings
- dashboard-template aesthetics

The interface should feel closer to a serious developer platform than a marketing website.

==================================================
# 14. RESPONSIVE DESIGN
==================================================

Must work at:

- desktop
- laptop
- tablet
- narrow browser

Navigation should collapse appropriately.

Do not allow:
- text clipping
- horizontal overflow
- broken cards
- unreadable JSON
- navigation wrapping into awkward rows

==================================================
# 15. COMPONENT ARCHITECTURE
==================================================

Inspect the existing frontend architecture first.

Prefer reusable components:

Layout
Sidebar
TopBar
Breadcrumbs
ProjectSwitcher
StatusBadge
HealthCard
MetricCard
FindingCard
EvidencePanel
TechnicalDetails
EmptyState
LoadingState
ErrorState
DataTable
CodeViewer
SectionHeader

Do not duplicate UI logic across pages.

Use the existing framework and component system where possible.

Do not introduce a large new UI framework unless the repository already uses one or there is a clear technical reason.

==================================================
# 16. DATA CONTRACT SAFETY
==================================================

Before modifying a page:

1. Find the API endpoint.
2. Find the response type.
3. Inspect the actual response.
4. Identify nullable/optional fields.
5. Design the UI around real data.
6. Handle loading/error/empty states.
7. Keep existing contracts backward compatible.

Never make UI assumptions based only on field names.

==================================================
# 17. AUDIT THE ENTIRE DASHBOARD
==================================================

Do NOT only modify the Home page.

Inspect every existing dashboard route.

Create an internal audit:

Route
Purpose
Backend endpoint
Data source
Current UI quality
Missing states
Broken links
Version inconsistencies
Raw JSON exposure
UX issues
Security concerns
Recommended improvement

Then implement the improvements.

==================================================
# 18. IMPORTANT CURRENT SCREENSHOT ISSUE
==================================================

The current dashboard visually contains:

"AgentDoctor 2.0"

while the status payload reports:

"version": "3.0.0"

Treat this as a concrete defect and trace the canonical version source before fixing it.

The current Home page also exposes a large raw status JSON object.

Replace this with a structured Project Overview while preserving access to technical details.

==================================================
# 19. DO NOT BREAK AGENTDOCTOR
==================================================

This is a mature product.

Do NOT:
- rewrite the backend
- remove existing APIs
- remove existing safety controls
- remove truth labels
- remove evidence
- weaken approval
- bypass path safety
- bypass workspace isolation
- add unrestricted shell execution
- fabricate functionality
- fabricate metrics
- silently change contracts

Dashboard improvements must consume the existing product capabilities.

==================================================
# 20. VERIFICATION
==================================================

After implementation:

Run the existing verification suite.

Also test:

- Home
- every navigation item
- project switching if supported
- empty project
- normal project
- project with security findings
- project without tests
- project without Git
- project without AI tooling
- project with AI tooling
- technical details expansion
- raw JSON copy
- responsive viewport
- loading state
- API failure state

Verify no broken routes.

Verify no console errors.

Verify no horizontal overflow.

Verify all version labels are consistent.

==================================================
# 21. FINAL OUTPUT
==================================================

At the end provide:

1. Dashboard audit summary
2. Files changed
3. Routes audited
4. UX problems fixed
5. Backend contracts preserved
6. Tests run
7. Remaining limitations
8. Screenshots/browser verification performed

Do not claim "production ready" unless the actual verification supports it.

The goal is not simply to make the dashboard prettier.

The goal is:

Turn AgentDoctor's existing engineering capabilities into a clear, trustworthy, professional project intelligence interface.

The dashboard should make a first-time user understand AgentDoctor within 30 seconds.
