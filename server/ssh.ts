import { Socket } from 'socket.io';
import { Client } from 'ssh2';

interface Prop {
    host: string;
    port: number;
    username: string;
    password: string;
}
export function createSSH(prop: Prop, socket: Socket) {
    const { host, port, username, password } = prop;
    const ssh = new Client();
    ssh.on('ready', () => {
        socket.send('\r\n*** SSH CONNECTION SUCCESS ***\r\n');
        ssh.shell((err, stream) => {
            if (err) {
                return socket.emit(
                    '\r\n*** SSH SHELL ERROR: ' + err.message + ' ***\r\n'
                );
            }
            socket.on('data', data => {
                stream.write(data);
            });
            stream
                .on('data', (data: ArrayBuffer) => {
                    socket.emit('data', new TextDecoder('utf-8').decode(data));
                })
                .on('close', function () {
                    ssh.destroy();
                });
        });
    })
        .on('close', () => {
            socket.emit('data', '\r\n*** SSH CONNECTION CLOSED ***\r\n');
            socket.disconnect();
        })
        .on('error', err => {
            console.log(err);
            socket.emit(
                'data',
                '\r\n*** SSH CONNECTION ERROR: ' +
                    err.message +
                    ' ***\r\n' +
                    '\r\n*** SSH CONNECTION ERROR: ' +
                    'Your account or password is wrong, please reconnect' +
                    ' ***\r\n'
            );
        })
        .connect({
            host: host,
            port: port,
            username: username,
            password: password
        });
    return ssh;
}
