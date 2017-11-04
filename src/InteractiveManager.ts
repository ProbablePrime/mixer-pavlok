import { GameClient, IButton, IControl, setWebSocket } from 'beam-interactive-node2';
import { EventEmitter } from 'events';
import * as WebSocket from 'ws';

setWebSocket(WebSocket);

export class InteractiveManager extends EventEmitter {
    private interactive = new GameClient();
    constructor(private token: string, private id: number) {
        super();
        // this.interactive.on('message', (err: any) => console.log('<<<', err));
        // this.interactive.on('send', (err: any) => console.log('>>>', err));
    }

    public init(): Promise<void> {
        return this.interactive.open({
            versionId: this.id,
            authToken: this.token,
        })
        .then(() => this.interactive.synchronizeState())
        .then(() => this.createControls())
        .then(controls => this.setupEvents(controls))
        .then(() => this.interactive.ready(true))
        .then(() => { /* */})
        .catch(err => console.log(err));
    }

    private createControls(): Promise<IControl[]> {
        const controls = require('../config/controls.json'); //tslint:disable-line: no-require-imports
        return this.interactive.state.getScene('default').createControls(controls);
    }

    private setupEvents(controls: IControl[]) {
        controls.forEach((control: IButton) => {
            control.on('mousedown', (inputEvent, participant) => {
                if (inputEvent.transactionID) {
                    this.interactive.captureTransaction(inputEvent.transactionID)
                    .then(() => {
                        if (!control.meta) {
                            return;
                        }
                        const action = control.meta.action.value;
                        const strength = Number(control.meta.strength.value);
                        if (!action || !strength) {
                            return;
                        }
                        this.emit(<string> control.meta.action.value, control.meta.strength.value);
                        console.log(`Charged ${participant.username} ${control.cost} sparks!`);
                        control.setCooldown(strength * 5000);
                    })
                    .catch(err => console.log(err));
                }
            });
        });
    }
}
