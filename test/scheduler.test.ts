import { scheduleCallback, runWithPriority, Priority, ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority, IdlePriority } from '../src/scheduler';

describe('Scheduler', () => {
  test('should schedule callback with correct priority', () => {
    let executed = false;
    const callback = scheduleCallback(NormalPriority, () => { executed = true; });
    expect(callback).toBeDefined();
  });

  test('should run with priority', () => {
    let result = '';
    runWithPriority(UserBlockingPriority, () => { result = 'user-blocking'; });
    expect(result).toBe('user-blocking');
  });

  test('ImmediatePriority should execute immediately', () => {
    let count = 0;
    scheduleCallback(ImmediatePriority, () => { count++; });
    expect(count).toBe(1);
  });
});