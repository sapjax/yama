# Proposal: Custom Dictionary Panel Width

## Goal
Allow users to customize the width of the dictionary panel in the settings page.

## Context
Currently, the dictionary panel has a fixed width of `w-96` (384px). Some users may prefer a wider or narrower panel depending on their screen size and reading preferences.

## Changes
- Add a new setting `panelWidth` to `AppSettings`.
- Add a "Miscellaneous" (or similar) tab in the Options page.
- Add an input field in the new tab to configure the panel width (in pixels).
- Update the dictionary panel to use the configured width.
