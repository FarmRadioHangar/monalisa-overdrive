import { Server } from 'ws';
import { Api }    from './src/api';

let wss: Server = new Server({ port: 8780 });

interface Message {
  type: string;
  data?: any;
}

let parse = (json: string): Message => {
  try {
    return JSON.parse(json);
  } catch(err) {
    console.error(err);
    return {type: 'invalid'};
  }
}

wss.on('connection', (ws): void => {
  ws.on('message', (json: string): void => {
    const message: Message = parse(json);
    switch (message.type) {
      case 'get-campaigns':
        Api.stream('trees', (body: any) => {
          ws.send(JSON.stringify({
            type: 'trees',
            data: {
              trees: body.data.trees
            }
          }));
        });
        break;
      case 'invalid':
        console.error('Invalid WebSocket message received.');
        break;
      default:
        console.warn(`Message type "${message.type}" lacks a matching implementation.`);
    }
  });
});
