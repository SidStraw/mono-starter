import { describe, expect, it } from 'vitest';
import { summarizeNumbers } from './index';

describe('summarizeNumbers', () => {
  it('summarizes a readonly input without changing it', () => {
    const values = Object.freeze([2, -4, 8]);
    expect(summarizeNumbers(values)).toEqual({ count: 3, total: 6, average: 2 });
    expect(values).toEqual([2, -4, 8]);
  });
  it('represents an empty average explicitly', () => {
    expect(summarizeNumbers([])).toEqual({ count: 0, total: 0, average: null });
  });
  it.each([NaN, Infinity, -Infinity])('rejects a non-finite input: %s', (value) => {
    expect(() => summarizeNumbers([value])).toThrow(RangeError);
  });
  it('rejects an overflowing total', () => {
    expect(() => summarizeNumbers([Number.MAX_VALUE, Number.MAX_VALUE])).toThrow(RangeError);
  });
});
