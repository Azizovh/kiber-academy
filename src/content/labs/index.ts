import type { Lab } from '../types';
import { encodings, grepAndPipes, networkRecon } from './analysis';
import { filesAndDirs, firstSteps, permissions } from './basics';

/** Terminal labs in the recommended order. */
export const LABS: Lab[] = [firstSteps, filesAndDirs, encodings, grepAndPipes, permissions, networkRecon];

const index = new Map(LABS.map((lab) => [lab.id, lab]));

export function getLab(id: string): Lab | null {
  return index.get(id) ?? null;
}
