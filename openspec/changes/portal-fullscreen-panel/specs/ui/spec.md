# Spec Delta: UI - Fullscreen Video Overlay

## MODIFIED Requirements

### Requirement: The dictionary panel MUST remain visible over fullscreen videos

To ensure usability during video playback, the dictionary panel's UI **MUST** be rendered within the active `fullscreenElement` when one is present.

#### Scenario: User enters and exits video fullscreen
- **Given** a web page containing a video element.
- **And** the Yama extension is active.
- **When** the user clicks the fullscreen button on the video player.
- **Then** the video expands to fill the screen.
- **And** the Yama dictionary panel MUST remain visible and interactive on top of the video.
- **When** the user exits fullscreen mode.
- **Then** the video returns to its original size.
- **And** the Yama dictionary panel MUST return to its standard position and be fully functional.

#### Technical Implementation
- A single `FullscreenManager` component wraps the main `App` component.
- This manager component uses a hook to listen for `fullscreenchange` events.
- When fullscreen is active, it uses a React Portal to render the `App` into a new, dynamically created shadow DOM inside the `fullscreenElement`.
- All logic (helpers, manager component, and mounting) is consolidated within `src/content/main.tsx`.
