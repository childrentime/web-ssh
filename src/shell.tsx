import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { Button, Form, Input, message } from 'antd';
import io from 'socket.io-client';
import axios from 'axios';
import 'xterm/css/xterm.css';
import './shell.css';

interface LoginProp {
    host: string;
    port: number;
    username: string;
    password: string;
}
export default function Shell() {
    const ref = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [terminal, setTerminal] = useState<Terminal>();
    const [connexted, setConnexted] = useState<Boolean>(false);
    const [id, setId] = useState<string>();
    const [path, setPath] = useState<string>();
    const [form] = Form.useForm();

    const onFinish = (values: any) => {
        connectWebSocket(values);
    };

    const copyShortcut = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
            e.preventDefault();
            document.execCommand('copy');
            return false;
        }
        return true;
    };

    const disconnect = async () => {
        await axios.post('http://localhost:8080/closessh', { id });
        setConnexted(false);
        setId('');
    };

    const disconnectListener = (id: string) => {
        window.addEventListener('unload', (event: Event) => {
            fetch('http://localhost:8080/closessh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body: JSON.stringify({ id }),
                keepalive: true
            });
        });
    };

    const pathListener = (data: string) => {
        if (data.indexOf(']') !== -1 && data.length !== 1) {
            const index = data.lastIndexOf(']');
            let path = '';
            let i = index - 1;
            while (data[i] !== ' ' && i >= 0) {
                path = data[i].concat(path);
                i--;
            }
            if (path === '~') {
                path = '/root';
            } else if (path === '/') {
                path = '/';
            } else {
                path = '/'.concat(path);
            }
            setPath(path);
        }
    };

    const connectWebSocket = async (data: LoginProp) => {
        const res = await axios.post('http://localhost:8080/ssh', data);
        const { data: id } = res;
        disconnectListener(id);
        const ws = io(`http://localhost:8080/${id}`);
        ws.on('data', data => {
            terminal?.write(data);
            pathListener(data);
        });
        terminal?.onData(val => {
            ws.emit('data', val);
        });
        setId(id);
        setConnexted(true);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        /*获取到文件对象*/
        const file = event.target.files![0];
        const formData = new FormData();
        formData.append('id', id!);
        formData.append('path', path!);
        formData.append('file', file);
        axios
            .post('http://localhost:8080/fileupload', formData)
            .then(() => {
                message.info('上传成功');
            })
            .catch(err => {
                message.error(
                    '上传失败，请刷新重试，或者检查服务器是否开启对应权限'
                );
            });
    };

    useEffect(() => {
        // 创建terminal实例
        const terminal = new Terminal({
            allowTransparency: true,
            fontFamily:
                'operator mono,SFMono-Regular,Consolas,Liberation Mono,Menlo,monospace',
            fontSize: 14,
            theme: {
                background: '#15171C',
                foreground: '#ffffff73',
                cursor: 'gray' // 设置光标
            },
            disableStdin: false,
            cursorStyle: 'underline', // 光标样式
            cursorBlink: true, // 光标闪烁
            windowsMode: true // 自动换行
        });

        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.loadAddon(new WebLinksAddon());
        terminal.attachCustomKeyEventHandler(copyShortcut);
        terminal.open(ref.current!);

        fitAddon.fit();

        setTerminal(terminal);
    }, []);
    return (
        <div className="shellContainer">
            <div className="shellForm">
                <div className="shellFormStyle">
                    {!connexted ? (
                        <Form form={form} layout="inline" onFinish={onFinish}>
                            <Form.Item
                                name="host"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Please input your host'
                                    }
                                ]}
                            >
                                <Input placeholder="Host" />
                            </Form.Item>
                            <Form.Item
                                name="port"
                                rules={[
                                    {
                                        required: true,
                                        type: 'number',
                                        transform(value) {
                                            if (value) {
                                                return Number(value);
                                            }
                                        },
                                        message: 'Please input number'
                                    }
                                ]}
                            >
                                <Input placeholder="Port" />
                            </Form.Item>
                            <Form.Item
                                name="username"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Please input your username'
                                    }
                                ]}
                            >
                                <Input placeholder="Username" />
                            </Form.Item>
                            <Form.Item
                                name="password"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Please input your password!'
                                    }
                                ]}
                            >
                                <Input type="password" placeholder="Password" />
                            </Form.Item>
                            <Form.Item>
                                <Button type="primary" htmlType="submit">
                                    Connect
                                </Button>
                            </Form.Item>
                        </Form>
                    ) : (
                        <div>
                            <input
                                style={{ display: 'none' }}
                                type="file"
                                ref={fileInputRef}
                                onChange={event => {
                                    handleFileChange(event);
                                }}
                            />
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                            >
                                上传文件
                            </Button>
                            <Button
                                onClick={() => disconnect()}
                                style={{ marginLeft: 20 }}
                            >
                                断开连接
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            <div className="shell" ref={ref}></div>
        </div>
    );
}
