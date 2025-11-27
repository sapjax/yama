# Fix Floating Panel Flip Disappearance

## Problem
When the dictionary panel is positioned near the edge of the viewport (e.g., at the bottom), `floating-ui`'s `flip()` middleware may move the panel to the opposite side (e.g., top) to fit the content. This sudden movement can trigger `mouseleave` events on the panel if the cursor is left behind at the original position.

Currently, the application manages the panel's open/close state using manual `mouseenter` and `mouseleave` listeners on the panel element, combined with a global `mousemove` listener for word detection. When the panel flips away from the cursor, the `mouseleave` event fires, scheduling a `hideDelay`. Although the cursor might still be over the reference word (which should keep the panel open), the manual logic fails to reconcile this state correctly in all timing scenarios, causing the panel to disappear unexpectedly.

## Solution
Refactor the panel's interaction logic to use `floating-ui`'s `useHover` hook.

1.  **Use `useHover`**: This hook provides robust handling for hover interactions, including "safe polygons" and delays. It automatically manages the open state based on whether the mouse is over the reference or the floating element.
2.  **Explicit Reference Element**: Instead of using a virtual element for positioning and a separate logic for events, we will use the existing `anchorRef` (a real DOM element positioned over the word) as the primary reference for `floating-ui`. This allows `useHover` to correctly detect when the mouse is over the word, even if the panel has flipped away.
3.  **Safe Polygon**: Configure `safePolygon` to ensure smooth transitions between the reference word and the panel.

This approach simplifies the code by removing manual state management and leverages the library's tested behavior for edge cases like flipping.
