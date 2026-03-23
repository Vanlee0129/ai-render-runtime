/**
 * 示例组件 - 使用 JSX 语法
 */

import { h, VNode } from '../vdom';

// 用户卡片组件
export function UserCard(props: { name: string; email: string; avatar?: string; role?: string }) {
  return (
    <div class="gen-card" style="text-align: center; padding: 24px;">
      <div 
        class="gen-avatar gen-avatar-lg" 
        style="background: linear-gradient(135deg, #a78bfa, #f472b6); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 16px;"
      >
        {props.avatar || props.name?.charAt(0) || '?'}
      </div>
      <h3 class="gen-title" style="margin-bottom: 4px;">{props.name}</h3>
      <p class="gen-subtitle" style="margin-bottom: 12px;">{props.email}</p>
      {props.role && (
        <span class="gen-badge gen-badge-primary">{props.role}</span>
      )}
    </div>
  );
}

// 统计卡片组件
export function StatCard(props: { label: string; value: string | number; trend?: number }) {
  return (
    <div class="gen-card" style="text-align: center; padding: 20px;">
      <div 
        style="font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #a78bfa, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;"
      >
        {props.value}
      </div>
      <div class="gen-subtitle" style="margin-top: 8px;">{props.label}</div>
      {props.trend !== undefined && (
        <span 
          class={`gen-badge ${props.trend >= 0 ? 'gen-badge-success' : 'gen-badge-danger'}`}
          style="margin-top: 8px; display: inline-block;"
        >
          {props.trend >= 0 ? '↑' : '↓'}{Math.abs(props.trend)}%
        </span>
      )}
    </div>
  );
}

// 按钮组件
export function Button(props: { 
  label: string; 
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'xs' | 'sm' | 'lg';
  onClick?: () => void;
}) {
  return (
    <button 
      class={`gen-btn gen-btn-${props.variant || 'primary'} ${props.size ? `gen-btn-${props.size}` : ''}`}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  );
}

// 表单组件
export function Form(props: {
  title: string;
  fields: Array<{ label: string; placeholder: string; type?: string; name: string }>;
  onSubmit?: (data: Record<string, string>) => void;
}) {
  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = value as string;
    });
    props.onSubmit?.(data);
  };

  return (
    <form class="gen-card gen-form" onSubmit={handleSubmit}>
      <h3 class="gen-title">{props.title}</h3>
      {props.fields.map(field => (
        <div class="gen-field">
          <label class="gen-label">{field.label}</label>
          <input 
            class="gen-input" 
            type={field.type || 'text'}
            name={field.name}
            placeholder={field.placeholder}
          />
        </div>
      ))}
      <div style="display: flex; gap: 12px; margin-top: 8px;">
        <Button label="提交" variant="primary" />
        <Button label="重置" variant="secondary" />
      </div>
    </form>
  );
}

// 页面布局
export function PageLayout(props: { children: VNode | VNode[] }) {
  return (
    <div class="gen-root" style="max-width: 800px; margin: 0 auto; padding: 32px;">
      {props.children}
    </div>
  );
}

// 网格布局
export function Grid(props: { cols?: 2 | 3 | 4; children: VNode | VNode[] }) {
  return (
    <div class={`gen-grid gen-grid-${props.cols || 3}`}>
      {props.children}
    </div>
  );
}
