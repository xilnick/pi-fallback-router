# TP-007: Polish README for User Attraction

**Status:** Pending
**Size:** S
**Priority:** High

## Goal

Transform the README from functional-but-flat into a compelling document that makes developers want to install and use this extension immediately.

## Background

The current README documents what the extension does, but doesn't sell it. A developer scanning extensions needs to understand the value in under 30 seconds.

## Steps

- [ ] **Step 1: Audit current README content**
  - Read the current `README.md` in full
  - Note what's accurate, what's outdated, what's missing
  - Identify sections that don't add value for someone deciding whether to install

- [ ] **Step 2: Restructure with strong opening**
  - Replace the title with something punchy: `pi-fallback-router — Automatic model failover for pi`
  - Add a **TL;DR** badge row at the top: one-liners for what it does, who it's for, and the key benefit
  - Add a **Highlights** section with 4-6 bullet points that sell the value (not just features)
  - Move "How It Works" to the top as a 3-step visual flow

- [ ] **Step 3: Add badges and visual polish**
  - Add shields.io badges at the top:
    - npm version
    - License (MIT)
    - Build/test status (if a CI badge is available)
  - Use consistent emoji sparingly for visual hierarchy
  - Ensure code blocks have proper language tags for syntax highlighting

- [ ] **Step 4: Rewrite Installation section**
  - Current install is vague ("clone or copy"). Be specific about the common pi extension path.
  - Add a **Quick Start** sub-section: 3 commands to get running in under 2 minutes
  - Document the config file creation clearly with a working example
  - Add a **Verify It Works** step so users know they succeeded

- [ ] **Step 5: Refresh the Configuration section**
  - Update the example to use real model names (not placeholders like `zai/glm-5.1`)
  - Add a **Common Configurations** sub-section with 2-3 ready-to-copy configs:
    1. High availability (3+ providers)
    2. Cost optimization (expensive primary, cheap fallback)
    3. Regional redundancy (different data centers)
  - Document all config options, not just the chains array

- [ ] **Step 6: Add Troubleshooting section**
  - Move existing troubleshooting tips here
  - Add common pitfalls:
    - "Model not found" — check exact model IDs from `pi --list-models`
    - "No fallback triggered" — the error might be non-retryable (400/401/403)
    - "Extension not loading" — verify the path in `pi -e`

- [ ] **Step 7: Final polish**
  - Proofread for grammar and clarity
  - Ensure all code examples are syntactically correct
  - Run `npm run check` to make sure no broken links or fake docs
  - The README should look good rendered on GitHub and npm

## Dependencies

- TP-006 must be complete (test consolidation provides a stable foundation)

## Out of Scope

- Actually publishing to npm (operator does that)
- Creating a website or demo page
- Adding animated demos or screenshots
- Writing migration guide from other solutions
