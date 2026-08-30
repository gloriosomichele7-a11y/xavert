# XAVERT

Professional browser-based utility ecosystem.

XAVERT is a collection of high-quality browser tools built around a shared architecture, consistent user experience, browser-first execution and long-term maintainability.

Every tool is designed to look, behave and evolve as part of the same ecosystem rather than as an isolated application.

The project emphasizes:

- Professional quality
- Browser-first processing
- Privacy-first design
- Shared architecture
- Consistent user experience
- Accessibility
- Performance
- Continuous certification
- Long-term maintainability

---

# Project Documentation

This `README.md` is the authoritative project documentation included in the current repository.

It defines the architecture, workflow, certification principles, Shared Core rules and development standards used by XAVERT. Additional documentation should be treated as authoritative only after it has been added to the repository and kept aligned with this file.

---

# Development Principles

Every tool must:

- solve one primary problem;
- remain focused and intuitive;
- integrate with the Shared Core;
- follow the official architecture;
- reuse shared assets whenever possible;
- minimize duplicated code;
- pass certification before release;
- improve the ecosystem rather than only itself.

Changes should be made only when they provide a clear and measurable benefit.

If a tool is already clear, consistent, accessible and maintainable, it should remain unchanged.

---

# Tool Architecture

Each XAVERT tool has:

- one dedicated HTML file;
- one dedicated JavaScript file;
- tool-specific CSS only when required;
- shared behavior and reusable presentation supplied by the Shared Core.

Tool-specific CSS should remain local to the tool page when needed.

Reusable behavior, common UI patterns and ecosystem-wide logic must remain centralized in shared assets whenever possible.

The standard tool structure is:

```text
Back to Home
    ↓
Hero
    ↓
Tool Card / Workspace
    ↓
Result Area
    ↓
About
    ↓
Related Tools
    ↓
Powered by XAVERT
    ↓
Shared Toast
```

The Hero contains the XAVERT logo and the tool title only.

Descriptions, privacy information and explanatory content belong in the About section rather than directly under the Hero title.

---

# Shared Assets

Tools should rely on shared assets instead of re-implementing common behavior locally.

Shared resources include:

- global.css
- components.css
- responsive.css
- global.js
- utils.js
- related-tools.js

Shared assets are part of the XAVERT architecture and should not be duplicated or overridden locally unless a tool genuinely requires specific behavior.

---

# Shared Core Behavior

Common interaction and feedback patterns must remain consistent across the ecosystem.

Core rules include:

- Enter executes the active primary action where appropriate.
- Shift+Enter inserts a new line in textareas.
- Inputs, selects, buttons and links must respect their normal interaction behavior.
- Successful primary actions show persistent success feedback and a temporary success toast.
- Copy, Download and Load Sample follow the same success-feedback standard when applicable.
- Clear shows only a temporary success toast.
- Persistent success feedback disappears as soon as the user changes an input or setting.
- Shared feedback behavior should be implemented through the Shared Core instead of duplicated inside individual tool JavaScript.
- Tool JavaScript should reset tool state on Clear but should not duplicate Shared Core Clear feedback.

Whenever a shared utility already handles Copy, Download or another common action, individual tools should reuse it instead of adding parallel success logic.

---

# Primary Actions

Every tool should expose one clear primary workflow.

Where keyboard execution is appropriate:

- Enter triggers the primary action.
- Shift+Enter inserts a new line in a textarea.

The preferred primary-action contract is:

```html
data-primary-action
```

Clear controls should use:

```html
data-clear-action
```

Shared Core behavior should remain authoritative for common keyboard and feedback logic.

---

# Sample Policy

Load Sample / Load Example should be included only when it provides clear practical value.

Do not add sample functionality merely for visual consistency.

When a sample is useful:

- prefer declarative sample configuration handled centrally by `global.js` through the `data-sample-loader` contract;
- keep sample data declarative whenever possible;
- use tool-specific sample logic only when dynamic state or custom processing cannot be represented safely through the shared contract;
- ensure the sample does not interfere with dynamic form rebuilding or tool state;
- remove the feature when it adds complexity without meaningful user benefit.

Quality and reliability are more important than having a sample button on every tool.

---

# Related Tools Policy

Related Tools are generated dynamically.

Rules:

- show only genuinely relevant related tools;
- if more than four tools are relevant, show more than four rather than enforcing a rigid limit;
- never add filler recommendations;
- never include the current tool;
- hide the section if no relevant related tools exist.

Related-tool metadata and fallback relationships are managed centrally through `related-tools.js`.

Individual tool pages may also declare their related tools through the page-level data contract when appropriate.

Quality is always preferred over quantity.

---

# About Section Standard

The About section follows a consistent structure:

```text
About
    ↓
Intro
    ↓
Main Features
    ↓
Feature List
    ↓
Privacy First
    ↓
Privacy Description
```

Tool-specific notes may follow when they provide useful context.

Privacy statements must accurately describe the actual behavior of the tool.

Do not claim that a tool is completely offline or zero-network when it depends on CDN libraries, remote AI models or other external runtime resources.

---

# Privacy-First Design

XAVERT follows a browser-first and privacy-first approach.

When a tool processes user content locally, the relevant content should remain on the user's device unless the tool explicitly requires an external service.

Privacy wording must be specific to the actual implementation.

Browser-first does not mean browser-at-all-costs: architecture decisions should prioritize quality, reliability, privacy and user experience.

---

# UI / UX Principles

Every interface should be immediately understandable.

Before approving any tool, verify whether there is an obvious improvement that:

- removes duplicated functionality;
- simplifies the user interface;
- improves labels or placeholders;
- improves accessibility;
- improves responsive behavior;
- reduces unnecessary code;
- makes the workflow more intuitive.

Apply a change only if it provides a measurable benefit.

Avoid modifications based only on personal preference.

If a tool is already clear, consistent and maintainable, it should remain unchanged.

---

# Accessibility

Accessibility is part of tool completion, not an optional enhancement.

Tools should:

- use semantic HTML;
- associate labels with controls;
- expose clear keyboard interaction;
- preserve visible focus states;
- use `role="status"` and appropriate `aria-live` behavior for dynamic messages;
- avoid unnecessary keyboard traps;
- remain usable across desktop and mobile layouts.

Dynamic status messages should use the shared accessibility contract whenever possible.

---

# Performance

Browser tools should remain responsive and efficient.

When processing large files or computationally expensive data:

- use safe file-size and memory limits;
- avoid unnecessary duplicate processing;
- release temporary object URLs and resources;
- use Workers where they provide a clear benefit;
- prevent operations that exceed safe browser limits;
- fail clearly instead of freezing the interface.

Performance safeguards should adapt to the tool's actual workload.

---

# External Libraries

External libraries may be used when they provide a meaningful quality or compatibility benefit.

Rules:

- prefer stable and well-maintained libraries;
- load them only when required when practical;
- avoid unnecessary dependencies;
- document network requirements accurately;
- keep bundled vendor files in the shared vendor directory when the project already provides them;
- do not duplicate a library locally inside individual tool folders.

A tool that downloads a library or model at runtime must not be described as completely offline.

---

# Development Workflow

```text
Idea
    ↓
Planning
    ↓
Implementation
    ↓
Testing
    ↓
Architecture Review
    ↓
UI / UX Review
    ↓
Shared Core Review
    ↓
Certification
    ↓
Release
    ↓
Maintenance
```

Testing should cover both code correctness and real user behavior.

Static validation and syntax checks are useful, but browser testing remains necessary for interactive features, file handling, downloads, clipboard access, camera access and external runtime libraries.

---

# Certification Philosophy

A tool is considered complete only when it satisfies all project standards:

- functionality;
- architecture;
- accessibility;
- responsiveness;
- maintainability;
- shared asset integration;
- SEO;
- privacy;
- user experience.

Certification applies to the entire tool, not only to its code.

A tool should not be considered complete solely because it passes syntax checks.

---

# SEO

Each public tool page should maintain accurate and stable:

- page title;
- meta description;
- canonical URL;
- Open Graph metadata;
- Twitter metadata;
- structured data where appropriate.

Internal JavaScript changes do not require URL or canonical changes unless the identity or purpose of the page actually changes.

Existing URLs should remain stable whenever possible.

The sitemap should contain all public tool pages and legal pages that are intended to be indexed.

---

# Maintainability

Long-term maintainability is a core project requirement.

Prefer:

- shared infrastructure over local duplication;
- stable DOM contracts;
- clear naming;
- defensive initialization;
- event listeners instead of inline handlers;
- reusable utilities;
- minimal special cases;
- deliberate changes rather than broad rewrites.

Tool-specific code should remain understandable without depending on hidden assumptions.

---

# Project Goals

The objective of XAVERT is not to build the largest collection of browser tools.

The objective is to build one of the highest-quality browser utility ecosystems through:

- consistent architecture;
- shared components;
- disciplined development;
- continuous improvement;
- professional design;
- intuitive user experience;
- maintainable code;
- long-term evolution.

Every new tool or feature should strengthen the ecosystem rather than simply increase the tool count.

---

# License

No license has been specified yet for this repository.

A LICENSE file should be added before any public distribution or external reuse.
