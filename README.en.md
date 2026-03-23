# AI Render Runtime

> Next-generation AI Native Rendering Engine - AI is the core, frontend is the output

[English](./README.en.md) | [中文](./README.md)

## Table of Contents

- [Core Value](#core-value)
- [Why AI Render](#why-ai-render)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [AI Native Features](#ai-native-features)
- [API Reference](#api-reference)
- [Security Best Practices](#security-best-practices)

---

## Core Value

**AI Native** - Redefining the frontend paradigm:

```
Traditional: Frontend leads, AI is a tool
     React/Vue ← call AI → AI outputs content

AI Native: AI is the core, frontend is output
     AI Runtime → Spec Contract → Multi-platform rendering
```

### Difference from React/Vue

| Feature | React/Vue | AI Render |
|---------|-----------|-----------|
| Core Driver | Developer code | AI intent understanding |
| UI Source | JSX/Template | AI dynamically generated |
| State Management | Manual setState | AI decisions + state snapshots |
| Interaction Handling | Event listeners | Intent Engine |
| Hot Update | Manual handling | Built-in `air.update()` |
| State History | External implementation | Built-in Memento |

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

**Pain Point**: Every AI response requires developer intervention.

### Using AI Render

```
1. AI understands user intent
2. AI generates Spec contract
3. AIRender renders directly
4. User sees result
```

**Advantages**:
- Zero manual conversion
- AI-driven dynamic interfaces
- Built-in state history (time travel)
- Streaming generation support

---

## Quick Start

### Install

```bash
npm install
npm run build
```

### Method 1: AI-Driven Rendering (Core Use Case)

**Key**: AI calls should be on backend, frontend only renders.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │     │   Backend   │     │   AI API    │
│  (AIRender) │◀───│  (API Proxy)│───▶│   (LLM)     │
└─────────────┘     └─────────────┘     └─────────────┘
    Render            Safe Forward       Generate UI Spec
```

```javascript
import { AIRender } from 'ai-render-runtime';

const app = new AIRender({
  container: '#app',
  initialSpec: null
});

const { spec } = await fetch('/api/generate-ui', {
  method: 'POST',
  body: JSON.stringify({ prompt: 'Create a dashboard' })
});
app.update(spec);
```

### Method 2: Intent-Driven Interaction

**Key**: User interaction triggers Intent, AI understands and generates new Spec:

```
User Click → Intent Engine → AI Understands → Spec Generated → Hot Update UI
```

```javascript
import { AIRender, IntentEngine } from 'ai-render-runtime';

const app = new AIRender({ container: '#app' });
const intentEngine = new IntentEngine();

intentEngine.register('show_dashboard', async (intent, context) => {
  const response = await fetch('/api/ai', {
    method: 'POST',
    body: JSON.stringify({ intent: intent.type, entities: intent.entities })
  });
  return { spec: await response.json() };
});

app.processIntent({
  type: 'show_dashboard',
  confidence: 1.0,
  entities: { view: 'dashboard' }
});
```

---

## Architecture

### Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Deployment Targets                         │
├─────────────┬──────────────────┬─────────────────────────────┤
│  SDK/npm    │   Standalone     │      WASM                  │
│  (Embed)    │   (Process)      │   (Browser/Offline)        │
└─────────────┴──────────────────┴─────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 Platform Abstraction Layer                   │
│      Window | Filesystem | Network | Input Abstraction       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Rendering Runtime (TS / Rust)                   │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│   │ Browser     │  │ Desktop     │  │ Mobile      │       │
│   │ (Canvas/DOM)│  │ (Tauri/Native)│ │ (Future)   │       │
│   └─────────────┘  └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Spec Contract (JSON)                     │
│         Versioned • Transportable • Storable • Replayable   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│               AI Native Core Runtime (Rust/TS)               │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐             │
│  │  Intent   │  │   Spec    │  │  Action   │             │
│  │  Engine   │──▶│ Generator │──▶│  Engine   │             │
│  └───────────┘  └───────────┘  └───────────┘             │
│        │                │                │                  │
│        ▼                ▼                ▼                  │
│  ┌─────────────────────────────────────────────┐          │
│  │           State Store (Memento Pattern)       │          │
│  │     Snapshot • Restore • Replay              │          │
│  └─────────────────────────────────────────────┘          │
│                          │                                 │
│                          ▼                                 │
│  ┌─────────────────────────────────────────────┐          │
│  │     Render Orchestrator (Dual Path)          │          │
│  │   Standard: Spec → UI                       │          │
│  │   Fast: Intent → Direct Render               │          │
│  └─────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

### Core Modules

#### 1. Spec Contract

```typescript
interface Spec {
  version: string;
  intent: string;
  view: ViewSpec;
  actions: ActionSpec[];
  state: Record<string, any>;
  meta: {
    createdAt: string;
    confidence: number;
    streaming: boolean;
  };
}
```

#### 2. Intent Engine

```typescript
intentEngine.register('show_dashboard', async (intent, context) => {
  return { spec: await ai.understand(intent) };
});

const result = await intentEngine.process(intent, context);
```

#### 3. State Store (Memento Pattern)

```typescript
const snapshotId = app.saveSnapshot('before_action');
app.restore(snapshotId);
app.undo();
app.onStateChange((spec) => { console.log('State changed'); });
const history = app.getHistory();
```

#### 4. Render Orchestrator

```
Path 1: Standard (complex UI, cross-platform)
  Intent → Spec → Rendering Runtime → UI

Path 2: Fast (real-time interaction, streaming)
  Intent → Render Orchestrator → UI
```

---

## AI Native Features

### 1. Intent-Driven UI

AI understands user intent and dynamically generates interfaces:

```javascript
app.processIntent({
  type: 'show_dashboard',
  confidence: 0.95,
  entities: { metric: 'sales', period: 'monthly' }
});
```

### 2. State History & Time Travel

Memento Pattern supports complete operation history:

```javascript
app.saveSnapshot();
const history = app.getHistory();
app.restore(history[0].id);
app.undo();
```

### 3. Streaming Rendering

Real-time display of AI generation process:

```javascript
const stream = createAIStream(config);
stream.onUpdate(state => {
  progressBar.value = state.progress;
  app.update(state.currentSpec);
});
```

### 4. Action Execution & Chained Intents

```javascript
await app.executeAction({
  id: 'navigate_settings',
  type: 'navigation',
  nextIntent: 'show_settings'
});
```

---

## API Reference

### AIRender

```typescript
const app = new AIRender({
  container: '#app',
  initialSpec: specs,
  enableHistory: true
});

app.render(spec);
app.update(spec);
app.processIntent(intent);
app.executeAction(action);
app.saveSnapshot(label?);
app.restore(snapshotId);
app.undo();
app.getHistory();
app.onStateChange(callback);
app.getSpec();
app.destroy();
```

### IntentEngine

```typescript
const engine = new IntentEngine();
engine.register('show_dashboard', async (intent, context) => ({ spec }));
engine.setDefaultHandler(async (intent, context) => ({ spec: await ai.understand(intent) }));
const result = await engine.process(intent, context);
engine.getRegisteredIntents();
```

### StateStore

```typescript
const store = new StateStore(maxHistory = 50);
store.getState();
store.setState(spec);
store.saveSnapshot(label?);
store.restore(snapshotId);
store.getSnapshot(id);
store.getHistory();
store.undo();
store.subscribe(callback);
store.clear();
```

### RenderOrchestrator

```typescript
const orch = new RenderOrchestrator(renderer);
orch.setMode('standard' | 'fast');
orch.renderSpec(spec);
orch.patch({ type: 'style', path: ['color'], value: 'red' });
orch.stream({ view: { type: 'partial' } });
orch.useStandardPath(spec);
```

---

## Security Best Practices

### Correct Architecture: Backend Proxy

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │     │   Backend   │     │   AI API    │
│  (AIRender) │◀───│  (API Proxy)│───▶│   (LLM)     │
│             │     │             │     │             │
│ API Key: ✗ │     │ API Key: ✓  │     │ AI Returns  │
└─────────────┘     └─────────────┘     └─────────────┘
```

| Practice | Description |
|----------|-------------|
| API Key on Backend | Never put Key in frontend code |
| Limit Key Permissions | Only give needed API permissions |
| Rate Limiting | Prevent abuse |
| Use Proxy | Hide real AI API address |

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
