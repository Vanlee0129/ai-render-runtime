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
export declare function pushContext<T>(context: Context<T>, value: T): void;
export declare function popContext(): void;
export declare function getContextValue<T>(context: Context<T>): T;
/**
 * useContext - Hook to consume context value
 */
export declare function useContext<T>(context: Context<T>): T;
export {};
//# sourceMappingURL=context.d.ts.map