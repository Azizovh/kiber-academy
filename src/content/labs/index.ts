import type { Lab } from '../types';
import { encodings, grepAndPipes, networkRecon } from './analysis';
import { filesAndDirs, firstSteps, permissions } from './basics';
import { httpAudit } from './appsec';
import { cloudTrailInvestigation } from './cloud';
import { webLogInvestigation, windowsEvents } from './soc';
import { bashScripts, processesAndServices, serverAudit } from './sysadmin';

/** Terminal labs in the recommended order. */
export const LABS: Lab[] = [
  firstSteps,
  filesAndDirs,
  encodings,
  grepAndPipes,
  permissions,
  processesAndServices,
  bashScripts,
  networkRecon,
  serverAudit,
  webLogInvestigation,
  windowsEvents,
  httpAudit,
  cloudTrailInvestigation,
];

const index = new Map(LABS.map((lab) => [lab.id, lab]));

export function getLab(id: string): Lab | null {
  return index.get(id) ?? null;
}
