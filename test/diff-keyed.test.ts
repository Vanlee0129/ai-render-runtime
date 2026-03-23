import { diffChildrenKeyed } from '../src/diff';

describe('Key-based Diff', () => {
  test('should match children by key', () => {
    const oldChildren = [
      { type: 'text', props: {}, children: ['a'], flags: 2, key: '1' },
      { type: 'text', props: {}, children: ['b'], flags: 2, key: '2' },
    ];
    const newChildren = [
      { type: 'text', props: {}, children: ['b'], flags: 2, key: '2' },
      { type: 'text', props: {}, children: ['a'], flags: 2, key: '1' },
    ];

    // Should detect move, not delete+insert
    const patches = diffChildrenKeyed(newChildren, oldChildren);
    expect(patches.some(p => p.type === 'MOVE')).toBe(true);
    expect(patches.filter(p => p.type === 'REMOVE' || p.type === 'INSERT').length).toBeLessThan(2);
  });
});