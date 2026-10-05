import { summarizeNumbers } from '@starter/core';
import './style.css';

const summary = summarizeNumbers([2, 4, 6]);
const output = document.querySelector<HTMLOutputElement>('#summary');
if (!output) throw new Error('Summary output is missing');
output.textContent = `${summary.count} values · total ${summary.total} · average ${summary.average}`;
output.dataset['total'] = String(summary.total);
