import { createContext, useContext } from '../src/context';

describe('Context', () => {
  test('should create context with default value', () => {
    const ThemeContext = createContext<string>('default');
    expect(ThemeContext).toBeDefined();
    expect(ThemeContext.defaultValue).toBe('default');
  });

  test('should provide value through context', () => {
    const CounterContext = createContext(0);
    // Context should work with Provider
    expect(CounterContext.Provider).toBeDefined();
  });

  test('useContext should return default when no provider', () => {
    const ThemeContext = createContext('light');
    const value = useContext(ThemeContext);
    expect(value).toBe('light');
  });
});
