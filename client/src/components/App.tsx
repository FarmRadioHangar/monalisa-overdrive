import * as React from 'react';

export interface AppProps {}

export interface AppState {
  trees: Array<any>;
};

var ws: any;

export class App extends React.Component<AppProps, AppState> {

  constructor(props: AppProps) {
    super(props);
    this.state = {
      trees: []
    };

    ws = new WebSocket('ws://localhost:8780');

    ws.onopen = (): void => this.fetchCampaigns();
      
    ws.onmessage = (ev: MessageEvent): void => {
      var message: any;
      try {
        message = JSON.parse(ev.data);
      } catch(err) {
        console.error(err);
        return;
      }
      if ('trees' === message.type) {
        this.setState({
          trees: this.state.trees.concat(message.data.trees)
        });
      }
    }

  }

  fetchCampaigns(): void {
    ws.send(JSON.stringify({
      type: 'get-campaigns'
    }));
    console.log('message sent!');
  }

  render(): JSX.Element {
    const { trees } = this.state;
    return (
      <table>
        <thead>
          <tr>
            <th>Trees</th>
          </tr>
        </thead>
        <tbody>
          {trees.map((tree: any, i: number) => 
            <tr key={i}>
              <td>
                {tree.id}
              </td>
              <td>
                {tree.title}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  }

}
