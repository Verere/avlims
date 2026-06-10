import { LabTest } from './test';

export type CartItem = {
  test: LabTest;
  quantity: number;
  panel?: {
    id: string;
    name: string;
    price: number;
  };
};
