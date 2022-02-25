import express from 'express';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import { Client } from 'ssh2';
import formidable from 'formidable';
import http from 'http';
import { createSSH } from './ssh';

const clientMap = new Map<string, Client>();

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});

app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', '*');
    next();
});
app.post('/ssh', (req, res) => {
    const id = nanoid();
    const body = req.body;
    // socketio 内置了心跳检测 不必担心namespace没有释放
    const namespace = io.of(`/${id}`);
    namespace.on('connection', socket => {
        const ssh = createSSH(body, socket);
        clientMap.set(id, ssh);
        // 当然，总有些情况浏览器不会给我们发送关闭连接请求，因此我们需要在socket关闭的时候关闭ssh
        socket.on('disconnect', () => {
            ssh.destroy();
        });
    });
    res.send(id.toString());
    res.end();
});

// 浏览器关闭时 关闭ssh
app.post('/closessh', (req, res) => {
    const ssh = clientMap.get(req.body.id);
    if (!ssh) {
        res.end();
    } else {
        ssh.destroy();
        res.end();
    }
});

// 由于 formidable v1版本不在维护 所以不使用 express-formidable
app.post('/fileupload', (req, res) => {
    const form = formidable();
    form.parse(req, (err, fields, files) => {
        if (err) {
            res.end(err.message);
            return;
        }
        const id = fields!.id as string;
        const path = fields!.path as string;
        const file = files!.file as formidable.File;
        const ssh = clientMap.get(id)!

        ssh?.sftp((err, sftp) => {
            if (err) {
                res.end(err.message);
            }
            sftp.fastPut(
                file.filepath,
                `${path}/${file.originalFilename}`,
                err => {
                    if (err) console.log(err);
                }
            );
        });
        res.end();
    });
});

server.listen(8080, () => {
    console.log('listening on port 8080');
});

// webssh
// app.post('/terminal', (req, res) => {
//     const term = createTerminal();
//     const {pid} = term;
//     const namespace = io.of(`/${pid}`);
//     namespace.on('connection', socket => {
//         term.onData((data: any) => {
//             socket.emit('data', data);
//         });
//         socket.on('data', message => {
//             console.log(message);
//             term.write(message);
//         });
//         console.log(`${pid} connected` );
//     });
//     res.send(pid.toString());
//     res.end();
// });
