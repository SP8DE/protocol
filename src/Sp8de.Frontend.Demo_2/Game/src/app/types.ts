import {GameFinishResponse} from './api';

export interface Item {
  src: string;
  choice: boolean;
}

export interface Round {
  response: GameFinishResponse;
  player: string;
  bet: number;
  betAmount: number;
  openAdvanced?: boolean;
  type: string;
}

export interface UserInterface {
  name: string;
  token?: string;
  history?: Round[];
  wallets?: {};
  balance: number;
}

export class User implements User {
  constructor(
    public name: string,
    public balance: number,
    public history?: Round[],
    public token?: string,
    public wallets?: {}
  ) {
  }
}
