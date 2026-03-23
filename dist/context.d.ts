export interface Context<T> {
    id: symbol;
    defaultValue: T;
    Provider: ProviderComponent<T>;
    Consumer: ConsumerComponent<T>;
}
type ProviderComponent<T> = (props: {
    value: T;
    children?: any;
}) => any;
type ConsumerComponent<T> = (props: {
    children: (value: T) => any;
}) => any;
export declare function createContext<T>(defaultValue: T): Context<T>;
export declare function setCurrentRenderer(renderer: object | null): void;
export declare function pushContext<T>(context: Context<T>, value: T): void;
export declare function popContext(): void;
export declare function getContextValue<T>(context: Context<T>): T;
/**
 * useContext - Hook to consume context value
 */
export declare function useContext<T>(context: Context<T>): T;
export interface InjectionKey<T> {
    _id: symbol;
    _default: T;
}
export declare function createInjectionKey<T>(defaultValue: T): InjectionKey<T>;
/**
 * provide - Register a value for injection by descendants
 */
export declare function provide<T>(key: string | InjectionKey<T>, value: T): void;
/**
 * inject - Retrieve a value provided by an ancestor
 */
export declare function inject<T>(key: string | InjectionKey<T>, defaultValue?: T): T | undefined;
export {};
//# sourceMappingURL=context.d.ts.map