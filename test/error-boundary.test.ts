import { ErrorBoundary, componentDidCatch } from '../src/error-boundary';

describe('Error Boundary', () => {
  test('should create error boundary component', () => {
    const boundary = ErrorBoundary({
      fallback: () => null,
      children: null
    });
    expect(boundary).toBeDefined();
  });

  test('should catch render errors', () => {
    let errorCaught = false;
    const SafeComponent = componentDidCatch(
      () => { throw new Error('test'); },
      (error) => { errorCaught = true; return null; }
    );
    SafeComponent({});
    expect(errorCaught).toBe(true);
  });
});