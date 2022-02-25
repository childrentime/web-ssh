import { IPty } from 'node-pty';
import os from 'os';
import * as pty from 'node-pty';


const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
export function createTerminal() {
    const term: IPty = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: process.env.HOME,
    });
    return term;
}
