# AI Render Runtime

> Rendering engine that converts AI-generated structured data directly into UI components

[English](./README.en.md) | [中文](./README.md)

## Table of Contents

- [Core Value](#core-value)
- [Why AI Render](#why-ai-render)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [AI Native Features](#ai-native-features)
- [API Reference](#api-reference)
- [Security Best Practices](#security-best-practices)
- [Core Concepts](#core-concepts)

---

## Core Value

**AI Native** - Not another React, but a rendering engine designed specifically for AI:

```
AI outputs JSON → AIRender.render() → High-performance UI
```

### Difference from React/Vue

| Feature | React/Vue | AI Render |
|---------|-----------|-----------|
| Core Input | JSX/Template | AI JSON Spec |
| State Source | Developer-defined | AI dynamically generated |
| Update Method | Manual setState | AI output auto-renders |
| Hot Update | Manual handling | Built-in `air.update()` |
| AI Integration | External implementation | Built-in adapters |

---

## Why AI Render

### Traditional AI + Frontend Workflow

```
1. AI returns JSON (or text description)
2. Developer manually converts to component code
3. Write components, bind data
4. Test and verify
5. Deploy
```

**Pain Point**: Every AI response requires developer intervention, making true AI-native applications impossible.

### Using AI Render

```
1. AI returns JSON
2. AIRender.render() renders directly
3. User sees result
```

**Advantages**:
- Zero manual conversion
- Real-time AI output rendering
- Built-in hot updates
- Streaming generation support

---

## Quick Start

### Install

```bash
npm install
npm run build
```

### Method 1: AI-Driven Rendering (Core Use Case)

**Key**: AI calls should be made on the backend. Frontend only handles rendering. Here's the correct integration pattern:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │     │   Backend   │     │   AI API    │
│  (AIRender) │◀───│  (API Proxy)│───▶│   (LLM)     │
└─────────────┘     └─────────────┘     └─────────────┘
    Render            Safe Forward         Generate UI Spec
```

**Frontend Code (rendering only)**:

```javascript
import { AIRender } from 'ai-render-runtime';

// Only responsible for rendering AI-returned Spec
const app = new AIRender({
  container: '#app',
  initialSpec: null  // Start empty, wait for backend
});

// Fetch AI-generated Spec from backend
async function fetchAISpec(prompt) {
  // Note: API call goes to YOUR backend, not directly to AI
  const response = await fetch('/api/generate-ui', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  return response.json();  // Returns { spec: {...} }
}

// Usage
const { spec } = await fetchAISpec('Create a login form');
app.update(spec);
```

**Backend Code Example (Node.js)**:

```javascript
// server.js - Secure API Proxy
const express = require('express');
const { callAI } = require('ai-render-runtime');

const app = express();
app.use(express.json());

app.post('/api/generate-ui', async (req, res) => {
  const { prompt } = req.body;

  try {
    // API Key stays on backend, never exposed to frontend
    const response = await callAI('openai', {
      apiKey: process.env.OPENAI_API_KEY,  // Environment variable
      model: 'gpt-4'
    }, prompt);

    const spec = JSON.parse(response.content);
    res.json({ spec });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

### Method 2: Built-in AI Generator (Dev/Demo Only)

If your AI API supports CORS or you use a proxy, you can use the built-in generator directly:

```javascript
import { createAIGen } from 'ai-render-runtime';

const gen = createAIGen({
  container: '#app',
  apiKey: 'your-api-key',  // For demo only, NOT recommended for production
  provider: 'openai',
  apiUrl: '/api/proxy',  // Point to your backend proxy
  model: 'gpt-4'
});

// Generate and render
await gen.generate('Create a dashboard');
```

### Method 3: Intent Routing + AI Understanding

**Key**: Intent routing gives your AI UI interactive capabilities:

```
User clicks button → Intent triggered → Backend AI understands → Returns new Spec → Hot update UI
```

```javascript
import { createIntentRouter, AIRender } from 'ai-render-runtime';

// 1. Create renderer
const app = new AIRender({ container: '#app' });

// 2. Create Intent router
const router = createIntentRouter();

// 3. Register Intent handlers (pointing to your backend AI service)
router.register('onClick', async (payload) => {
  // Send to backend, which calls AI to understand intent
  const response = await fetch('/api/ai-understand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'click',
      element: payload.id,
      context: payload
    })
  });
  return response.json();  // Returns { spec: {...} } or { command: '...' }
});

router.register('onSubmit', async (payload) => {
  const response = await fetch('/api/ai-understand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'submit',
      formData: payload,
      context: 'login_form'
    })
  });
  return response.json();
});

// 4. Initial render (backend returns first AI UI)
const { spec } = await fetch('/api/ai-initial');
app.update(spec);

// 5. Bind Intent to AI-generated UI
// Assume AI-returned buttons have data-intent="onClick" attribute
document.addEventListener('click', async (e) => {
  const intentElement = e.target.closest('[data-intent]');
  if (intentElement) {
    const intentName = intentElement.dataset.intent;
    const payload = { id: intentElement.id, value: intentElement.value };

    const result = await router.handle(intentName, payload);

    // If new Spec returned, hot update UI
    if (result && result.spec) {
      app.update(result.spec);
    }
  }
});
```

**Backend AI Understanding Service**:

```javascript
// server.js - AI Understanding Service
app.post('/api/ai-understand', async (req, res) => {
  const { action, element, context } = req.body;

  // Construct prompt for AI to decide next UI
  const prompt = `
    User performed an action on AI-generated UI:
    - Action type: ${action}
    - Element: ${element}
    - Context: ${JSON.stringify(context)}

    Based on user intent, return the next UI as JSON Spec.
    If user is filling form, return form with input values.
    If user clicked button, return result UI after button click.
  `;

  const response = await callAI('openai', {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4'
  }, prompt);

  try {
    const spec = JSON.parse(response.content);
    res.json({ spec });
  } catch {
    res.status(500).json({ error: 'Failed to parse AI response' });
  }
});
```

---

## Architecture

### Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AI Render Runtime                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │ AI Adapter │───▶│   Parser   │───▶│  AIRender       │ │
│  └─────────────┘    └─────────────┘    │                 │ │
│                                          │  ┌───────────┐ │ │
│  ┌─────────────┐    ┌─────────────┐      │  │ Registry  │ │ │
│  │ AIStream   │───▶│ Spec JSON  │──────▶│  └─────┬─────┘ │ │
│  └─────────────┘    └─────────────┘      │        │       │ │
│                                          │        ▼       │ │
│  ┌─────────────┐    ┌─────────────┐      │  ┌─────────┐  │ │
│  │IntentRouter│◀───│  Events    │◀─────│  │Renderer │  │ │
│  └─────────────┘    └─────────────┘      │  └───┬─────┘  │ │
│                                          │      │         │ │
│                                          └──────┼─────────┘ │
│                                                 │          │
│  ┌─────────────────────────────────────────────┼──────────┤
│  │                  Core Engine                │          │
│  ├─────────────────────────────────────────────┼──────────┤
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐   │          │
│  │  │ Signal │  │  VDOM   │  │  Diff   │   │          │
│  │  │(Reactive│  │(Virtual)│  │(O(n))  │   │          │
│  │  └─────────┘  └─────────┘  └─────────┘   │          │
│  │                                             │          │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐   │          │
│  │  │Lifecycle│  │ Context │  │  Memo  │   │          │
│  │  │         │  │         │  │        │   │          │
│  │  └─────────┘  └─────────┘  └─────────┘   │          │
│  └─────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

### Core Modules

#### 1. AI Adapter Layer

```
┌─────────────────────────────────────────┐
│            AI Adapter                     │
├─────────────────────────────────────────┤
│                                         │
│  callAI(provider, config, prompt)        │
│       │                                 │
│       ├──▶ MiniMax Adapter             │
│       ├──▶ OpenAI Adapter              │
│       └──▶ Anthropic Adapter           │
│                                         │
│  parseAIResponse(content)              │
│       │                                 │
│       └──▶ JSON Extractor              │
│              - Markdown code block     │
│              - Brace range extraction  │
│              - Fault-tolerant parsing  │
│                                         │
└─────────────────────────────────────────┘
```

#### 2. Registry (Component Registry)

```
┌─────────────────────────────────────────┐
│         ComponentRegistry                 │
├─────────────────────────────────────────┤
│                                         │
│  register(type, renderFn)              │
│       │                                 │
│       ├──▶ 'card'     → CardRenderer  │
│       ├──▶ 'form'     → FormRenderer  │
│       ├──▶ 'input'    → InputRenderer │
│       ├──▶ 'button'   → ButtonRenderer│
│       ├──▶ 'list'     → ListRenderer  │
│       ├──▶ 'alert'    → AlertRenderer │
│       ├──▶ 'stats'    → StatsRenderer │
│       ├──▶ 'profile'  → ProfileRender │
│       └──▶ 'buttonGroup' → ...        │
│                                         │
│  render(spec) → VNode                  │
│       │                                 │
│       └──▶ Recursive child rendering   │
│                                         │
└─────────────────────────────────────────┘
```

#### 3. Renderer

```
┌─────────────────────────────────────────┐
│              Renderer                     │
├─────────────────────────────────────────┤
│                                         │
│  createDom(vnode) → DOM                │
│       │                                 │
│       ├──▶ Text Node                   │
│       ├──▶ Element                     │
│       ├──▶ Component ──▶ createDom()    │
│       └──▶ Fragment                    │
│                                         │
│  patch(parent, newVNode, oldVNode)   │
│       │                                 │
│       ├──▶ updateProps                │
│       ├──▶ updateChildren            │
│       │     ├──▶ diffChildrenKeyed()  │
│       │     └──▶ diffChildren()       │
│       └──▶ applyPatches()             │
│                                         │
│  hydrate(dom, vnode)                  │
│       │                                 │
│       └──▶ SSR DOM reuse              │
│                                         │
└─────────────────────────────────────────┘
```

#### 4. Signal (Reactivity)

```
┌─────────────────────────────────────────┐
│            Signal (Reactive)              │
├─────────────────────────────────────────┤
│                                         │
│  createSignal(initial)                  │
│       │                                 │
│       └──▶ [getter, setter]            │
│                                         │
│  Signal.get()                          │
│       │                                 │
│       └──▶ Collect current subscriber  │
│                                         │
│  Signal.set(newValue)                 │
│       │                                 │
│       └──▶ Notify all subscribers     │
│             └──▶ batch() updates       │
│                                         │
│  createEffect(fn)                     │
│       │                                 │
│       └──▶ Auto-tracks dependencies   │
│             └──▶ WeakMap prevents leaks│
│                                         │
└─────────────────────────────────────────┘
```

#### 5. Diff Algorithm

```
┌─────────────────────────────────────────┐
│         O(n) Keyed Diff                │
├─────────────────────────────────────────┤
│                                         │
│  diffChildrenKeyed(new, old)           │
│       │                                 │
│       ├──▶ Build Map by key            │
│       │     ├──▶ newKeyed: Map        │
│       │     └──▶ oldKeyed: Map        │
│       │                                 │
│       ├──▶ First pass: sequential scan │
│       │     ├──▶ New → INSERT        │
│       │     ├──▶ Match → recursive    │
│       │     └──▶ Out-of-order → MOVE │
│       │                                 │
│       └──▶ Second pass: deletion check │
│             └──▶ Remaining old → REMOVE│
│                                         │
│  PatchType: REPLACE | REMOVE | INSERT  │
│              UPDATE | MOVE | TEXT       │
│                                         │
└─────────────────────────────────────────┘
```

#### 6. VNode Structure

```
┌─────────────────────────────────────────┐
│              VNode                       │
├─────────────────────────────────────────┤
│                                         │
│  interface VNode {                     │
│    type: string | Component           │
│    props: VNodeProps                  │
│    children: (VNode | string)[]       │
│    key?: string | number               │
│    flags: VNodeFlags                   │
│    patchFlag?: PatchFlags  // Optimized│
│  }                                     │
│                                         │
│  enum VNodeFlags {                    │
│    Element = 1,                       │
│    Text = 2,                          │
│    Component = 4,                      │
│    Fragment = 8                       │
│  }                                     │
│                                         │
│  enum PatchFlags {                    │
│    TEXT = 1,    // Text only          │
│    CLASS = 2,   // Class only         │
│    STYLE = 4,   // Style only         │
│    PROPS = 8,   // Other props        │
│    FULL = 16    // Full diff          │
│  }                                     │
│                                         │
└─────────────────────────────────────────┘
```

---

## AI Native Features

### 1. Spec-Driven Rendering

AI returns standardized JSON, automatically mapped to components:

```json
{
  "type": "form",
  "children": [
    { "type": "input", "label": "Username", "placeholder": "Enter username" },
    { "type": "input", "type": "password", "label": "Password" },
    { "type": "button", "label": "Login", "variant": "primary" }
  ]
}
```

Rendered:

```
┌─────────────────────────────────┐
│  ┌───────────────────────────┐  │
│  │ Username                  │  │
│  │ [________________]        │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ Password                  │  │
│  │ [________________]        │  │
│  └───────────────────────────┘  │
│        [Login]                   │
└─────────────────────────────────┘
```

### 2. Streaming Render

Real-time display of AI generation progress:

```javascript
const stream = createAIStream(config);

// State
interface AIStreamState {
  isGenerating: boolean;
  progress: number;       // 0-100
  currentSpec: Spec;
  history: Spec[];
  error: string | null;
}

// Listen
stream.onUpdate(state => {
  progressBar.value = state.progress;
  if (state.currentSpec) {
    render(state.currentSpec); // Incremental render
  }
});

// Generate
for await (const state of stream.generate('Create a dashboard')) {
  // See AI generating UI in real-time
}
```

### 3. Intent Routing

AI UI interactions automatically trigger AI understanding:

```javascript
const router = createIntentRouter();

// Register Intent handler
router.register('onSubmit', async (data) => {
  return await ai.understand('form_submit', data);
});

router.register('onClick', async ({ id, action }) => {
  return await ai.understand('click', { id, action });
});

// Use
const spec = await ai.generate('Create a page with form');
render(spec);

// After, AI-generated UI automatically connects to router
document.querySelector('button').onclick = () => {
  router.handle('onClick', { id: 'submit-btn', action: 'login' });
};
```

### 4. Hot Update

```javascript
const app = new AIRender({ container: '#app', initialSpec });

// Full update
app.update(newSpecs);

// Or get current Spec and modify
const current = app.getSpec();
app.update(modifiedSpec);
```

### 5. Custom Components

```javascript
// Register custom component
app.register('myComponent', (spec, render) => {
  return h('div', { class: 'my-component' },
    h('span', null, spec.text),
    ...spec.children.map(c => render(c))
  );
});

// AI can now use this component
const spec = {
  type: 'myComponent',
  text: 'Hello',
  children: [...]
};
```

---

## Security Best Practices

### Problem: Exposing API Keys in Frontend is Insecure

```
❌ WRONG:
  Frontend directly calls AI API, API Key exposed in browser
  ↓
  Anyone can see API Key via F12 DevTools
  ↓
  Your API quota gets abused
```

### Correct Architecture: Backend Proxy

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │     │   Backend   │     │   AI API    │
│  (AIRender) │     │  (API Proxy)│     │   (LLM)     │
│             │     │             │     │             │
│ API Key: ✗ │     │ API Key: ✓  │     │             │
│  Render Only│◀───▶│  Safe Forward│───▶│ AI Returns │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Implementation Options

#### 1. Backend Proxy (Recommended)

```javascript
// Backend - Secure AI request forwarding
app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;

  // API Key used only on server
  const response = await callAI('openai', {
    apiKey: process.env.OPENAI_API_KEY
  }, prompt);

  res.json({ spec: parseAIResponse(response.content) });
});
```

#### 2. Vite Dev Proxy

```javascript
// vite.config.js
export default {
  server: {
    proxy: {
      '/api/ai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai/, '/v1/chat/completions'),
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    }
  }
};
```

#### 3. Environment Variables

```bash
# .env (never commit to Git)
OPENAI_API_KEY=sk-xxx
MINIMAX_API_KEY=xxx
```

```javascript
// Usage
const response = await fetch('/api/ai', {
  headers: {
    'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`
  }
});
```

### Best Practices

| Practice | Description |
|----------|-------------|
| Backend API Keys | Never put API keys in frontend code |
| Limit Permissions | Only grant needed API permissions |
| Rate Limiting | Prevent abuse |
| Use Proxy | Hide real AI API endpoint |
| Monitor Anomalies | Alert on unusual usage patterns |

---

## API Reference

### AI Native Core

#### AIRender

```typescript
// Create instance
const app = new AIRender({
  container: '#app',
  initialSpec: specs  // optional
});

// Render Spec
app.render(specs);
app.update(specs);  // Hot update

// Register custom component
app.register('myComponent', (spec, render) => VNode);

// Get current Spec
app.getSpec();

// Destroy
app.destroy();
```

#### createAIGen

```typescript
// Create AI generator (requires backend proxy for CORS)
const gen = createAIGen({
  container: '#app',
  apiKey: 'your-key',
  provider: 'minimax',
  model: 'M2-her'
});

// Generate
await gen.generate('Create a login form');
```

#### createAIStream

```typescript
// Create streaming generator
const stream = createAIStream({
  apiKey: 'your-key',
  apiUrl: '...',
  model: '...'
});

// Listen to state
stream.onUpdate(state => {
  console.log(state.progress, state.currentSpec);
});

// Streaming generate
for await (const state of stream.generate('Create dashboard')) {
  render(state.currentSpec);
});

// Non-streaming
const spec = await stream.generateOnce('Create form');

// State management
stream.getState();       // Current state
stream.getHistory();     // History
stream.clearHistory();   // Clear
```

#### IntentRouter

```typescript
const router = createIntentRouter();

// Register
router.register('onSubmit', async (data) => {
  return await ai.understand('submit', data);
});

// Handle
const result = await router.handle('onSubmit', formData);

// Query
router.getIntents();  // ['onSubmit', ...]
```

#### registry

```typescript
// Render directly
const vnode = registry.render(spec);

// Register component
registry.register('myComponent', (spec, render) => VNode);

// Get
const renderer = registry.get('button');
```

### Reactivity

#### createSignal

```typescript
const [count, setCount] = createSignal(0);
count();        // Read
setCount(1);   // Write
setCount(c => c + 1);  // Update
```

#### reactive

```typescript
const state = reactive({
  name: 'AI',
  items: []
});

state.name;           // Auto-tracked
state.items.push(1);  // Deep reactive
```

#### computed

```typescript
const doubled = computed(() => count() * 2);
```

#### watch / watchEffect

```typescript
watch(() => count(), (newVal, oldVal) => {
  console.log(`${oldVal} → ${newVal}`);
});

watchEffect(() => {
  console.log('Count changed:', count());
});
```

### Components

#### memo / useMemo / useCallback

```typescript
const Memoized = memo(Component, (prev, next) => {
  return prev.id === next.id;  // Custom comparison
});

const value = useMemo(() => expensive(), [dep]);
const fn = useCallback(() => doSomething(a), [a]);
```

#### ref / useRef

```typescript
const ref = useRef<HTMLInputElement>();
ref.current.focus();
```

#### forwardRef

```typescript
const ForwardedInput = forwardRef((props, ref) => {
  return h('input', { ref });
});
```

### Lifecycle

```typescript
onMounted(() => { /* DOM mounted */ });
onUpdated(() => { /* DOM updated */ });
onUnmounted(() => { /* DOM will unmount */ });
onBeforeMount(() => { /* Before mount */ });
onBeforeUpdate(() => { /* Before update */ });
onBeforeUnmount(() => { /* Before unmount */ });
```

### Context

```typescript
const ThemeContext = createContext('light');

function ThemedButton() {
  const theme = useContext(ThemeContext);
  return h('button', { class: theme }, 'Click');
}

// Provide
provide(ThemeContext, 'dark');

// Inject
const theme = inject(ThemeContext);
```

---

## Core Concepts

### Spec

AI-generated standardized UI description:

```typescript
interface Spec {
  type: string;           // Component type
  [key: string]: any;    // Component properties
}
```

### VNode

Virtual node, pure data structure describing UI:

```typescript
interface VNode {
  type: string | Component;
  props: Record<string, any>;
  children: (VNode | string)[];
  key?: string | number;
  flags: VNodeFlags;
}
```

### Signal

Reactive data container, notifies subscribers on value change:

```typescript
const [value, setValue] = createSignal(initial);
// or
const signal = new Signal(initial);
signal.get();   // Read
signal.set(1);  // Write
```

### Registry

Component registry, maps Spec type to render function:

```typescript
registry.register('card', (spec, render) => {
  return h('div', { class: 'card' },
    spec.children?.map(c => render(c))
  );
});
```

---

## Browser Support

Modern browsers (ES2020+)

## Install

```bash
npm install
npm run build
```

## License

MIT

## Contributing

Issues and Pull Requests are welcome!
