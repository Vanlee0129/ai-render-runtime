/**
 * AI Render Runtime - Renderer
 * 核心渲染引擎
 */

import { VNode, VNodeFlags, VNodeProps, Component, ComponentProps } from './vdom';
import { Ref } from './refs';
import { Signal, batch, createSignal } from './signal';
import { scheduleCallback, NormalPriority } from './scheduler';
import { diff, batchDiff, reconcile, Patch, PatchType, diffChildrenKeyed } from './diff';

// Event delegation system
type EventHandler = (e: Event) => void;
const delegatedEvents = new Map<string, Set<EventHandler>>();
let rootElement: Element | null = null;

export function setRootElement(el: Element): void {
  rootElement = el;
  if (rootElement) {
    rootElement.addEventListener('click', handleDelegatedEvent);
    rootElement.addEventListener('input', handleDelegatedEvent);
    rootElement.addEventListener('change', handleDelegatedEvent);
    rootElement.addEventListener('submit', handleDelegatedEvent);
    rootElement.addEventListener('focus', handleDelegatedEvent);
    rootElement.addEventListener('blur', handleDelegatedEvent);
    rootElement.addEventListener('keydown', handleDelegatedEvent);
    rootElement.addEventListener('keyup', handleDelegatedEvent);
    rootElement.addEventListener('mouseenter', handleDelegatedEvent);
    rootElement.addEventListener('mouseleave', handleDelegatedEvent);
  }
}

function handleDelegatedEvent(e: Event): void {
  const target = e.target as Element;
  // Walk up the tree to find element with event handler
  let current: Element | null = target;
  while (current && current !== rootElement) {
    const handlers = current._eventHandlers as Map<string, EventHandler> | undefined;
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

declare global {
  interface Element {
    _eventHandlers?: Map<string, EventHandler>;
  }
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
  
  constructor(container: Element) {
    this.context = {
      container,
      vnode: null,
      dom: null,
      signals: new Map()
    };
    setRootElement(container);
  }
  
  /**
   * 渲染虚拟节点到 DOM
   */
  render(vnode: VNode | null): void {
    this.context.vnode = vnode;
    
    if (vnode === null) {
      this.unmount();
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
  }
  
  /**
   * Hydrate - 复用已有 DOM，绑定事件
   * 用于 SSR 场景
   */
  hydrate(vnode: VNode): void {
    this.context.vnode = vnode;
    
    if (!this.context.container.firstChild) {
      // 没有已有 DOM，执行正常渲染
      this.render(vnode);
      return;
    }
    
    // 复用第一个子节点作为根 DOM
    this.context.dom = this.context.container.firstChild as Element;
    
    // 递归绑定事件
    this.hydrateElement(this.context.dom, vnode);
  }
  
  /**
   * 递归绑定事件到已有 DOM
   */
  private hydrateElement(dom: Element | Text | Comment, vnode: VNode): void {
    if (!vnode || !dom) return;
    
    // 绑定事件处理器
    if (vnode.props) {
      for (const [key, value] of Object.entries(vnode.props)) {
        if (key.startsWith('on') && typeof value === 'function') {
          const eventName = key.slice(2).toLowerCase();
          dom.addEventListener(eventName, value as EventListener);
        }
      }
    }
    
    // 递归处理子节点
    if (vnode.children && dom.childNodes) {
      const children = Array.isArray(vnode.children) ? vnode.children : [vnode.children];
      children.forEach((child, i) => {
        if (child && typeof child === 'object' && 'type' in child) {
          const childDom = dom.childNodes[i] as Element | Text | Comment;
          if (childDom) {
            this.hydrateElement(childDom, child);
          }
        }
      });
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
      const result = Component(props);
      if (result === null) {
        return document.createComment('Empty Component');
      }

      const dom = this.createDom(result);
      (dom as any)._component = vnode;

      // Transfer event handlers from vnode to actual DOM
      if (vnode.props && (dom as Element)._eventHandlers) {
        for (const key in vnode.props) {
          if (key.startsWith('on') && typeof vnode.props[key] === 'function') {
            const eventName = key.slice(2).toLowerCase();
            (dom as Element)._eventHandlers!.set(eventName, vnode.props[key]);
          }
        }
      }

      return dom;
    } catch (e) {
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
    this.updateProps(parent as HTMLElement, newVNode.props, oldVNode.props);
    
    // 更新子节点
    this.updateChildren(parent, newVNode.children, oldVNode.children);
  }
  
  /**
   * 更新属性
   */
  private updateProps(
    dom: HTMLElement,
    newProps: VNodeProps,
    oldProps: VNodeProps
  ): void {
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
    // Apply patches in order
    patches.forEach(patch => {
      switch (patch.type) {
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
        case PatchType.REMOVE:
          if (parent.childNodes[patch.index || 0]) {
            parent.removeChild(parent.childNodes[patch.index || 0]);
          }
          break;
        case PatchType.UPDATE:
          // Handled by updateProps
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
