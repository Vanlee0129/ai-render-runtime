import { createFiber, Fiber, FiberRoot, FiberFlags, createWorkInProgress, beginWork, completeWork, commitWork } from '../src/fiber';

describe('Fiber', () => {
  test('should create fiber from vnode', () => {
    const vnode = { type: 'div', props: {}, children: [], flags: 1, key: undefined };
    const fiber = createFiber(vnode, null);
    expect(fiber).toBeDefined();
    expect(fiber.type).toBe('div');
  });

  test('should identify host components', () => {
    const vnode = { type: 'div', props: {}, children: [], flags: 1 };
    const fiber = createFiber(vnode, null);
    expect(fiber.tag).toBe('host');
  });
});