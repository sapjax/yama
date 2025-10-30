# Proposal: Ensure Dictionary Panel Visibility Over Fullscreen Videos

## The Why

When a browser enters fullscreen mode with an element (e.g., a `<video>`), it places that element in a new top-level rendering layer. Only DOM elements that are descendants of the `document.fullscreenElement` can be displayed on top of the fullscreen content.

The Yama dictionary panel is currently rendered inside a host element attached to the document's `<body>`. Because this host element is not a descendant of the fullscreen element, the panel is inevitably hidden whenever a video is played in fullscreen, making it unusable.

## The What

This change will implement a solution to ensure the dictionary panel remains visible and interactive, even when a video is in fullscreen mode.

The solution will use React Portals to dynamically re-parent the application's root component. A new mechanism will listen for `fullscreenchange` events on the document.

- When an element **enters** fullscreen, the entire React application will be "portaled" into the `document.fullscreenElement`.
- When the element **exits** fullscreen, the application will be portaled back to its original host element.

This approach preserves the React component state and event listeners. Crucially, it will be implemented to ensure that the application's shadow DOM context is maintained throughout these transitions, preserving style encapsulation.