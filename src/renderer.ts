/**
 * AI Render Runtime - Renderer
 * 核心渲染引擎
 */

import { VNode, VNodeFlags, VNodeProps, Component, ComponentProps, PatchFlags } from './vdom';
import { Ref } from './refs';
import { Signal, batch, createSignal } from './signal';
import { scheduleCallback, NormalPriority } from './scheduler';
import { diff, batchDiff, reconcile, Patch, PatchType, diffChildrenKeyed } from './diff';
import { setMemoRenderId, clearMemoCache } from './memo';
import { setCurrentRenderer } from './context';
import { setCurrentComponentInstance, callHook } from './lifecycle';
import { getKeepAliveCache, setKeepAliveCache } from './keep-alive';
import { isAsyncComponent } from './suspense';

// Event delegation system
type EventHandler = (e: Event) => void;

declare global {
  interface Element {
    _eventHandlers?: Map<string, EventHandler>;
  }
}

function shouldKeepAlive(key: string | number, props: { include?: (string | number)[]; exclude?: (string | number)[] }): boolean {
  if (props.exclude?.includes(key)) {
    return false;
  }
  if (props.include && !props.include.includes(key)) {
    return false;
  }
  return true;
}

export interface RenderOptions {
  container: Element;
  sync?: boolean;        // 同步渲染
  hydrate?: boolean;    // 水合模式
}

/**
 * 渲染上下文
 */
export interface RenderContext {
  container: Element;
  vnode: VNode | null;
  dom: Element | Text | Comment | null;
  signals: Map<string, Signal<any>>;
}

/**
 * 渲染器类
 */
export class Renderer {
  private context: RenderContext;
  private pendingUpdates: (() => void)[] = [];
  private isRendering = false;
  private boundHandlers: Map<string, EventListener> = new Map();
  private isHydrating = false;
  private renderId = 0;  // Per-instance render counter for memoization

  constructor(container: Element) {
    this.context = {
      container,
      vnode: null,
      dom: null,
      signals: new Map()
    };
    this.setupEventDelegation(container);
  }

  /**
   * 设置事件委托（每个容器独立）
   */
  private setupEventDelegation(container: Element): void {
    const events = ['click', 'input', 'change', 'submit', 'focus', 'blur', 'keydown', 'keyup', 'mouseenter', 'mouseleave'];

    const handler = (e: Event) => {
      const target = e.target as Element;
      let current: Element | null = target;

      while (current && current !== container) {
        const handlers = current._eventHandlers as Map<string, EventHandler> | undefined;
        if (handlers) {
          const eventHandler = handlers.get(e.type);
          if (eventHandler) {
            e.preventDefault();
            eventHandler.call(current, e);
            return;
          }
        }
        current = current.parentElement;
      }
    };

    events.forEach(eventName => {
      const boundHandler = handler.bind(this);
      this.boundHandlers.set(eventName, boundHandler);
      container.addEventListener(eventName, boundHandler);
    });
  }

  /**
   * 标记为 hydration 模式
   */
  setHydrating(value: boolean): void {
    this.isHydrating = value;
  }
  
  /**
   * 渲染虚拟节点到 DOM
   */
  render(vnode: VNode | null): void {
    // 设置当前渲染器上下文，用于 Context API
    setCurrentRenderer(this);

    // 设置 memo renderId（每个Renderer实例独立的render cycle）
    this.renderId++;
    const memoRenderId = `r${this.renderId}-${Date.now()}`;
    setMemoRenderId(memoRenderId);

    this.context.vnode = vnode;

    if (vnode === null) {
      setMemoRenderId(null);
      setCurrentRenderer(null);
      this.unmount();
      return;
    }

    // Hydration 模式下不清理 DOM
    if (this.isHydrating) {
      if (this.context.dom === null) {
        this.context.dom = this.context.container.firstChild as Element;
        this.hydrateTree(this.context.dom, vnode);
      }
      this.isHydrating = false;
      setMemoRenderId(null);
      setCurrentRenderer(null);
      return;
    }

    if (this.context.dom === null) {
      // 首次渲染
      const dom = this.createDom(vnode);
      this.context.container.appendChild(dom);
      this.context.dom = dom;
    } else {
      // 更新渲染
      this.patch(this.context.dom as Element, vnode, this.context.vnode);
    }

    setMemoRenderId(null);
    setCurrentRenderer(null);
  }
  
  /**
   * Hydrate - SSR 场景：复用已有 DOM，绑定事件
   * 增强版：更精确的 DOM 复用和匹配
   */
  hydrate(vnode: VNode): void {
    this.context.vnode = vnode;
    this.isHydrating = true;

    if (!this.context.container.firstChild) {
      this.isHydrating = false;
      this.render(vnode);
      return;
    }

    // 复用根 DOM
    this.context.dom = this.context.container.firstChild as Element;

    // 递归 hydrate
    this.hydrateTree(this.context.dom, vnode);
    this.isHydrating = false;
  }

  /**
   * 递归 hydrate 树
   */
  private hydrateTree(dom: Element | Text | Comment, vnode: VNode): boolean {
    if (!dom || !vnode) return false;

    // 文本节点
    if (vnode.flags === VNodeFlags.Text || vnode.type === 'text') {
      if (dom.nodeType === Node.TEXT_NODE) {
        return true;
      }
      return false;
    }

    // Fragment - hydrate children
    if (vnode.type === 'fragment' || vnode.type === 'Fragment') {
      return this.hydrateFragment(dom as Comment, vnode);
    }

    // 组件
    if (vnode.flags === VNodeFlags.Component) {
      return this.hydrateComponent(dom as Element, vnode);
    }

    // 元素
    if (dom.nodeType !== Node.ELEMENT_NODE) return false;

    const el = dom as Element;
    const tagMatch = el.tagName.toLowerCase() === (vnode.type as string).toLowerCase();

    if (!tagMatch) {
      console.warn(`Hydrate tag mismatch: expected ${vnode.type}, got ${el.tagName}`);
      return false;
    }

    // 绑定事件
    this.hydrateElementProps(el, vnode);

    // 递归 hydrate 子节点
    this.hydrateChildren(el, vnode.children);

    return true;
  }

  /**
   * hydrate Fragment
   */
  private hydrateFragment(dom: Comment, vnode: VNode): boolean {
    const children = Array.isArray(vnode.children) ? vnode.children : [vnode.children];
    let childDom = dom.nextSibling;

    for (const child of children) {
      if (!childDom) break;
      if (typeof child === 'string') {
        if (childDom.nodeType === Node.TEXT_NODE) {
          childDom = childDom.nextSibling;
          continue;
        }
        break;
      }
      if (this.hydrateTree(childDom as Element, child)) {
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
  private hydrateComponent(dom: Element, vnode: VNode): boolean {
    const Component = vnode.type as Component;
    const props = vnode.props || {};

    try {
      const result = Component(props);
      if (result === null) return true;

      return this.hydrateTree(dom, result);
    } catch (e) {
      console.error('Component hydrate error:', e);
      return false;
    }
  }

  /**
   * hydrate 元素属性和事件
   */
  private hydrateElementProps(el: Element, vnode: VNode): void {
    if (!vnode.props) return;

    // 初始化事件处理器映射
    if (!(el as any)._eventHandlers) {
      (el as any)._eventHandlers = new Map();
    }

    for (const [key, value] of Object.entries(vnode.props)) {
      if (key === 'children' || key === 'key') continue;

      if (key.startsWith('on') && typeof value === 'function') {
        const eventName = key.slice(2).toLowerCase();
        (el as any)._eventHandlers.set(eventName, value);
      }
    }
  }

  /**
   * hydrate 子节点
   */
  private hydrateChildren(parent: Element, children: (VNode | string)[]): void {
    if (!children || children.length === 0) return;

    let childDom = parent.firstChild;

    for (const child of children) {
      if (!childDom) break;

      if (typeof child === 'string') {
        if (childDom.nodeType === Node.TEXT_NODE) {
          childDom = childDom.nextSibling;
          continue;
        }
        break;
      }

      if (this.hydrateTree(childDom as Element, child)) {
        childDom = childDom.nextSibling;
      } else {
        break;
      }
    }
  }
  
  /**
   * 创建 DOM 节点
   */
  private createDom(vnode: VNode): Element | Text | Comment {
    // 文本节点
    if (vnode.flags === VNodeFlags.Text || vnode.type === 'text') {
      const text = typeof vnode.children[0] === 'string' ? vnode.children[0] : '';
      return document.createTextNode(text || '');
    }
    
    // Fragment
    if (vnode.type === 'fragment' || vnode.type === 'Fragment') {
      return document.createComment('Fragment');
    }
    
    // 组件
    if (vnode.flags === VNodeFlags.Component) {
      return this.createComponentDom(vnode);
    }
    
    // 元素
    const dom = document.createElement(vnode.type as string);
    this.setProps(dom, vnode.props);
    this.appendChildren(dom, vnode.children);
    
    return dom;
  }
  
  /**
   * 创建组件 DOM
   */
  private createComponentDom(vnode: VNode): Element | Comment {
    const Component = vnode.type as Component;
    const props = vnode.props || {};

    try {
      // Set current component for lifecycle hooks
      setCurrentComponentInstance(Component);

      // Call onBeforeMount
      callHook(Component, 'onBeforeMount');

      const result = Component(props);

      // Handle promise (async component threw)
      if (result instanceof Promise) {
        // This is an async component - we'll render fallback during loading
        // For now, return a placeholder comment node
        setCurrentComponentInstance(null);
        return document.createComment('Async Component Loading');
      }

      setCurrentComponentInstance(null);

      if (result === null) {
        return document.createComment('Empty Component');
      }

      const dom = this.createDom(result);
      (dom as any)._component = vnode;

      // Call onMounted after DOM is created
      callHook(Component, 'onMounted');

      return dom;
    } catch (e) {
      setCurrentComponentInstance(null);

      // Check if it's a promise (async component error boundary)
      if (e instanceof Promise) {
        return document.createComment('Suspended');
      }

      console.error('Component render error:', e);
      return document.createComment('Error');
    }
  }
  
  /**
   * 设置属性
   */
  private setProps(dom: Element, props: VNodeProps): void {
    if (!props) return;

    // Initialize event handlers map
    if (!dom._eventHandlers) {
      dom._eventHandlers = new Map();
    }

    for (const key in props) {
      if (key === 'children' || key === 'key') continue;

      const value = props[key];

      // Event handling via delegation - store in map, don't add listener directly
      if (key.startsWith('on') && typeof value === 'function') {
        const eventName = key.slice(2).toLowerCase();
        dom._eventHandlers!.set(eventName, value as EventHandler);
        continue;
      }

      // className -> class
      if (key === 'className') {
        dom.setAttribute('class', value);
        continue;
      }

      // style
      if (key === 'style' && typeof value === 'object') {
        Object.assign((dom as HTMLElement).style, value);
        continue;
      }

      // ref
      if (key === 'ref') {
        if (typeof value === 'function') {
          value(dom);
        } else if (value && 'current' in value) {
          (value as Ref<any>).current = dom;
        }
        continue;
      }

      // class (direct)
      if (key === 'class') {
        dom.setAttribute('class', value);
        continue;
      }

      // Regular attributes
      if (value === null || value === undefined) {
        dom.removeAttribute(key);
      } else {
        dom.setAttribute(key, String(value));
      }
    }
  }
  
  /**
   * 添加子节点
   */
  private appendChildren(parent: Element, children: (VNode | string)[]): void {
    children.forEach(child => {
      if (child === null || child === undefined) return;
      
      if (typeof child === 'string') {
        parent.appendChild(document.createTextNode(child));
      } else {
        parent.appendChild(this.createDom(child));
      }
    });
  }
  
  /**
   * 卸载
   */
  private unmount(): void {
    if (this.context.dom) {
      this.context.container.removeChild(this.context.dom);
      this.context.dom = null;
    }
    this.context.vnode = null;
  }
  
  /**
   * 补丁更新
   */
  private patch(
    parent: Element,
    newVNode: VNode,
    oldVNode: VNode | null
  ): void {
    // 简化处理：直接替换
    if (oldVNode === null) {
      parent.appendChild(this.createDom(newVNode));
      return;
    }
    
    // 如果类型不同，直接替换
    if (newVNode.type !== oldVNode.type) {
      const newDom = this.createDom(newVNode);
      parent.replaceChild(newDom, parent.firstChild!);
      this.context.dom = newDom;
      return;
    }
    
    // 更新属性
    this.updateProps(parent as HTMLElement, newVNode.props, oldVNode.props, newVNode.patchFlag);
    
    // 更新子节点
    this.updateChildren(parent, newVNode.children, oldVNode.children);
  }
  
  /**
   * 更新属性
   */
  private updateProps(
    dom: HTMLElement,
    newProps: VNodeProps,
    oldProps: VNodeProps,
    patchFlag?: PatchFlags
  ): void {
    // If specific patchFlag is set, only update that
    if (patchFlag === PatchFlags.CLASS) {
      const newClass = newProps?.className ?? newProps?.class;
      const oldClass = oldProps?.className ?? oldProps?.class;
      if (newClass !== oldClass) {
        dom.setAttribute('class', newClass || '');
      }
      return;
    }

    if (patchFlag === PatchFlags.STYLE) {
      if (typeof newProps?.style === 'object') {
        Object.assign(dom.style, newProps.style);
      }
      return;
    }

    // Default: full props update
    const allProps = new Set([...Object.keys(newProps || {}), ...Object.keys(oldProps || {})]);

    allProps.forEach(key => {
      if (key === 'children' || key === 'key') return;

      const newValue = newProps?.[key];
      const oldValue = oldProps?.[key];

      // 事件
      if (key.startsWith('on') && typeof newValue === 'function') {
        const eventName = key.slice(2).toLowerCase();
        dom._eventHandlers?.set(eventName, newValue as EventHandler);
        return;
      }

      // ref
      if (key === 'ref') {
        if (typeof newValue === 'function') {
          newValue(dom);
        } else if (newValue && 'current' in newValue) {
          (newValue as Ref<any>).current = dom;
        }
        return;
      }

      // style
      if (key === 'style') {
        if (typeof newValue === 'object') {
          Object.assign(dom.style, newValue);
        }
        return;
      }

      // 其他属性
      if (newValue !== oldValue) {
        if (newValue === null || newValue === undefined) {
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
  private updateChildren(
    parent: Element,
    newChildren: (VNode | string)[],
    oldChildren: (VNode | string)[]
  ): void {
    // Use keyed diff if children have keys
    const hasKeys = newChildren.some(c => typeof c === 'object' && c.key !== undefined) ||
                    oldChildren.some(c => typeof c === 'object' && c.key !== undefined);

    if (hasKeys) {
      const patches = diffChildrenKeyed(newChildren, oldChildren);
      this.applyPatches(parent, patches);
    } else {
      // Fallback to simple diff for children without keys
      this.updateChildrenSimple(parent, newChildren, oldChildren);
    }
  }

  private updateChildrenSimple(
    parent: Element,
    newChildren: (VNode | string)[],
    oldChildren: (VNode | string)[]
  ): void {
    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }
    this.appendChildren(parent, newChildren);
  }

  private applyPatches(parent: Element, patches: Patch[]): void {
    // Sort patches: REMOVE first, then UPDATE/INSERT, then MOVE last
    // This ensures we don't mess up indices
    const sortedPatches = [...patches].sort((a, b) => {
      const order = { REMOVE: 0, UPDATE: 1, INSERT: 2, REPLACE: 2, MOVE: 3, TEXT: 4 };
      return order[a.type as keyof typeof order] - order[b.type as keyof typeof order];
    });

    sortedPatches.forEach(patch => {
      switch (patch.type) {
        case PatchType.REMOVE:
          if (parent.childNodes[patch.index || 0]) {
            parent.removeChild(parent.childNodes[patch.index || 0]);
          }
          break;

        case PatchType.INSERT:
        case PatchType.REPLACE:
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

        case PatchType.UPDATE:
          // Handled by updateProps in patch phase
          break;

        case PatchType.MOVE:
          if (patch.newNode) {
            // For MOVE, we need to find the existing DOM node by matching
            // This is a simplified approach - in production would need better DOM tracking
            const dom = this.createDom(patch.newNode);
            const refNode = parent.childNodes[patch.index || 0];
            if (refNode) {
              parent.insertBefore(dom, refNode);
            } else {
              parent.appendChild(dom);
            }
          }
          break;

        case PatchType.TEXT:
          if (patch.props && typeof patch.props.text === 'string') {
            const textNode = parent.childNodes[patch.index || 0];
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
              textNode.textContent = patch.props.text;
            }
          }
          break;
      }
    });
  }
  
  /**
   * 获取信号
   */
  getSignal<T>(key: string): Signal<T> | undefined {
    return this.context.signals.get(key);
  }
  
  /**
   * 设置信号
   */
  setSignal<T>(key: string, signal: Signal<T>): void {
    this.context.signals.set(key, signal);
  }

  /**
   * Schedule a non-blocking update using Fiber
   */
  scheduleUpdate(callback: () => void): void {
    scheduleCallback(NormalPriority, callback);
  }

  /**
   * 销毁
   */
  destroy(): void {
    // 移除事件监听
    this.boundHandlers.forEach((handler, eventName) => {
      this.context.container.removeEventListener(eventName, handler);
    });
    this.boundHandlers.clear();

    this.unmount();
    this.context.signals.clear();
  }
}

/**
 * 创建渲染器
 */
export function createRenderer(container: Element): Renderer {
  return new Renderer(container);
}

/**
 * 挂载到容器
 */
export function mount(
  vnode: VNode,
  container: Element | string
): Renderer {
  const el = typeof container === 'string' 
    ? document.querySelector(container)! 
    : container;
  
  const renderer = new Renderer(el);
  renderer.render(vnode);
  
  return renderer;
}

/**
 * Hydrate - 在已有 DOM 上绑定事件
 * 用于 SSR 后的客户端接管
 */
export function hydrate(
  vnode: VNode,
  container: Element | string
): Renderer {
  const el = typeof container === 'string' 
    ? document.querySelector(container)! 
    : container;
  
  const renderer = new Renderer(el);
  
  // 标记为 hydrate 模式（不重新渲染 DOM）
  renderer.hydrate(vnode);
  
  return renderer;
}
