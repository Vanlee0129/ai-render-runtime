/**
 * AI Render Runtime - Renderer
 * 核心渲染引擎
 */
import { VNodeFlags, PatchFlags } from './vdom';
import { scheduleCallback, NormalPriority } from './scheduler';
import { PatchType, diffChildrenKeyed } from './diff';
import { setMemoRenderId } from './memo';
import { setCurrentRenderer } from './context';
import { setCurrentComponentInstance, callHook } from './lifecycle';
function shouldKeepAlive(key, props) {
    if (props.exclude?.includes(key)) {
        return false;
    }
    if (props.include && !props.include.includes(key)) {
        return false;
    }
    return true;
}
/**
 * 渲染器类
 */
export class Renderer {
    constructor(container) {
        this.pendingUpdates = [];
        this.isRendering = false;
        this.boundHandlers = new Map();
        this.isHydrating = false;
        this.renderId = 0; // Per-instance render counter for memoization
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
    setupEventDelegation(container) {
        const events = ['click', 'input', 'change', 'submit', 'focus', 'blur', 'keydown', 'keyup', 'mouseenter', 'mouseleave'];
        const handler = (e) => {
            const target = e.target;
            let current = target;
            while (current && current !== container) {
                const handlers = current._eventHandlers;
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
    setHydrating(value) {
        this.isHydrating = value;
    }
    /**
     * 渲染虚拟节点到 DOM
     */
    render(vnode) {
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
                this.context.dom = this.context.container.firstChild;
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
        }
        else {
            // 更新渲染
            this.patch(this.context.dom, vnode, this.context.vnode);
        }
        setMemoRenderId(null);
        setCurrentRenderer(null);
    }
    /**
     * Hydrate - SSR 场景：复用已有 DOM，绑定事件
     * 增强版：更精确的 DOM 复用和匹配
     */
    hydrate(vnode) {
        this.context.vnode = vnode;
        this.isHydrating = true;
        if (!this.context.container.firstChild) {
            this.isHydrating = false;
            this.render(vnode);
            return;
        }
        // 复用根 DOM
        this.context.dom = this.context.container.firstChild;
        // 递归 hydrate
        this.hydrateTree(this.context.dom, vnode);
        this.isHydrating = false;
    }
    /**
     * 递归 hydrate 树
     */
    hydrateTree(dom, vnode) {
        if (!dom || !vnode)
            return false;
        // 文本节点
        if (vnode.flags === VNodeFlags.Text || vnode.type === 'text') {
            if (dom.nodeType === Node.TEXT_NODE) {
                return true;
            }
            return false;
        }
        // Fragment - hydrate children
        if (vnode.type === 'fragment' || vnode.type === 'Fragment') {
            return this.hydrateFragment(dom, vnode);
        }
        // 组件
        if (vnode.flags === VNodeFlags.Component) {
            return this.hydrateComponent(dom, vnode);
        }
        // 元素
        if (dom.nodeType !== Node.ELEMENT_NODE)
            return false;
        const el = dom;
        const tagMatch = el.tagName.toLowerCase() === vnode.type.toLowerCase();
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
    hydrateFragment(dom, vnode) {
        const children = Array.isArray(vnode.children) ? vnode.children : [vnode.children];
        let childDom = dom.nextSibling;
        for (const child of children) {
            if (!childDom)
                break;
            if (typeof child === 'string') {
                if (childDom.nodeType === Node.TEXT_NODE) {
                    childDom = childDom.nextSibling;
                    continue;
                }
                break;
            }
            if (this.hydrateTree(childDom, child)) {
                childDom = childDom.nextSibling;
            }
            else {
                break;
            }
        }
        return true;
    }
    /**
     * hydrate 组件
     */
    hydrateComponent(dom, vnode) {
        const Component = vnode.type;
        const props = vnode.props || {};
        try {
            const result = Component(props);
            if (result === null)
                return true;
            return this.hydrateTree(dom, result);
        }
        catch (e) {
            console.error('Component hydrate error:', e);
            return false;
        }
    }
    /**
     * hydrate 元素属性和事件
     */
    hydrateElementProps(el, vnode) {
        if (!vnode.props)
            return;
        // 初始化事件处理器映射
        if (!el._eventHandlers) {
            el._eventHandlers = new Map();
        }
        for (const [key, value] of Object.entries(vnode.props)) {
            if (key === 'children' || key === 'key')
                continue;
            if (key.startsWith('on') && typeof value === 'function') {
                const eventName = key.slice(2).toLowerCase();
                el._eventHandlers.set(eventName, value);
            }
        }
    }
    /**
     * hydrate 子节点
     */
    hydrateChildren(parent, children) {
        if (!children || children.length === 0)
            return;
        let childDom = parent.firstChild;
        for (const child of children) {
            if (!childDom)
                break;
            if (typeof child === 'string') {
                if (childDom.nodeType === Node.TEXT_NODE) {
                    childDom = childDom.nextSibling;
                    continue;
                }
                break;
            }
            if (this.hydrateTree(childDom, child)) {
                childDom = childDom.nextSibling;
            }
            else {
                break;
            }
        }
    }
    /**
     * 创建 DOM 节点
     */
    createDom(vnode) {
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
        const dom = document.createElement(vnode.type);
        this.setProps(dom, vnode.props);
        this.appendChildren(dom, vnode.children);
        return dom;
    }
    /**
     * 创建组件 DOM
     */
    createComponentDom(vnode) {
        const Component = vnode.type;
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
            dom._component = vnode;
            // Call onMounted after DOM is created
            callHook(Component, 'onMounted');
            return dom;
        }
        catch (e) {
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
    setProps(dom, props) {
        if (!props)
            return;
        // Initialize event handlers map
        if (!dom._eventHandlers) {
            dom._eventHandlers = new Map();
        }
        for (const key in props) {
            if (key === 'children' || key === 'key')
                continue;
            const value = props[key];
            // Event handling via delegation - store in map, don't add listener directly
            if (key.startsWith('on') && typeof value === 'function') {
                const eventName = key.slice(2).toLowerCase();
                dom._eventHandlers.set(eventName, value);
                continue;
            }
            // className -> class
            if (key === 'className') {
                dom.setAttribute('class', value);
                continue;
            }
            // style
            if (key === 'style' && typeof value === 'object') {
                Object.assign(dom.style, value);
                continue;
            }
            // ref
            if (key === 'ref') {
                if (typeof value === 'function') {
                    value(dom);
                }
                else if (value && 'current' in value) {
                    value.current = dom;
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
            }
            else {
                dom.setAttribute(key, String(value));
            }
        }
    }
    /**
     * 添加子节点
     */
    appendChildren(parent, children) {
        children.forEach(child => {
            if (child === null || child === undefined)
                return;
            if (typeof child === 'string') {
                parent.appendChild(document.createTextNode(child));
            }
            else {
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
        // 简化处理：直接替换
        if (oldVNode === null) {
            parent.appendChild(this.createDom(newVNode));
            return;
        }
        // 如果类型不同，直接替换
        if (newVNode.type !== oldVNode.type) {
            const newDom = this.createDom(newVNode);
            parent.replaceChild(newDom, parent.firstChild);
            this.context.dom = newDom;
            return;
        }
        // 更新属性
        this.updateProps(parent, newVNode.props, oldVNode.props, newVNode.patchFlag);
        // 更新子节点
        this.updateChildren(parent, newVNode.children, oldVNode.children);
    }
    /**
     * 更新属性
     */
    updateProps(dom, newProps, oldProps, patchFlag) {
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
            if (key === 'children' || key === 'key')
                return;
            const newValue = newProps?.[key];
            const oldValue = oldProps?.[key];
            // 事件
            if (key.startsWith('on') && typeof newValue === 'function') {
                const eventName = key.slice(2).toLowerCase();
                dom._eventHandlers?.set(eventName, newValue);
                return;
            }
            // ref
            if (key === 'ref') {
                if (typeof newValue === 'function') {
                    newValue(dom);
                }
                else if (newValue && 'current' in newValue) {
                    newValue.current = dom;
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
                }
                else {
                    dom.setAttribute(key, String(newValue));
                }
            }
        });
    }
    /**
     * 更新子节点
     */
    updateChildren(parent, newChildren, oldChildren) {
        // Use keyed diff if children have keys
        const hasKeys = newChildren.some(c => typeof c === 'object' && c.key !== undefined) ||
            oldChildren.some(c => typeof c === 'object' && c.key !== undefined);
        if (hasKeys) {
            const patches = diffChildrenKeyed(newChildren, oldChildren);
            this.applyPatches(parent, patches);
        }
        else {
            // Fallback to simple diff for children without keys
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
        // Sort patches: REMOVE first, then UPDATE/INSERT, then MOVE last
        // This ensures we don't mess up indices
        const sortedPatches = [...patches].sort((a, b) => {
            const order = { REMOVE: 0, UPDATE: 1, INSERT: 2, REPLACE: 2, MOVE: 3, TEXT: 4 };
            return order[a.type] - order[b.type];
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
                        }
                        else {
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
                        }
                        else {
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
export function createRenderer(container) {
    return new Renderer(container);
}
/**
 * 挂载到容器
 */
export function mount(vnode, container) {
    const el = typeof container === 'string'
        ? document.querySelector(container)
        : container;
    const renderer = new Renderer(el);
    renderer.render(vnode);
    return renderer;
}
/**
 * Hydrate - 在已有 DOM 上绑定事件
 * 用于 SSR 后的客户端接管
 */
export function hydrate(vnode, container) {
    const el = typeof container === 'string'
        ? document.querySelector(container)
        : container;
    const renderer = new Renderer(el);
    // 标记为 hydrate 模式（不重新渲染 DOM）
    renderer.hydrate(vnode);
    return renderer;
}
//# sourceMappingURL=renderer.js.map