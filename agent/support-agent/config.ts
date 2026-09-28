/** Domain comes from project metadata, not from guessing customer identifiers. */
import {readFileSync} from 'node:fs';
export const domain: string = JSON.parse(readFileSync(new URL('../agent.json', import.meta.url), 'utf8')).domain;
