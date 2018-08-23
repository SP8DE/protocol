import {TestBed, inject} from '@angular/core/testing';

import {HistoryService} from './history.service';

describe('HistoryService', () => {
  const record = {
    response: {
      'gameId': '38ee988f75b648c19c473e56b84c0ca9',
      'winNumbers': [1],
      'winAmount': 100.0,
      'items': [{
        'seed': 4040220625,
        'pubKey': '0xe0050fe7be34f4cf5f1e558ce3cb411e9b3bd05a',
        'nonce': 1533732058509,
        'sign': '0x50022d3dc78c2e18eef33b2349ddba0ff4801b9406a282ddccc203da42d505552ece4e9b4e69b1b5606eff827f834dea5e7a54f70d22887dd9f35629534333ee1c'
      }, {
        'seed': 1,
        'pubKey': '0x4619284a395b3959bFDE0251207b92EFA53a8500',
        'nonce': 1,
        'sign': '0xd7856f3065716ec57f226caf2c8456fb86890244d6e2d153c90265a5c957ef5b6d7f3d544b38cef5bd9dda5ede58d63c7868cccab136caded72d06425264ef851c'
      }, {
        'seed': 1,
        'pubKey': '0x492d0fd814940d1375225a7e10905585b72b0a8c',
        'nonce': 1,
        'sign': '0xe2f4cd56aaec60229ee9c53731f609aa8468bcae72bcc2ba82a1bafb9482f32e41c87e3f008f5dcc18eccc71fcdc6699990c9edb6fb100c165395983f50730741b'
      }],
      'sharedSeedHash': '0xdbabc616836c49b992535a1855acf4a5f8321bdb11db93b182b3561ad7173f58eff0abf18b7fc890adafaa1b4bb1f8da',
      'sharedSeedArray': [382118875, 3108596867, 408572818, 2784275541, 3675992824, 2979257105, 441889666, 1480529879, 4054577391, 2429058955, 464170925, 3673731403],
      'validationTxHash': '0x1234567890',
      'isWinner': true
    },
    player: 'name',
    bet: 1,
    betAmount: 100
  };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HistoryService]
    });
  });

  it('should be created', inject([HistoryService], (service: HistoryService) => {
    expect(service).toBeTruthy();
  }));
  describe('Clear history', () => {
    it('clearHistory should be defined', inject([HistoryService], (service: HistoryService) => {
      expect(service.clearHistory).toBeDefined();
    }));
    it('clearHistory should be removing clearing array', inject([HistoryService], (service: HistoryService) => {
      service.clearHistory();
      expect(service.getList()).toEqual([]);
    }));
  });
  describe('Set record', () => {
    it('setRecord should be defined', inject([HistoryService], (service: HistoryService) => {
      expect(service.setRecord).toBeDefined();
    }));
    it('setRecord should be adding record', inject([HistoryService], (service: HistoryService) => {
      service.clearHistory();
      service.setRecord(record);
      expect(service.getList()[0]).toEqual(record);
    }));
  });
  describe('Get list', () => {
    it('getList should be defined', inject([HistoryService], (service: HistoryService) => {
      expect(service.getList).toBeDefined();
    }));
    it('getList should be return contains records', inject([HistoryService], (service: HistoryService) => {
      const n = 10;
      service.clearHistory();
      for (let i = 0; i < n; i++) {
        service.setRecord(record);
      }
      const list = service.getList();
      for (let i = 0; i < n; i++) {
        expect(list[i]).toEqual(record);
      }
    }));
  });
});
