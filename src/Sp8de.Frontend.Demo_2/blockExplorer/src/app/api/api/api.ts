export * from './blocks.service';
import { BlocksService } from './blocks.service';
export * from './latest.service';
import { LatestService } from './latest.service';
export * from './transactions.service';
import { TransactionsService } from './transactions.service';
export const APIS = [BlocksService, LatestService, TransactionsService];
