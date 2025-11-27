# Panel Interaction Specs

## ADDED Requirements

### Requirement: Panel Persistence on Flip
The panel MUST remain open when its position changes (e.g., flips from bottom to top) due to viewport constraints, provided the user's cursor remains over the reference word or the panel itself.

#### Scenario: Panel flips while hovering word
1.  User hovers over a word near the bottom of the viewport.
2.  The dictionary panel appears below the word.
3.  The panel content loads, increasing its height.
4.  The panel flips to position itself above the word due to lack of space at the bottom.
5.  The user's cursor remains stationary over the word.
6.  **Expectation**: The panel remains visible and does not close.

#### Scenario: Panel flips while hovering panel
1.  User hovers over a word, panel appears.
2.  User moves cursor into the panel.
3.  Panel resizes and flips position.
4.  User moves cursor to follow the panel (or if the new position overlaps).
5.  **Expectation**: The panel remains open as long as the cursor enters the new panel position within the interaction timeout or stays on the reference.
