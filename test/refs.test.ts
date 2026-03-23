import { ref, useRef, forwardRef, Ref } from '../src/refs';

describe('Refs', () => {
  test('should create a ref', () => {
    const myRef = ref<HTMLDivElement>();
    expect(myRef).toBeDefined();
    expect(myRef.current).toBeNull();
  });

  test('forwardRef should forward ref to component', () => {
    const MyComponent = forwardRef((props, ref) => null);
    expect(MyComponent).toBeDefined();
  });
});
