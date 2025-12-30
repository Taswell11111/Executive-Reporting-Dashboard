import { OutboundShipment } from './types';

// Simulation date matches the prototype's context (Dec 2025) to ensure "stale" logic works as demonstrated.
export const SIMULATED_TODAY = new Date('2025-12-14');

export const BRANDS = ['All', 'Diesel', 'Hurley', 'Jeep Apparel', 'Reebok', 'Superdry'];

export const STORE_CREDENTIALS = [
  {
    name: 'Diesel',
    username: 'ENgsxyMbeqVGvGzTCpVdkZmsjz/VCDeF+NWHlRk3Hk0=',
    password: 'EuoTNvCvp5imhOR2TZDe/fnKDxfoPK+EORSqfGvafZk=',
    storeId: '7b0fb2ac-51bd-47ea-847e-cfb1584b4aa2'
  },
  {
    name: 'Hurley',
    username: 'CtAAy94MhKTJClgAwEfQL9LfkM14CegkeUbpBfhwt68=',
    password: 'AmlbcKtg1WQsLuivLpjyOTVizNrijZiXY6vVJoT5a1U=',
    storeId: 'a504304c-ad27-4b9b-8625-92a314498e64'
  },
  {
    name: 'Jeep Apparel',
    username: '+w3K5hLq56MQ4ijqFH78lV0xQCTTzP9mNAqToCUL9Cw=',
    password: 'l2+ozGqsA6PX7MSHrl4OMwZRTieKzUpJVWv/WYye8iA=',
    storeId: '80f123d6-f9de-45b9-938c-61c0a358f205'
  },
  {
    name: 'Superdry',
    username: 'zcUrzwFh2QwtH1yEJixFXtUA4XGQyx2wbNVLpYTzZ8M=',
    password: '92Av8tHsbq2XLEZZeRwYNsPFSkca+dD1cwRQs79rooM=',
    storeId: 'b112948b-0390-4833-8f41-47f997c5382c'
  },
  {
    name: 'Reebok',
    username: '9oZ10dMWlyQpEmS0Kw6xhIcKYXw8lB2az3Q0Zb+KBAw=',
    password: 'Cq/Zn86P7FT3EN0C5qzOewAQssyvrDSbkzmQBSAOrMY=',
    storeId: '963f57af-6f46-4d6d-b07c-dc4aa684cdfa'
  }
];

export const INITIAL_OUTBOUND_DATA: OutboundShipment[] = [];