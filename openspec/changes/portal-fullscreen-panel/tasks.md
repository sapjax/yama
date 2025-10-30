# Task List: Fullscreen Panel Portal

- [x] 1. **Define Helper Functions in `main.tsx`**:
  - Define `createStyledShadowRoot` to encapsulate shadow DOM creation and styling.
  - Define `useFullscreenContainer` hook logic to track `document.fullscreenElement`.

- [x] 2. **Define Core `FullscreenManager` Component in `main.tsx`**:
  - This single component is responsible for all fullscreen logic.
  - It uses the helper hook to get the fullscreen state.
  - When entering fullscreen, it creates a portal to a new, dynamically created shadow DOM.
  - When not in fullscreen, it renders its children directly.

- [x] 3. **Update App Mounting in `main.tsx`**:
  - Wrap the `<App />` component with the new `<FullscreenManager />` at the root of the render call.

- [ ] 4. **Testing**:
  - Manually test on a page with an HTML5 video (e.g., YouTube).
  - Verify the dictionary panel appears over the video in fullscreen mode.
  - Verify the panel returns to its normal position and function when exiting fullscreen.
  - Verify the panel continues to work correctly on pages without videos.
