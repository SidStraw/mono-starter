import { expect, expectTypeOf, test } from 'vite-plus/test';
import { summarizeNumbers, type NumberSummary } from '@starter/core';

test('consumes the public package exports and declarations', () => {
  expect(summarizeNumbers([2, 4, 6])).toEqual({ count: 3, total: 12, average: 4 });
  expectTypeOf(summarizeNumbers).parameter(0).toEqualTypeOf<readonly number[]>();
  expectTypeOf(summarizeNumbers).returns.toEqualTypeOf<NumberSummary>();
});
