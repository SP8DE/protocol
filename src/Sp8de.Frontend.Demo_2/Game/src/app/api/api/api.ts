export * from './account.service';
import { AccountService } from './account.service';
export * from './demoGame.service';
import { DemoGameService } from './demoGame.service';
export * from './ping.service';
import { PingService } from './ping.service';
export const APIS = [AccountService, DemoGameService, PingService];
