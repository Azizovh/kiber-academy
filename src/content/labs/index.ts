import type { Lab } from '../types';
import { encodings, grepAndPipes, networkRecon } from './analysis';
import { filesAndDirs, firstSteps, permissions } from './basics';
import { httpAudit } from './appsec';
import { cloudTrailInvestigation } from './cloud';
import { webLogInvestigation, windowsEvents } from './soc';
import { bashScripts, processesAndServices, serverAudit } from './sysadmin';
import { winAudit, winBasics, winIncident } from './windows';
import { trafficBasics, trafficCleartext, trafficIncident } from './traffic';
import { containerAudit, dockerBasics, k8sIncident } from './containers';
import { codeSecurity, gitBasics, gitSecrets } from './code';
import { splBasics } from './siem';
import { siemIncident } from './siemIncident';
import { sigmaLab } from './detection';
import { networkDetection } from './network';
import { yaraHunt } from './yaraLab';

export interface LabGroup {
  id: string;
  title: string;
  /** One sentence: what this group trains. */
  text: string;
  labs: Lab[];
}

/** Labs grouped by direction, in the recommended order (groups and labs inside them: easy to hard). */
export const LAB_GROUPS: LabGroup[] = [
  {
    id: 'linux',
    title: 'Linux asoslari',
    text: "Terminal, fayllar, ruxsatlar, jarayonlar va xizmatlar, bash skriptlar va server auditi.",
    labs: [firstSteps, filesAndDirs, permissions, processesAndServices, bashScripts, serverAudit],
  },
  {
    id: 'loglar',
    title: 'Matn, kodlash va loglar',
    text: "grep va quvurlar, Base64 va xeshlar, veb-server va Windows hodisalari loglarini tahlil qilish.",
    labs: [grepAndPipes, encodings, webLogInvestigation, windowsEvents],
  },
  {
    id: 'tarmoq',
    title: 'Tarmoq va trafik',
    text: "Tarmoqni o'rganish, tcpdump va tshark bilan trafik tahlili: odatiy trafik, ochiq parollar, hujum.",
    labs: [networkRecon, trafficBasics, trafficCleartext, trafficIncident],
  },
  {
    id: 'siem',
    title: 'SIEM va aniqlash',
    text: "Splunk SPL va Sentinel KQL bilan qidiruv, hujumni SIEM'da tiklash, Sigma, Suricata, Zeek va YARA bilan aniqlash.",
    labs: [splBasics, siemIncident, sigmaLab, networkDetection, yaraHunt],
  },
  {
    id: 'windows',
    title: 'Windows (PowerShell)',
    text: "PowerShell asoslari, Windows server auditi va RDP orqali kirgan hujumchiga javob.",
    labs: [winBasics, winAudit, winIncident],
  },
  {
    id: 'kod',
    title: 'Web va kod xavfsizligi',
    text: "HTTP auditi, git tarixini tergov qilish, repozitoriydagi sirlar, SAST va bog'liqliklar.",
    labs: [httpAudit, gitBasics, gitSecrets, codeSecurity],
  },
  {
    id: 'bulut',
    title: 'Konteynerlar va bulut',
    text: "Docker asoslari va xavfsizligi, Kubernetes insidenti, CloudTrail tergovi.",
    labs: [dockerBasics, containerAudit, k8sIncident, cloudTrailInvestigation],
  },
];

/** Terminal labs in the recommended order (group by group). */
export const LABS: Lab[] = LAB_GROUPS.flatMap((g) => g.labs);

const index = new Map(LABS.map((lab) => [lab.id, lab]));

export function getLab(id: string): Lab | null {
  return index.get(id) ?? null;
}
