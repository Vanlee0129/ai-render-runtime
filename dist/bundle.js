// src/signal.ts
var Signal = class _Signal {
  constructor(initialValue) {
    this.subscribers = /* @__PURE__ */ new Set();
    this.effects = /* @__PURE__ */ new Set();
    this.value = initialValue;
  }
  // 获取值
  get() {
    if (currentTracking) {
      this.subscribers.add(currentTracking);
    }
    return this.value;
  }
  // 设置值
  set(newValue) {
    const value = typeof newValue === "function" ? newValue(this.value) : newValue;
    if (value !== this.value) {
      this.value = value;
      this.notify();
    }
  }
  // 更新值
  update(fn) {
    this.set(fn(this.value));
  }
  // 通知所有订阅者
  notify() {
    batch(() => {
      this.subscribers.forEach((fn) => fn());
      this.effects.forEach((fn) => fn());
    });
  }
  // 订阅变化
  subscribe(fn) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }
  // 添加副作用
  addEffect(fn) {
    this.effects.add(fn);
    return () => this.effects.delete(fn);
  }
  // 创建计算属性
  computed(fn) {
    const signal = new _Signal(fn());
    this.subscribe(() => {
      signal.set(fn());
    });
    return signal;
  }
};
var currentTracking = null;
function track(fn) {
  const prev = currentTracking;
  currentTracking = null;
  try {
    return fn();
  } finally {
    currentTracking = prev;
  }
}
function createEffect(fn) {
  const effect = () => {
    const prev = currentTracking;
    currentTracking = effect;
    try {
      fn();
    } finally {
      currentTracking = prev;
    }
  };
  const subscribedSignals = /* @__PURE__ */ new Set();
  const trackedEffect = () => {
    const prev = currentTracking;
    currentTracking = effect;
    subscribedSignals.clear();
    const origSubscribe = Signal.prototype.subscribe;
    Signal.prototype.subscribe = function(fn2) {
      subscribedSignals.add(this);
      return origSubscribe.call(this, fn2);
    };
    try {
      fn();
    } finally {
      currentTracking = prev;
      Signal.prototype.subscribe = origSubscribe;
    }
  };
  trackedEffect();
  return () => {
    subscribedSignals.forEach((signal) => {
      signal.subscribers.delete(effect);
    });
    subscribedSignals.clear();
  };
}
var batchQueue = /* @__PURE__ */ new Set();
var isBatching = false;
function batch(fn) {
  if (isBatching) {
    fn();
  } else {
    isBatching = true;
    try {
      fn();
    } finally {
      isBatching = false;
      flush();
    }
  }
}
function flush() {
  batchQueue.forEach((fn) => fn());
  batchQueue.clear();
}
function createSignal(initialValue) {
  const signal = new Signal(initialValue);
  return [signal.get.bind(signal), signal.set.bind(signal)];
}
function createArraySignal(initialValue) {
  const signal = new Signal(initialValue);
  return {
    signal,
    push: (item) => {
      signal.update((arr) => [...arr, item]);
    },
    pop: () => {
      let result;
      signal.update((arr) => {
        result = arr[arr.length - 1];
        return arr.slice(0, -1);
      });
      return result;
    },
    splice: (index, deleteCount, ...items) => {
      let result = [];
      signal.update((arr) => {
        result = arr.splice(index, deleteCount, ...items);
        return [...arr];
      });
      return result;
    },
    update: (index, item) => {
      signal.update((arr) => {
        const newArr = [...arr];
        newArr[index] = item;
        return newArr;
      });
    },
    remove: (index) => {
      let result;
      signal.update((arr) => {
        result = arr[index];
        return arr.filter((_, i) => i !== index);
      });
      return result;
    }
  };
}

// src/vdom.ts
function h(tag, props = {}, ...children) {
  return {
    type: tag,
    props,
    children: children.flat(),
    key: props.key,
    flags: 1 /* Element */
  };
}
function t(text) {
  return {
    type: "text",
    props: {},
    children: [text],
    flags: 2 /* Text */
  };
}
function createFragment(props) {
  const children = Array.isArray(props.children) ? props.children.flat() : props.children ? [props.children] : [];
  return {
    type: "fragment",
    props: {},
    children,
    flags: 8 /* Fragment */
  };
}
var Fragment = createFragment;
function isSameVNodeType(a, b) {
  return a.type === b.type && a.key === b.key;
}
function createComponent(component, props) {
  return {
    type: component,
    props,
    children: [],
    flags: 4 /* Component */
  };
}

// src/diff.ts
var PatchType = /* @__PURE__ */ ((PatchType2) => {
  PatchType2["REPLACE"] = "REPLACE";
  PatchType2["REMOVE"] = "REMOVE";
  PatchType2["INSERT"] = "INSERT";
  PatchType2["UPDATE"] = "UPDATE";
  PatchType2["TEXT"] = "TEXT";
  PatchType2["MOVE"] = "MOVE";
  return PatchType2;
})(PatchType || {});
function diff(newVNode, oldVNode, parent) {
  const patches = [];
  if (newVNode === null) {
    if (oldVNode !== null) {
      patches.push({
        type: "REMOVE" /* REMOVE */,
        node: null,
        oldNode: oldVNode
      });
    }
    return patches;
  }
  if (oldVNode === null) {
    patches.push({
      type: "INSERT" /* INSERT */,
      node: null,
      newNode: newVNode
    });
    return patches;
  }
  if (newVNode.flags === 2 /* Text */ || oldVNode.flags === 2 /* Text */) {
    if (typeof newVNode.type === "string" && newVNode.type === "text") {
      const newText = newVNode.children[0];
      const oldText = oldVNode.children[0];
      if (newText !== oldText) {
        patches.push({
          type: "TEXT" /* TEXT */,
          node: null,
          props: { text: newText }
        });
      }
    } else if (isSameVNodeType(newVNode, oldVNode)) {
      diffElement(newVNode, oldVNode, patches);
    } else {
      patches.push({
        type: "REPLACE" /* REPLACE */,
        node: null,
        newNode: newVNode,
        oldNode: oldVNode
      });
    }
    return patches;
  }
  if (!isSameVNodeType(newVNode, oldVNode)) {
    patches.push({
      type: "REPLACE" /* REPLACE */,
      node: null,
      newNode: newVNode,
      oldNode: oldVNode
    });
    return patches;
  }
  diffElement(newVNode, oldVNode, patches);
  return patches;
}
function diffElement(newVNode, oldVNode, patches) {
  const propsPatch = diffProps(newVNode.props, oldVNode.props);
  if (propsPatch) {
    patches.push({
      type: "UPDATE" /* UPDATE */,
      node: null,
      props: propsPatch
    });
  }
  diffChildren(newVNode.children, oldVNode.children, patches);
}
function diffProps(newProps, oldProps) {
  const patches = {};
  let hasChanges = false;
  for (const key in newProps) {
    if (key === "children" || key === "key") continue;
    const newValue = newProps[key];
    const oldValue = oldProps[key];
    if (newValue !== oldValue) {
      patches[key] = newValue;
      hasChanges = true;
    }
  }
  for (const key in oldProps) {
    if (key === "children" || key === "key") continue;
    if (!(key in newProps)) {
      patches[key] = null;
      hasChanges = true;
    }
  }
  return hasChanges ? patches : null;
}
function diffChildren(newChildren, oldChildren, patches) {
  const newList = newChildren.map((child, i) => ({
    vnode: typeof child === "string" ? { type: "text", props: {}, children: [child], flags: 2 /* Text */, key: `text-${i}` } : child,
    index: i
  }));
  const oldList = oldChildren.map((child, i) => ({
    vnode: typeof child === "string" ? { type: "text", props: {}, children: [child], flags: 2 /* Text */, key: `text-${i}` } : child,
    index: i
  }));
  const oldKeys = /* @__PURE__ */ new Map();
  oldList.forEach((item) => {
    const key = item.vnode.key || item.index;
    oldKeys.set(key, item);
  });
  const newKeys = /* @__PURE__ */ new Map();
  newList.forEach((item) => {
    const key = item.vnode.key || item.index;
    newKeys.set(key, item);
  });
  newList.forEach((newItem, i) => {
    const key = newItem.vnode.key || i;
    const oldItem = oldKeys.get(key);
    if (!oldItem) {
      patches.push({
        type: "INSERT" /* INSERT */,
        node: null,
        newNode: newItem.vnode,
        index: i
      });
    } else {
      const childPatches = diff(newItem.vnode, oldItem.vnode, null);
      childPatches.forEach((p) => {
        p.index = i;
        patches.push(p);
      });
    }
  });
  oldList.forEach((oldItem, i) => {
    const key = oldItem.vnode.key || i;
    if (!newKeys.has(key)) {
      patches.push({
        type: "REMOVE" /* REMOVE */,
        node: null,
        oldNode: oldItem.vnode,
        index: i
      });
    }
  });
}
function reconcile(newVNode, domNode) {
  return domNode;
}
function batchDiff(newSpec, oldSpec) {
  const added = [];
  const removed = [];
  const updated = [];
  const newKeys = new Set(newSpec.map((s, i) => s.key || s.id || i));
  const oldKeys = new Set(oldSpec.map((s, i) => s.key || s.id || i));
  newSpec.forEach((s) => {
    const key = s.key || s.id;
    if (!oldKeys.has(key)) {
      added.push(s);
    }
  });
  oldSpec.forEach((s) => {
    const key = s.key || s.id;
    if (!newKeys.has(key)) {
      removed.push(s);
    }
  });
  newSpec.forEach((newS, i) => {
    const key = newS.key || newS.id || i;
    const oldS = oldSpec.find((s, j) => (s.key || s.id || j) === key);
    if (oldS) {
      if (JSON.stringify(newS) !== JSON.stringify(oldS)) {
        updated.push({ new: newS, old: oldS });
      }
    }
  });
  return { added, removed, updated };
}
function diffChildrenKeyed(newChildren, oldChildren) {
  const patches = [];
  const newKeyed = /* @__PURE__ */ new Map();
  const oldKeyed = /* @__PURE__ */ new Map();
  newChildren.forEach((child, i) => {
    const vnode = typeof child === "string" ? { type: "text", props: {}, children: [child], flags: 2 /* Text */, key: `text-${i}` } : child;
    const key = vnode.key ?? i;
    newKeyed.set(key, { vnode, index: i });
  });
  oldChildren.forEach((child, i) => {
    const vnode = typeof child === "string" ? { type: "text", props: {}, children: [child], flags: 2 /* Text */, key: `text-${i}` } : child;
    const key = vnode.key ?? i;
    oldKeyed.set(key, { vnode, index: i });
  });
  const newKeys = Array.from(newKeyed.keys());
  const oldKeys = Array.from(oldKeyed.keys());
  let oldIndex = 0;
  let newIndex = 0;
  while (newIndex < newKeys.length) {
    const newKey = newKeys[newIndex];
    const oldKey = oldKeys[oldIndex];
    if (newKey === oldKey) {
      const newItem = newKeyed.get(newKey);
      const oldItem = oldKeyed.get(oldKey);
      const childPatches = diff(newItem.vnode, oldItem.vnode, null);
      childPatches.forEach((p) => {
        p.index = newIndex;
        patches.push(p);
      });
      newIndex++;
      oldIndex++;
    } else if (oldKeyed.has(newKey)) {
      const oldItem = oldKeyed.get(newKey);
      patches.push({
        type: "MOVE" /* MOVE */,
        node: null,
        newNode: newKeyed.get(newKey).vnode,
        oldNode: oldItem.vnode,
        index: newIndex
      });
      newIndex++;
    } else {
      patches.push({
        type: "INSERT" /* INSERT */,
        node: null,
        newNode: newKeyed.get(newKey).vnode,
        index: newIndex
      });
      newIndex++;
    }
  }
  while (oldIndex < oldKeys.length) {
    const oldKey = oldKeys[oldIndex];
    if (!newKeyed.has(oldKey)) {
      patches.push({
        type: "REMOVE" /* REMOVE */,
        node: null,
        oldNode: oldKeyed.get(oldKey).vnode,
        index: oldIndex
      });
    }
    oldIndex++;
  }
  return patches;
}

// src/jsx.ts
function jsx(type, props, key) {
  const { children, ...rest } = props;
  const vnode = h(
    type,
    key !== void 0 ? { ...rest, key } : rest,
    ...Array.isArray(children) ? children.flat() : children ? [children] : []
  );
  return vnode;
}

// src/registry.ts
var ComponentRegistry = class {
  constructor() {
    this.renderers = /* @__PURE__ */ new Map();
    this.registerDefaultRenderers();
  }
  // 安全获取数组
  safeArray(val) {
    if (Array.isArray(val)) return val;
    if (val && typeof val === "object") return Object.values(val);
    return [];
  }
  registerDefaultRenderers() {
    this.register("card", (s, render2) => {
      const kids = [];
      if (s.title) kids.push(h("h3", { class: "gen-title" }, s.title));
      if (s.subtitle) kids.push(h("p", { class: "gen-subtitle" }, s.subtitle));
      if (s.description) kids.push(h("p", { style: "margin-top:8px" }, s.description));
      if (s.children) {
        const children = this.safeArray(s.children);
        children.forEach((c) => kids.push(render2(c)));
      }
      if (s.buttons && Array.isArray(s.buttons)) {
        const btnKids = [];
        s.buttons.forEach((btn) => btnKids.push(render2(btn)));
        kids.push(h("div", { style: "margin-top:16px;display:flex;gap:12px" }, ...btnKids));
      }
      let cls = "gen-card";
      if (s.cardStyle === "flat") cls += " gen-card-flat";
      else if (s.cardStyle === "border") cls += " gen-card-border";
      else if (s.cardStyle === "glass") cls += " gen-card-glass";
      return h("div", { class: cls }, ...kids);
    });
    this.register("form", (s, render2) => {
      const kids = [];
      if (s.title) kids.push(h("h3", { class: "gen-title" }, s.title));
      if (s.subtitle) kids.push(h("p", { class: "gen-subtitle" }, s.subtitle));
      if (s.fields && Array.isArray(s.fields)) {
        s.fields.forEach((f) => kids.push(render2(f)));
      }
      if (s.buttons && Array.isArray(s.buttons)) {
        const btnKids = [];
        s.buttons.forEach((btn) => btnKids.push(render2(btn)));
        kids.push(h("div", { style: "margin-top:16px;display:flex;gap:12px" }, ...btnKids));
      }
      return h("div", { class: "gen-card" }, ...kids);
    });
    this.register("input", (s) => {
      const kids = [];
      if (s.label) kids.push(h("label", { class: "gen-label" }, s.label));
      kids.push(h("input", {
        class: "gen-input",
        type: s.type_attr || s.type || "text",
        placeholder: s.placeholder || "",
        name: s.name || ""
      }));
      return h("div", { style: "margin-bottom:12px" }, ...kids);
    });
    this.register("button", (s) => {
      const kids = [];
      if (s.icon) kids.push(h("span", { style: "margin-right:6px" }, s.icon));
      if (s.label) kids.push(s.label);
      const cls = ["gen-btn", `gen-btn-${s.variant || "primary"}`];
      if (s.size && s.size !== "md") cls.push(`gen-btn-${s.size}`);
      if (s.shape) cls.push(`gen-btn-${s.shape}`);
      return h("button", { class: cls.join(" "), disabled: s.disabled }, ...kids);
    });
    this.register("list", (s, render2) => {
      const kids = [];
      if (s.title) kids.push(h("h3", { class: "gen-title" }, s.title));
      if (s.items && Array.isArray(s.items) && s.items.length) {
        const tag = s.ordered ? "ol" : "ul";
        const items = s.items.map((item, i) => {
          const liKids = [];
          if (s.numbered) liKids.push(h("span", { class: "gen-list-number" }, String(i + 1)));
          else if (item.icon || s.icon) liKids.push(h("span", { class: "gen-list-icon" }, item.icon || s.icon));
          const content = h("div", { class: "gen-list-content" });
          content.children.push(h("span", { class: "gen-list-text" }, item.text || item.label || ""));
          if (item.subtext) content.children.push(h("p", { class: "gen-list-subtext" }, item.subtext));
          liKids.push(content);
          if (item.badge) liKids.push(h("span", { class: "gen-list-badge" }, item.badge));
          return h("li", { class: "gen-list-item" }, ...liKids);
        });
        kids.push(h(tag, { class: "gen-list" }, ...items));
      } else if (s.emptyText) {
        kids.push(h("p", { style: "text-align:center;color:rgba(255,255,255,0.4)" }, s.emptyText));
      }
      if (s.buttons && Array.isArray(s.buttons)) {
        const btnKids = [];
        s.buttons.forEach((btn) => btnKids.push(render2(btn)));
        kids.push(h("div", { style: "margin-top:16px;display:flex;gap:12px" }, ...btnKids));
      }
      return h("div", { class: "gen-card" }, ...kids);
    });
    this.register("alert", (s) => {
      const type = s.alertType || s.type || "info";
      const icons = { info: "\u2139\uFE0F", success: "\u2705", warning: "\u26A0\uFE0F", danger: "\u274C", error: "\u274C" };
      const kids = [h("span", { class: "gen-alert-icon" }, s.icon || icons[type] || icons.info)];
      const content = h("div", { class: "gen-alert-content" });
      if (s.title) content.children.push(h("h4", { class: "gen-alert-title" }, s.title));
      content.children.push(h("p", { class: "gen-alert-message" }, s.message || ""));
      kids.push(content);
      return h("div", { class: `gen-alert gen-alert-${type}` }, ...kids);
    });
    this.register("stats", (s) => {
      const items = this.safeArray(s.items);
      if (items.length === 0) return h("div", { class: "gen-grid gen-grid-3" });
      const columns = s.columns || 3;
      const cards = items.map((item) => {
        const kids = [];
        const valueEl = h("div", { style: "font-size:28px;font-weight:700;background:linear-gradient(135deg,#a78bfa,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent" });
        if (item.icon) valueEl.children.push(item.icon, " ");
        valueEl.children.push(String(item.value || 0));
        kids.push(valueEl);
        kids.push(h("div", { class: "gen-stat-label" }, item.label || ""));
        if (item.trend !== void 0) {
          const trendClass = item.trend >= 0 ? "gen-trend-up" : "gen-trend-down";
          const trendIcon = item.trend >= 0 ? "\u2191" : "\u2193";
          kids.push(h("span", { class: `gen-trend ${trendClass}` }, `${trendIcon}${Math.abs(item.trend)}%`));
        }
        return h("div", { class: "gen-stat-card" }, ...kids);
      });
      return h("div", { class: `gen-grid gen-grid-${columns}` }, ...cards);
    });
    this.register("profile", (s, render2) => {
      const kids = [];
      const avatarEl = h("div", { class: "gen-avatar" });
      if (s.avatar?.startsWith("http")) {
        avatarEl.children.push(h("img", { src: s.avatar, alt: s.name || "" }));
      } else {
        avatarEl.children.push(s.avatar || s.name?.charAt(0) || "?");
      }
      kids.push(avatarEl);
      if (s.name) kids.push(h("h3", { class: "gen-profile-name", style: "text-align:center" }, s.name));
      if (s.email) kids.push(h("p", { class: "gen-profile-email", style: "text-align:center" }, s.email));
      if (s.badge) kids.push(h("span", { class: "gen-badge gen-badge-primary", style: "display:block;width:fit-content;margin:12px auto 0" }, s.badge));
      if (s.role) kids.push(h("p", { style: "text-align:center;color:rgba(255,255,255,0.5);margin-top:4px" }, s.role));
      if (s.bio) kids.push(h("p", { class: "gen-profile-bio", style: "text-align:center" }, s.bio));
      if (s.buttons && Array.isArray(s.buttons)) {
        const btnKids = [];
        s.buttons.forEach((btn) => btnKids.push(render2(btn)));
        kids.push(h("div", { style: "margin-top:16px;display:flex;gap:12px;justify-content:center" }, ...btnKids));
      }
      return h("div", { class: "gen-card gen-profile" }, ...kids);
    });
    this.register("buttonGroup", (s, render2) => {
      const kids = [];
      if (s.title) kids.push(h("h3", { class: "gen-title" }, s.title));
      if (s.buttons && Array.isArray(s.buttons)) {
        const btnKids = [];
        s.buttons.forEach((btn) => btnKids.push(render2(btn)));
        kids.push(h("div", { style: "display:flex;gap:12px;flex-wrap:wrap" }, ...btnKids));
      }
      return h("div", { class: "gen-card" }, ...kids);
    });
  }
  register(type, fn) {
    this.renderers.set(type, fn);
  }
  get(type) {
    return this.renderers.get(type);
  }
  render(spec) {
    const self = this;
    const render2 = (s) => {
      if (!s || typeof s !== "object") {
        return h("div", { class: "gen-card" }, h("p", {}, "Invalid spec"));
      }
      const fn = self.renderers.get(s.type);
      if (fn) return fn(s, render2);
      return h("div", { class: "gen-card" }, h("p", {}, `Unknown component: ${s.type}`));
    };
    return render2(spec);
  }
};
var registry = new ComponentRegistry();

// src/scheduler.ts
var ImmediatePriority = 1;
var UserBlockingPriority = 2;
var NormalPriority = 3;
var LowPriority = 4;
var IdlePriority = 5;
var taskQueue = [];
var isFlushScheduled = false;
function flush2() {
  taskQueue.sort((a, b) => a.priority - b.priority);
  while (taskQueue.length > 0) {
    const task = taskQueue.shift();
    if (task) task.callback();
  }
  isFlushScheduled = false;
}
function scheduleCallback(priority, callback) {
  taskQueue.push({ callback, priority });
  if (!isFlushScheduled) {
    isFlushScheduled = true;
    if (priority === ImmediatePriority) {
      flush2();
    } else {
      Promise.resolve().then(flush2);
    }
  }
  return () => {
    taskQueue = taskQueue.filter((t2) => t2.callback !== callback);
  };
}
function runWithPriority(priority, fn) {
  const prevPriority = currentPriority;
  currentPriority = priority;
  try {
    return fn();
  } finally {
    currentPriority = prevPriority;
  }
}
var currentPriority = NormalPriority;
function getCurrentPriority() {
  return currentPriority;
}

// src/renderer.ts
var rootElement = null;
function setRootElement(el) {
  rootElement = el;
  if (rootElement) {
    rootElement.addEventListener("click", handleDelegatedEvent);
    rootElement.addEventListener("input", handleDelegatedEvent);
    rootElement.addEventListener("change", handleDelegatedEvent);
    rootElement.addEventListener("submit", handleDelegatedEvent);
    rootElement.addEventListener("focus", handleDelegatedEvent);
    rootElement.addEventListener("blur", handleDelegatedEvent);
    rootElement.addEventListener("keydown", handleDelegatedEvent);
    rootElement.addEventListener("keyup", handleDelegatedEvent);
    rootElement.addEventListener("mouseenter", handleDelegatedEvent);
    rootElement.addEventListener("mouseleave", handleDelegatedEvent);
  }
}
function handleDelegatedEvent(e) {
  const target = e.target;
  let current = target;
  while (current && current !== rootElement) {
    const handlers = current._eventHandlers;
    if (handlers) {
      const handler = handlers.get(e.type);
      if (handler) {
        e.preventDefault();
        handler.call(current, e);
        return;
      }
    }
    current = current.parentElement;
  }
}
var Renderer = class {
  constructor(container) {
    this.pendingUpdates = [];
    this.isRendering = false;
    this.context = {
      container,
      vnode: null,
      dom: null,
      signals: /* @__PURE__ */ new Map()
    };
    setRootElement(container);
  }
  /**
   * 渲染虚拟节点到 DOM
   */
  render(vnode) {
    this.context.vnode = vnode;
    if (vnode === null) {
      this.unmount();
      return;
    }
    if (this.context.dom === null) {
      const dom = this.createDom(vnode);
      this.context.container.appendChild(dom);
      this.context.dom = dom;
    } else {
      this.patch(this.context.dom, vnode, this.context.vnode);
    }
  }
  /**
   * Hydrate - SSR 场景：复用已有 DOM，绑定事件
   * 增强版：更精确的 DOM 复用和匹配
   */
  hydrate(vnode) {
    this.context.vnode = vnode;
    if (!this.context.container.firstChild) {
      this.render(vnode);
      return;
    }
    this.context.dom = this.context.container.firstChild;
    this.hydrateTree(this.context.dom, vnode);
  }
  /**
   * 递归 hydrate 树
   */
  hydrateTree(dom, vnode) {
    if (!dom || !vnode) return false;
    if (vnode.flags === 2 /* Text */ || vnode.type === "text") {
      if (dom.nodeType === Node.TEXT_NODE) {
        return true;
      }
      return false;
    }
    if (vnode.type === "fragment" || vnode.type === "Fragment") {
      return this.hydrateFragment(dom, vnode);
    }
    if (vnode.flags === 4 /* Component */) {
      return this.hydrateComponent(dom, vnode);
    }
    if (dom.nodeType !== Node.ELEMENT_NODE) return false;
    const el = dom;
    const tagMatch = el.tagName.toLowerCase() === vnode.type.toLowerCase();
    if (!tagMatch) {
      console.warn(`Hydrate tag mismatch: expected ${vnode.type}, got ${el.tagName}`);
      return false;
    }
    this.hydrateElementProps(el, vnode);
    this.hydrateChildren(el, vnode.children);
    return true;
  }
  /**
   * hydrate Fragment
   */
  hydrateFragment(dom, vnode) {
    const children = Array.isArray(vnode.children) ? vnode.children : [vnode.children];
    let childDom = dom.nextSibling;
    for (const child of children) {
      if (!childDom) break;
      if (typeof child === "string") {
        if (childDom.nodeType === Node.TEXT_NODE) {
          childDom = childDom.nextSibling;
          continue;
        }
        break;
      }
      if (this.hydrateTree(childDom, child)) {
        childDom = childDom.nextSibling;
      } else {
        break;
      }
    }
    return true;
  }
  /**
   * hydrate 组件
   */
  hydrateComponent(dom, vnode) {
    const Component3 = vnode.type;
    const props = vnode.props || {};
    try {
      const result = Component3(props);
      if (result === null) return true;
      return this.hydrateTree(dom, result);
    } catch (e) {
      console.error("Component hydrate error:", e);
      return false;
    }
  }
  /**
   * hydrate 元素属性和事件
   */
  hydrateElementProps(el, vnode) {
    if (!vnode.props) return;
    if (!el._eventHandlers) {
      el._eventHandlers = /* @__PURE__ */ new Map();
    }
    for (const [key, value] of Object.entries(vnode.props)) {
      if (key === "children" || key === "key") continue;
      if (key.startsWith("on") && typeof value === "function") {
        const eventName = key.slice(2).toLowerCase();
        el._eventHandlers.set(eventName, value);
      }
    }
  }
  /**
   * hydrate 子节点
   */
  hydrateChildren(parent, children) {
    if (!children || children.length === 0) return;
    let childDom = parent.firstChild;
    for (const child of children) {
      if (!childDom) break;
      if (typeof child === "string") {
        if (childDom.nodeType === Node.TEXT_NODE) {
          childDom = childDom.nextSibling;
          continue;
        }
        break;
      }
      if (this.hydrateTree(childDom, child)) {
        childDom = childDom.nextSibling;
      } else {
        break;
      }
    }
  }
  /**
   * 创建 DOM 节点
   */
  createDom(vnode) {
    if (vnode.flags === 2 /* Text */ || vnode.type === "text") {
      const text = typeof vnode.children[0] === "string" ? vnode.children[0] : "";
      return document.createTextNode(text || "");
    }
    if (vnode.type === "fragment" || vnode.type === "Fragment") {
      return document.createComment("Fragment");
    }
    if (vnode.flags === 4 /* Component */) {
      return this.createComponentDom(vnode);
    }
    const dom = document.createElement(vnode.type);
    this.setProps(dom, vnode.props);
    this.appendChildren(dom, vnode.children);
    return dom;
  }
  /**
   * 创建组件 DOM
   */
  createComponentDom(vnode) {
    const Component3 = vnode.type;
    const props = vnode.props || {};
    try {
      const result = Component3(props);
      if (result === null) {
        return document.createComment("Empty Component");
      }
      const dom = this.createDom(result);
      dom._component = vnode;
      if (vnode.props && dom._eventHandlers) {
        for (const key in vnode.props) {
          if (key.startsWith("on") && typeof vnode.props[key] === "function") {
            const eventName = key.slice(2).toLowerCase();
            dom._eventHandlers.set(eventName, vnode.props[key]);
          }
        }
      }
      return dom;
    } catch (e) {
      console.error("Component render error:", e);
      return document.createComment("Error");
    }
  }
  /**
   * 设置属性
   */
  setProps(dom, props) {
    if (!props) return;
    if (!dom._eventHandlers) {
      dom._eventHandlers = /* @__PURE__ */ new Map();
    }
    for (const key in props) {
      if (key === "children" || key === "key") continue;
      const value = props[key];
      if (key.startsWith("on") && typeof value === "function") {
        const eventName = key.slice(2).toLowerCase();
        dom._eventHandlers.set(eventName, value);
        continue;
      }
      if (key === "className") {
        dom.setAttribute("class", value);
        continue;
      }
      if (key === "style" && typeof value === "object") {
        Object.assign(dom.style, value);
        continue;
      }
      if (key === "ref") {
        if (typeof value === "function") {
          value(dom);
        } else if (value && "current" in value) {
          value.current = dom;
        }
        continue;
      }
      if (key === "class") {
        dom.setAttribute("class", value);
        continue;
      }
      if (value === null || value === void 0) {
        dom.removeAttribute(key);
      } else {
        dom.setAttribute(key, String(value));
      }
    }
  }
  /**
   * 添加子节点
   */
  appendChildren(parent, children) {
    children.forEach((child) => {
      if (child === null || child === void 0) return;
      if (typeof child === "string") {
        parent.appendChild(document.createTextNode(child));
      } else {
        parent.appendChild(this.createDom(child));
      }
    });
  }
  /**
   * 卸载
   */
  unmount() {
    if (this.context.dom) {
      this.context.container.removeChild(this.context.dom);
      this.context.dom = null;
    }
    this.context.vnode = null;
  }
  /**
   * 补丁更新
   */
  patch(parent, newVNode, oldVNode) {
    if (oldVNode === null) {
      parent.appendChild(this.createDom(newVNode));
      return;
    }
    if (newVNode.type !== oldVNode.type) {
      const newDom = this.createDom(newVNode);
      parent.replaceChild(newDom, parent.firstChild);
      this.context.dom = newDom;
      return;
    }
    this.updateProps(parent, newVNode.props, oldVNode.props);
    this.updateChildren(parent, newVNode.children, oldVNode.children);
  }
  /**
   * 更新属性
   */
  updateProps(dom, newProps, oldProps) {
    const allProps = /* @__PURE__ */ new Set([...Object.keys(newProps || {}), ...Object.keys(oldProps || {})]);
    allProps.forEach((key) => {
      if (key === "children" || key === "key") return;
      const newValue = newProps?.[key];
      const oldValue = oldProps?.[key];
      if (key.startsWith("on") && typeof newValue === "function") {
        const eventName = key.slice(2).toLowerCase();
        dom._eventHandlers?.set(eventName, newValue);
        return;
      }
      if (key === "ref") {
        if (typeof newValue === "function") {
          newValue(dom);
        } else if (newValue && "current" in newValue) {
          newValue.current = dom;
        }
        return;
      }
      if (key === "style") {
        if (typeof newValue === "object") {
          Object.assign(dom.style, newValue);
        }
        return;
      }
      if (newValue !== oldValue) {
        if (newValue === null || newValue === void 0) {
          dom.removeAttribute(key);
        } else {
          dom.setAttribute(key, String(newValue));
        }
      }
    });
  }
  /**
   * 更新子节点
   */
  updateChildren(parent, newChildren, oldChildren) {
    const hasKeys = newChildren.some((c) => typeof c === "object" && c.key !== void 0) || oldChildren.some((c) => typeof c === "object" && c.key !== void 0);
    if (hasKeys) {
      const patches = diffChildrenKeyed(newChildren, oldChildren);
      this.applyPatches(parent, patches);
    } else {
      this.updateChildrenSimple(parent, newChildren, oldChildren);
    }
  }
  updateChildrenSimple(parent, newChildren, oldChildren) {
    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }
    this.appendChildren(parent, newChildren);
  }
  applyPatches(parent, patches) {
    patches.forEach((patch) => {
      switch (patch.type) {
        case "INSERT" /* INSERT */:
        case "REPLACE" /* REPLACE */:
          if (patch.newNode) {
            const dom = this.createDom(patch.newNode);
            const refNode = parent.childNodes[patch.index || 0];
            if (refNode) {
              parent.insertBefore(dom, refNode);
            } else {
              parent.appendChild(dom);
            }
          }
          break;
        case "REMOVE" /* REMOVE */:
          if (parent.childNodes[patch.index || 0]) {
            parent.removeChild(parent.childNodes[patch.index || 0]);
          }
          break;
        case "UPDATE" /* UPDATE */:
          break;
      }
    });
  }
  /**
   * 获取信号
   */
  getSignal(key) {
    return this.context.signals.get(key);
  }
  /**
   * 设置信号
   */
  setSignal(key, signal) {
    this.context.signals.set(key, signal);
  }
  /**
   * Schedule a non-blocking update using Fiber
   */
  scheduleUpdate(callback) {
    scheduleCallback(NormalPriority, callback);
  }
  /**
   * 销毁
   */
  destroy() {
    this.unmount();
    this.context.signals.clear();
  }
};
function createRenderer(container) {
  return new Renderer(container);
}
function mount(vnode, container) {
  const el = typeof container === "string" ? document.querySelector(container) : container;
  const renderer = new Renderer(el);
  renderer.render(vnode);
  return renderer;
}

// src/prompts.ts
var SYSTEM_PROMPT = `\u4F60\u662F\u4E13\u4E1A\u7684 AI UI \u8BBE\u8BA1\u5E08\u3002

\u6839\u636E\u7528\u6237\u7684\u81EA\u7136\u8BED\u8A00\u63CF\u8FF0\uFF0C\u751F\u6210\u7B26\u5408\u4EE5\u4E0B\u89C4\u8303\u7684 JSON UI \u63CF\u8FF0\u3002

\u3010\u7EC4\u4EF6\u7C7B\u578B\u3011
- card: \u901A\u7528\u5361\u7247\u5BB9\u5668
- form: \u8868\u5355\u5BB9\u5668
- input: \u8F93\u5165\u6846
- button: \u6309\u94AE
- list: \u5217\u8868
- alert: \u63D0\u793A\u6846
- stats: \u7EDF\u8BA1\u5361\u7247
- profile: \u7528\u6237\u4FE1\u606F\u5361\u7247
- buttonGroup: \u6309\u94AE\u7EC4

\u3010\u6309\u94AE\u53D8\u4F53\u3011
primary, secondary, ghost, danger, success, warning, outline, dark

\u3010\u6309\u94AE\u5C3A\u5BF8\u3011
xs, sm, lg, xl

\u3010\u6309\u94AE\u5F62\u72B6\u3011
rounded, pill, square, circle

\u3010\u5361\u7247\u6837\u5F0F\u3011
default, flat, border, glass

\u3010\u91CD\u8981\u89C4\u5219\u3011
1. \u53EA\u8FD4\u56DE JSON\uFF0C\u4E0D\u8981\u4EFB\u4F55\u5176\u4ED6\u6587\u5B57\u8BF4\u660E
2. JSON \u5FC5\u987B\u662F\u6709\u6548\u7684\uFF0C\u53EF\u4EE5\u88AB JSON.parse() \u76F4\u63A5\u89E3\u6790
3. \u4E0D\u8981\u4F7F\u7528 markdown \u4EE3\u7801\u5757\u5305\u88F9
4. \u5C5E\u6027\u540D\u4F7F\u7528 camelCase
5. \u7EC4\u4EF6\u8981\u5D4C\u5957\u5408\u7406\uFF0C\u7ED3\u6784\u6E05\u6670

\u3010\u793A\u4F8B\u3011
\u8F93\u5165\uFF1A\u521B\u5EFA\u4E00\u4E2A\u767B\u5F55\u8868\u5355
\u8F93\u51FA\uFF1A
{"type":"card","title":"\u7528\u6237\u767B\u5F55","children":{"type":"form","fields":[{"type":"input","label":"\u90AE\u7BB1\u5730\u5740","type_attr":"email","placeholder":"\u8BF7\u8F93\u5165\u90AE\u7BB1"},{"type":"input","label":"\u5BC6\u7801","type_attr":"password","placeholder":"\u8BF7\u8F93\u5165\u5BC6\u7801"}],"buttons":[{"type":"button","variant":"primary","label":"\u767B\u5F55"},{"type":"button","variant":"ghost","label":"\u5FD8\u8BB0\u5BC6\u7801?"}]}}}`;

// src/ai-adapter.ts
async function callMiniMax(config, userPrompt) {
  const { apiKey, apiUrl = "https://api.minimaxi.com/v1/text/chatcompletion_v2", model = "M2-her" } = config;
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", name: "MiniMax AI" },
          { role: "user", name: "\u7CFB\u7EDF", content: SYSTEM_PROMPT },
          { role: "user", name: "\u7528\u6237", content: userPrompt }
        ]
      })
    });
    const data = await res.json();
    if (data.base_resp?.status_code !== 0) {
      return { content: "", error: data.base_resp?.status_msg || "API \u8BF7\u6C42\u5931\u8D25" };
    }
    return { content: data.choices?.[0]?.message?.content || "" };
  } catch (e) {
    return { content: "", error: e.message };
  }
}
async function callOpenAI(config, userPrompt) {
  const { apiKey, apiUrl = "https://api.openai.com/v1/chat/completions", model = "gpt-4" } = config;
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ]
      })
    });
    const data = await res.json();
    if (data.error) {
      return { content: "", error: data.error.message };
    }
    return { content: data.choices?.[0]?.message?.content || "" };
  } catch (e) {
    return { content: "", error: e.message };
  }
}
async function callAI(provider, config, userPrompt) {
  switch (provider) {
    case "minimax":
      return callMiniMax(config, userPrompt);
    case "openai":
      return callOpenAI(config, userPrompt);
    default:
      return { content: "", error: `\u4E0D\u652F\u6301\u7684 AI \u63D0\u4F9B\u5546: ${provider}` };
  }
}
function parseAIResponse(content) {
  let jsonStr = content.trim();
  const codeMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) {
    jsonStr = codeMatch[1].trim();
  } else {
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }
  }
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    let depth = 0;
    let start = -1;
    for (let i = 0; i < jsonStr.length; i++) {
      if (jsonStr[i] === "{") {
        if (depth === 0) start = i;
        depth++;
      } else if (jsonStr[i] === "}") {
        depth--;
        if (depth === 0 && start !== -1) {
          return JSON.parse(jsonStr.substring(start, i + 1));
        }
      }
    }
    throw e;
  }
}

// src/memo.ts
var memoizedComponentCounter = 0;
function memo(Component3, compare = shallowCompare) {
  let lastProps = null;
  let lastResult = null;
  let mounted = false;
  const Memoized = (props) => {
    if (mounted && lastProps !== null && compare(lastProps, props)) {
      return lastResult;
    }
    lastProps = { ...props };
    lastResult = Component3(props);
    mounted = true;
    return lastResult;
  };
  Memoized.displayName = `memo(${Component3.displayName || "Component" + ++memoizedComponentCounter})`;
  Memoized.compare = compare;
  return Memoized;
}
function shallowCompare(prevProps, nextProps) {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);
  if (prevKeys.length !== nextKeys.length) return false;
  for (const key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }
  return true;
}
var memoCache = /* @__PURE__ */ new Map();
function useMemo(compute, deps) {
  const key = deps.join(",");
  if (memoCache.has(key)) {
    return memoCache.get(key);
  }
  const value = compute();
  memoCache.set(key, value);
  return value;
}
function useCallback(callback, deps) {
  return useMemo(() => callback, deps);
}
function isMemoized(fn) {
  return fn && typeof fn === "function" && "displayName" in fn && fn.displayName?.startsWith("memo(");
}

// src/context.ts
var contextId = 0;
var CONTEXT_MAP = /* @__PURE__ */ new Map();
function createContext(defaultValue) {
  const id = /* @__PURE__ */ Symbol(`context-${++contextId}`);
  const context = {
    id,
    defaultValue,
    Provider: ({ value, children }) => {
      return children;
    },
    Consumer: ({ children }) => {
      return children(defaultValue);
    }
  };
  CONTEXT_MAP.set(id, context);
  return context;
}
var contextStack = [];
function pushContext(context, value) {
  contextStack.push({ context, value });
}
function popContext() {
  contextStack.pop();
}
function useContext(context) {
  for (let i = contextStack.length - 1; i >= 0; i--) {
    if (contextStack[i].context.id === context.id) {
      return contextStack[i].value;
    }
  }
  return context.defaultValue;
}

// src/error-boundary.ts
function componentDidCatch(render2, fallback) {
  return function SafeComponent(props) {
    try {
      return render2(props);
    } catch (error) {
      const errorInfo = {
        componentStack: new Error().stack
      };
      return fallback(error, errorInfo);
    }
  };
}
function ErrorBoundary(props) {
  let state = {
    hasError: false,
    error: null,
    errorInfo: null
  };
  const handleError = (error, errorInfo) => {
    state = { hasError: true, error, errorInfo };
    props.onError?.(error, errorInfo);
    return props.fallback(error, errorInfo);
  };
  try {
    if (state.hasError) {
      return props.fallback(state.error, state.errorInfo);
    }
    if (props.children) {
      const children = Array.isArray(props.children) ? props.children : [props.children];
      return children[0] || null;
    }
    return null;
  } catch (error) {
    return handleError(error, { componentStack: new Error().stack });
  }
}

// src/refs.ts
function ref(initialValue = null) {
  return { current: initialValue };
}
function useRef(initialValue = null) {
  return ref(initialValue);
}
function forwardRef(render2) {
  return function ForwardedComponent(props) {
    const forwardedRef = props.ref;
    return render2(props, forwardedRef);
  };
}

// src/index.ts
var AIRender = class {
  constructor(options) {
    this.currentSpec = [];
    this.container = typeof options.container === "string" ? document.querySelector(options.container) : options.container;
    this.renderer = new Renderer(this.container);
    if (options.initialSpec) {
      this.render(options.initialSpec);
    }
  }
  render(specs) {
    const specArray = Array.isArray(specs) ? specs : [specs];
    this.currentSpec = specArray;
    this.container.innerHTML = "";
    this.renderer.context.dom = null;
    this.renderer.context.vnode = null;
    const vnodes = specArray.map((spec) => registry.render(spec));
    if (vnodes.length === 0) return;
    if (vnodes.length === 1) {
      this.renderer.render(vnodes[0]);
    } else {
      const fragment = h("div", { class: "gen-root" }, ...vnodes);
      this.renderer.render(fragment);
    }
  }
  update(specs) {
    this.render(specs);
  }
  register(name, fn) {
    registry.register(name, fn);
  }
  getSpec() {
    return this.currentSpec;
  }
  destroy() {
    this.renderer.destroy();
  }
};
var AIGenRender = class {
  constructor(options) {
    this.options = options;
    this.air = new AIRender({ container: options.container });
  }
  async generate(userPrompt) {
    const { provider = "minimax", onSpecGenerated, onError } = this.options;
    try {
      const response = await callAI(provider, {
        apiKey: this.options.apiKey,
        apiUrl: this.options.apiUrl,
        model: this.options.model
      }, userPrompt);
      if (response.error) {
        onError?.(response.error);
        return;
      }
      const spec = parseAIResponse(response.content);
      onSpecGenerated?.(spec);
      this.air.render(spec);
    } catch (e) {
      onError?.(e.message);
    }
  }
  render(spec) {
    this.air.render(spec);
  }
};
function createAIRender(container, initialSpec) {
  return new AIRender({ container, initialSpec });
}
function createAIGen(options) {
  return new AIGenRender(options);
}
function render(specs, container) {
  return new AIRender({ container, initialSpec: specs });
}
async function generate(userPrompt, container, apiKey, options) {
  const gen = createAIGen({ container, apiKey, ...options });
  await gen.generate(userPrompt);
  return gen;
}
var index_default = AIRender;
export {
  AIGenRender,
  AIRender,
  ErrorBoundary,
  Fragment,
  IdlePriority,
  ImmediatePriority,
  LowPriority,
  NormalPriority,
  PatchType,
  Renderer,
  SYSTEM_PROMPT,
  Signal,
  UserBlockingPriority,
  batch,
  batchDiff,
  callAI,
  componentDidCatch,
  createAIGen,
  createAIRender,
  createArraySignal,
  createComponent,
  createContext,
  createEffect,
  h as createElement,
  createRenderer,
  createSignal,
  index_default as default,
  diff,
  forwardRef,
  generate,
  getCurrentPriority,
  h,
  isMemoized,
  jsx,
  memo,
  mount,
  parseAIResponse,
  popContext,
  pushContext,
  reconcile,
  ref,
  registry,
  render,
  runWithPriority,
  scheduleCallback,
  t,
  track,
  useCallback,
  useContext,
  useMemo,
  useRef
};
