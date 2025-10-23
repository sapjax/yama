# Project: yama (山)

## 1. Purpose

Yama (山) is a browser extension designed to help Japanese learners read web content more immersively and effectively. It transforms any webpage into a dynamic study tool by providing instant dictionary lookups, word tracking, AI-powered explanations, and optional integration with services like JPDB.io.

It aims to be a free, open-source, and highly customizable alternative to other language-learning browser tools.

## 2. Core Features

-   **Instant Dictionary Lookup**: Hover over any Japanese word to see its definition and reading from multiple dictionary sources (currently supports JPDB and Kuma).
-   **Word Status Tracking**: Mark words as `Tracking`, `Ignored`, or `Never Forget`. The extension highlights words with customizable colors based on their status, giving a clear visual indication of vocabulary knowledge.
-   **Text Segmentation**: Utilizes multiple tokenizers (`Lindera`, browser-native) to accurately segment Japanese sentences into words.
-   **AI Sentence Explanation**: Configure a custom AI endpoint (compatible with OpenAI and Gemini APIs) to get AI-powered explanations for selected sentences.
-   **Audio Pronunciation**: Play audio for Japanese words and sentences using the browser's built-in Text-to-Speech (TTS) engine.
-   **JPDB.io Integration**: Automatically synchronize word statuses with a JPDB.io account, allowing users to create flashcards from words encountered while browsing.
-   **On-Page Statistics**: The popup menu displays a distribution chart of word statuses on the current page, providing a quick glance at the content's vocabulary difficulty.
-   **Highly Customizable**:
    -   **UI Themes**: Choose from several pre-built themes (e.g., `Default`, `Claude`, `Pastel Dreams`) or create a custom one.
    -   **Highlight Colors**: Full control over the colors used for different word statuses.
    -   **Component Behavior**: Adjust dictionary sources, AI providers, segmentation methods, and more.
    -   **Keyboard Shortcuts**: Configure shortcuts for common actions.

## 3. Architecture & Design

Yama uses a robust, decoupled, message-passing architecture to separate concerns and maintain a clean, scalable structure.

### 3.1. Architectural Model

The extension operates on a **client-server model**:

-   **`background` script (The "Server")**: A long-running service worker that acts as the core of the extension. It owns and manages all state and business logic, including text segmentation, dictionary lookups, AI calls, and settings management. It is the single source of truth.
-   **`content` script (The "Client")**: A lightweight script injected into web pages. Its primary responsibility is to interact with the DOM (finding text nodes, rendering highlights) and relay user actions to the background script. It contains no business logic.
-   **Communication**: The content and background scripts communicate exclusively through asynchronous messages, facilitated by the `webext-bridge` library. This ensures loose coupling between the presentation layer and the logic layer.

### 3.2. Dependency Management

The background script uses a **Service Container** (`src/lib/services.ts`) to instantiate, configure, and manage the lifecycle of its core services (e.g., `Segmenter`, `Dictionary`, `AiProxy`). The main background script (`src/background/index.ts`) simply imports these pre-configured service instances and focuses on routing messages, adhering to the **Dependency Inversion** and **Single Responsibility Principles**.

### 3.3. Core Design Principles

-   **SOLID**: The five core principles of object-oriented design are followed to create a modular and maintainable system.
-   **Single Source of Truth (SSoT)**: All application state is managed by the background script to ensure data consistency.
-   **Modularity & High Cohesion**: The system is composed of independent modules (e.g., `dict`, `segment`, `ai`) with clearly defined responsibilities.
-   **Loose Coupling**: Changes in one module have minimal impact on others, primarily achieved through message passing and service interfaces.
-   **Programming to Interfaces**: Core services depend on abstract interfaces (`IDict`, `ISegmenter`) rather than concrete implementations, allowing for easy extension and testing.

## 4. Project Structure

The project is a standard Vite-based web extension, structured around several key entry points defined in `manifest.config.ts`.

| Component | Entrypoint Path | Description |
| :--- | :--- | :--- |
| **Background** | `src/background/index.ts` | The core service worker (server). |
| **Content** | `src/content/main.tsx` | The script that runs on web pages (client). |
| **Popup** | `src/popup/index.html` | The UI for the extension's action button. |
| **Options** | `src/options/index.html` | The main settings page for the extension. |
| **Offscreen** | `src/offscreen/audio.html` | An offscreen document to handle audio playback for TTS. |

## 5. Tech Stack

| Category | Technology / Library |
| :--- | :--- |
| **Language** | TypeScript |
| **Framework** | React 19 (with Compiler) |
| **Build Tool** | Vite |
| **Extension Framework** | CRXJS |
| **Styling** | Tailwind CSS, PostCSS |
| **UI Components** | Shadcn UI (`radix-ui`), `lucide-react` |
| **State Management** | `webext-bridge` (for cross-script state) |
| **Linting & Formatting** | ESLint, `@stylistic/eslint-plugin` |
| **Testing** | Vitest |
| **Tokenizer** | `lindera-wasm-ipadic`, `bunkatsu` |
| **Drag & Drop** | `@dnd-kit` |

## 6. Getting Started

1.  Install dependencies: `bun install`
2.  Run the development server: `bun run dev`
3.  Load the `dist` folder as an unpacked extension in a Chromium-based browser.

### Scripts

-   `bun run dev`: Starts the development server with hot-reloading.
-   `bun run build`: Compiles the extension for production.
-   `bun run fmt`: Lints and formats the entire codebase.
-   `bun run test`: Runs the test suite using Vitest.