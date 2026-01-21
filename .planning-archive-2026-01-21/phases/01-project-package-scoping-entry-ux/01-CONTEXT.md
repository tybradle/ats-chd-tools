# Phase 1: Project/Package Scoping + Entry UX - Context

**Gathered:** 2026-01-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver Project/Package scoping and entry UX so users can reliably enter BOM Translation in the correct context:
- Landing page shows module tiles; non-ready modules are disabled and labeled "Coming soon".
- Entering the BOM module prompts a Project Manager modal without leaving BOM context.
- Users can create/select/rename/delete Projects (job #) and Packages; the selected Package is the active workspace scope.
- Package names are unique within a Project; the same Package name can exist under different Projects.

</domain>

<decisions>
## Implementation Decisions

### Landing page module tiles
- Maintain the current landing page layout/content (review and keep as-is unless needed for wiring).
- Non-ready modules are shown as disabled tiles labeled "Coming soon".
- Clicking a disabled/"Coming soon" tile does nothing (no toast, no dialog).
- The landing page does not display the active Project/Package scope.

### BOM entry + scope selection modal
- Entering BOM Translation always opens the Project Manager modal (scope is intentionally ambiguous from the landing page).
- The modal is blocking: user must select a Project + Package before using BOM.
- In BOM, scope is displayed/changed via a left sidebar section (shows current Project/Package and a way to change it).
- If the user changes scope while there is unsaved work in BOM, auto-save a draft to the previous scope and then switch.

### Project/Package CRUD behavior
- All Project/Package create/select/rename/delete actions live inside the Project Manager modal (no separate Projects page in this phase).
- Creating a new scope requires both a Project number and a Package name (Project creation establishes an initial Package).
- Deleting a Project cascades to delete its Packages (and any scoped data under that Project), with a confirmation dialog.
- Rename/delete confirmations are simple confirm dialogs (no "type to confirm").

### Naming + uniqueness rules
- Project "job #" is free text (non-empty); do not enforce a specific format.
- Project job # must be unique across all Projects.
- Package name is free text; the only constraint is uniqueness within its Project.
- Uniqueness violations are shown as inline field errors under the relevant input.

### OpenCode's Discretion
- Exact visual styling and copy text for the Project Manager modal (labels, helper text), as long as it respects the behaviors above.
- Exact layout details of the BOM sidebar scope selector (within the left sidebar requirement).

</decisions>

<specifics>
## Specific Ideas

- "If you're on the landing page, project scope should be ambiguous."

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-project-package-scoping-entry-ux*
*Context gathered: 2026-01-20*
