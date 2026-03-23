import { memo, isMemoized } from '../src/memo';

describe('Memoization', () => {
  test('memo should wrap component', () => {
    const MyComponent = (props: { name: string }) => null;
    const Memoized = memo(MyComponent);
    expect(Memoized).toBeDefined();
    expect(Memoized.displayName).toBe('memo(Component1)');
  });

  test('memo should compare props shallowly', () => {
    let renderCount = 0;
    const MyComponent = (props: { name: string }) => {
      renderCount++;
      return null;
    };
    const Memoized = memo(MyComponent);
    Memoized({ name: 'Alice' });
    Memoized({ name: 'Alice' }); // Same props - should not re-render
    expect(renderCount).toBe(1);
  });

  test('isMemoized should detect memoized components', () => {
    const MyComponent = (props: { name: string }) => null;
    const Memoized = memo(MyComponent);
    expect(isMemoized(Memoized)).toBe(true);
    expect(isMemoized(MyComponent)).toBe(false);
  });
});