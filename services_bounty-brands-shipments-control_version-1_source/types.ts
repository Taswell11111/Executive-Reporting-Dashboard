
export interface OutboundShipment {
  id: string;
  orderId: string;
  sourceStoreOrderId: string;
  brand: string;
  date: string;
  tracking: string;
  courier: string;
  status: string;
  statusDate: string;
  customer: string;
  city: string;
  item: string;
  address: string;
  daysOpen?: number;
  channelId?: string; // Added field
}

export interface InboundReturn {
  returnId: string;
  sourceShipmentId: string;
  brand: string;
  date: string;
  reference: string;
  tracking: string;
  courier: string;
  status: string;
  statusDate: string;
  customer: string;
  item: string;
  qty: string;
}

export type ViewType = 'dashboard' | 'outbound' | 'inbound' | 'freshdesk';

export interface SortConfig {
  key: string;
  dir: 'asc' | 'desc';
}

export interface DateRange {
  start: string;
  end: string;
}

export interface FilterState {
  brand: string;
  search: string;
  dateRange: DateRange;
}

export interface UploadInfo {
  loaded: boolean;
  timestamp: string;
  loading: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'alert';
  read: boolean;
}

// API Types
export interface ApiStatus {
  code: number;
  timeStamp: string;
  description: string;
}

export interface ApiDeliveryInfo {
  customer: string;
  contactNo?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  suburb?: string;
  postalCode?: string;
  courierName?: string;
  trackingNo?: string;
}

export interface ApiItem {
  itemNo: string;
  name: string;
  qty: number;
}

export interface ApiOutbound {
  id: number;
  clientId: string;
  channelId: string; // Added field
  createDate: string;
  status: ApiStatus;
  deliveryInfo: ApiDeliveryInfo;
  items?: ApiItem[]; // items might be missing in summary, present in detail
}

export interface ApiInbound {
  id: number;
  clientId: string;
  createDate: string;
  status: ApiStatus;
  deliveryInfo: ApiDeliveryInfo;
  supplierReference?: string;
  items?: ApiItem[];
}
