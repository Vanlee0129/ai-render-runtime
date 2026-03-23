/**
 * 示例组件 - 使用 JSX 语法
 */
import { VNode } from '../vdom';
export declare function UserCard(props: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
}): JSX.Element;
export declare function StatCard(props: {
    label: string;
    value: string | number;
    trend?: number;
}): JSX.Element;
export declare function Button(props: {
    label: string;
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'xs' | 'sm' | 'lg';
    onClick?: () => void;
}): JSX.Element;
export declare function Form(props: {
    title: string;
    fields: Array<{
        label: string;
        placeholder: string;
        type?: string;
        name: string;
    }>;
    onSubmit?: (data: Record<string, string>) => void;
}): JSX.Element;
export declare function PageLayout(props: {
    children: VNode | VNode[];
}): JSX.Element;
export declare function Grid(props: {
    cols?: 2 | 3 | 4;
    children: VNode | VNode[];
}): JSX.Element;
//# sourceMappingURL=UserCard.d.ts.map