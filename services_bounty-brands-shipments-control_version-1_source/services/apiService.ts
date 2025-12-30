import { STORE_CREDENTIALS, SIMULATED_TODAY } from '../constants';
import { ApiOutbound, ApiInbound, OutboundShipment, InboundReturn } from '../types';

const BASE_URL = 'https://storeapi.parcelninja.com/api/v1';
const CORS_PROXY = 'https://corsproxy.io/?';

// --- Date Helpers ---
const parsePnDate = (pnDate: string): Date | null => {
  if (!pnDate || pnDate.length < 14) return null;
  const y = parseInt(pnDate.substring(0, 4));
  const m = parseInt(pnDate.substring(4, 6)) - 1; 
  const d = parseInt(pnDate.substring(6, 8));
  const h = parseInt(pnDate.substring(8, 10));
  const min = parseInt(pnDate.substring(10, 12));
  const s = parseInt(pnDate.substring(12, 14));
  return new Date(y, m, d, h, min, s);
};

const formatDate = (pnDate: string | Date): string => {
  let date: Date | null;
  if (typeof pnDate === 'string') {
    date = parsePnDate(pnDate);
  } else {
    date = pnDate;
  }
  
  if (!date) return typeof pnDate === 'string' ? pnDate : '-';
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const toApiDateParam = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = date.getUTCDate().toString().padStart(2, '0');
  return `${y}${m}${d}`;
};

const getAuthHeader = (username: string, password: string) => {
  return {
    'Authorization': 'Basic ' + btoa(`${username}:${password}`),
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
};

// --- Mock Data Generators (Exported for App usage) ---
export const generateMockOutbounds = (brand: string): OutboundShipment[] => {
  // Updated list to include all specific tabs requested
  const statuses = [
      'CREATED', 'EXCEPTION', 'AWAITING_STOCK', 'IN_PICKING_QUEUE', 'IN_PACKING_QUEUE',
      'PACKED', 'SHIPPED', 'DELIVERED', 'FAILED_DELIVERY_ATTEMPT', 'ON_HOLD',
      'COURIER_CANCELLED', 'IN_VALIDATION'
  ];
  const couriers = ['CourierIT', 'Dawn Wing', 'The Courier Guy'];
  
  return Array.from({ length: 15 }).map((_, i) => {
    const daysOffset = Math.floor(Math.random() * 5); 
    const date = new Date(SIMULATED_TODAY);
    date.setDate(date.getDate() - daysOffset);
    date.setHours(8 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60));
    
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const isCompleted = status === 'DELIVERED' || status === 'SHIPPED';
    
    // Inject H10545 for testing
    let channelId = `CH-${brand.substring(0,1)}`;
    if (brand === 'Hurley' && i === 0) channelId = 'H10545';

    return {
      id: `MOCK-${brand.substring(0,3).toUpperCase()}-${1000 + i}`,
      orderId: `ORD-${20000 + i}`,
      sourceStoreOrderId: `SHP-${20000 + i}`, 
      brand: brand,
      date: formatDate(date),
      tracking: isCompleted ? `TRK${Math.floor(Math.random() * 999999)}` : '',
      courier: isCompleted ? couriers[Math.floor(Math.random() * couriers.length)] : 'Pending',
      status: status,
      statusDate: formatDate(date),
      customer: `Simulated User ${i + 1}`,
      city: ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria'][Math.floor(Math.random() * 4)],
      item: `${1 + Math.floor(Math.random() * 2)}x Mock Item for ${brand}`,
      address: '123 Simulation Ave, Tech Park',
      channelId: channelId
    };
  });
};

export const generateMockInbounds = (brand: string): InboundReturn[] => {
  // Updated list to include requested Inbound tabs
  const statuses = [
      'CREATED', // Initiated
      'SCHEDULED_FOR_PICKUP',
      'AWAITING_ARRIVAL',
      'COURIER_EN_ROUTE',
      'PROCESSING_COMPLETE',
      'PROCESSING_COMPLETE_WITH_VARIANCE',
      'FAILED', // Kept for internal logic, though tab removed
      'COMPLETED'
  ];
  
  return Array.from({ length: 10 }).map((_, i) => {
    const daysOffset = Math.floor(Math.random() * 10);
    const date = new Date(SIMULATED_TODAY);
    date.setDate(date.getDate() - daysOffset);
    
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    return {
      returnId: `RET-${brand.substring(0,3).toUpperCase()}-${5000 + i}`,
      sourceShipmentId: `SHP-${20000 + i}`,
      brand: brand,
      date: formatDate(date),
      reference: `RMA-${brand.substring(0,1)}-${5000 + i}`,
      tracking: status === 'COMPLETED' ? `WAY${Math.floor(Math.random() * 999999)}` : (Math.random() > 0.7 ? '' : `WAY${Math.floor(Math.random() * 999999)}`),
      courier: 'CourierIT',
      status: status,
      statusDate: formatDate(date),
      customer: `Return Customer ${i + 1}`,
      item: `Returned Item ${i + 1}`,
      qty: '1'
    };
  });
};

// --- Robust Fetcher ---
const fetchWithFallback = async <T>(
  url: string, 
  headers: any, 
  context: string, 
  mockGenerator: () => T
): Promise<T> => {
  try {
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl, { headers });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new Error('Auth Failed');
      if (response.status === 404) throw new Error('Not Found');
      if (response.status === 429) throw new Error('Rate Limit');
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();

  } catch (error: any) {
    console.warn(`[${context}] Fetch failed (${error.message}). Switching to Mock/Empty.`);
    return mockGenerator();
  }
};

const getCommonParams = (storeId: string) => {
  const endDate = new Date(); 
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  return `startDate=${toApiDateParam(startDate)}&endDate=${toApiDateParam(endDate)}&storeId=${storeId}&pageSize=10&col=4&colOrder=desc`; 
};

// --- Single Item Resolvers (for Quick Search) ---

// Helper to normalize outbound API data to our Type
const mapApiOutboundToType = (apiData: ApiOutbound, storeName: string): OutboundShipment => {
    const itemDetails = apiData.items && apiData.items.length > 0
        ? apiData.items.map(i => `${i.qty}x ${i.name}`).join(', ')
        : 'No Items';
        
    return {
        id: apiData.id.toString(),
        orderId: apiData.clientId,
        sourceStoreOrderId: apiData.clientId, // Usually mapped here
        brand: storeName,
        channelId: apiData.channelId,
        date: formatDate(apiData.createDate),
        tracking: apiData.deliveryInfo.trackingNo || '',
        courier: apiData.deliveryInfo.courierName || 'Pending',
        status: apiData.status.description.toUpperCase().replace(/\s+/g, '_'),
        statusDate: formatDate(apiData.status.timeStamp),
        customer: apiData.deliveryInfo.customer,
        city: apiData.deliveryInfo.suburb || apiData.deliveryInfo.addressLine2 || '',
        item: itemDetails,
        address: `${apiData.deliveryInfo.addressLine1 || ''} ${apiData.deliveryInfo.addressLine2 || ''}`.trim()
    };
};

const mapApiInboundToType = (apiData: ApiInbound, storeName: string): InboundReturn => {
    const itemDetails = apiData.items && apiData.items.length > 0
        ? apiData.items.map(i => `${i.qty}x ${i.name}`).join(', ')
        : 'No Items';

    return {
        returnId: apiData.clientId,
        sourceShipmentId: apiData.supplierReference || '-',
        brand: storeName,
        date: formatDate(apiData.createDate),
        reference: apiData.supplierReference || apiData.id.toString(),
        tracking: apiData.deliveryInfo.trackingNo || '',
        courier: apiData.deliveryInfo.courierName || 'Pending',
        status: apiData.status.description.toUpperCase().replace(/\s+/g, '_'),
        statusDate: formatDate(apiData.status.timeStamp),
        customer: apiData.deliveryInfo.customer, // Mapped to customer as requested
        item: itemDetails,
        qty: apiData.items ? apiData.items.reduce((acc, i) => acc + i.qty, 0).toString() : '0'
    };
}

// Search Functionality
export const findOutboundByRef = async (searchTerm: string): Promise<OutboundShipment | null> => {
    // We must search across all stores because we don't know the brand context
    for (const store of STORE_CREDENTIALS) {
        const headers = getAuthHeader(store.username, store.password);
        // Wide date range for search
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1); // Look back 1 year
        
        // Using 'filter' param which usually searches across ref/client ID
        const params = `startDate=${toApiDateParam(startDate)}&endDate=${toApiDateParam(endDate)}&storeId=${store.storeId}&filter=${encodeURIComponent(searchTerm)}&pageSize=1`;
        const url = `${BASE_URL}/outbounds?${params}`;
        
        try {
            const rawData = await fetchWithFallback(url, headers, `Search-Out-${store.name}`, () => ({ outbounds: [] }));
            const results = (rawData as any).outbounds || [];
            
            if (results.length > 0) {
                // Fetch detail for the first match
                const summary = results[0];
                const detailUrl = `${BASE_URL}/outbounds/${summary.id}/events`;
                const detailedData = await fetchWithFallback(detailUrl, headers, `Detail-Search-${summary.id}`, () => summary);
                return mapApiOutboundToType(detailedData, store.name);
            }
        } catch (e) {
            continue; // Try next store
        }
    }
    return null;
};

export const findInboundByRef = async (searchTerm: string): Promise<InboundReturn | null> => {
    for (const store of STORE_CREDENTIALS) {
        const headers = getAuthHeader(store.username, store.password);
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        
        const params = `startDate=${toApiDateParam(startDate)}&endDate=${toApiDateParam(endDate)}&storeId=${store.storeId}&filter=${encodeURIComponent(searchTerm)}&pageSize=1`;
        const url = `${BASE_URL}/inbounds?${params}`;
        
        try {
            const rawData = await fetchWithFallback(url, headers, `Search-In-${store.name}`, () => ({ inbounds: [] }));
            const results = (rawData as any).inbounds || [];
            
            if (results.length > 0) {
                const summary = results[0];
                const detailUrl = `${BASE_URL}/inbounds/${summary.id}/events`;
                const detailedData = await fetchWithFallback(detailUrl, headers, `Detail-Search-In-${summary.id}`, () => summary);
                return mapApiInboundToType(detailedData, store.name);
            }
        } catch (e) {
            continue;
        }
    }
    return null;
};


// --- Bulk Store Fetchers ---

export const fetchStoreOutbounds = async (store: typeof STORE_CREDENTIALS[0]): Promise<OutboundShipment[]> => {
  const headers = getAuthHeader(store.username, store.password);
  const params = getCommonParams(store.storeId);
  const url = `${BASE_URL}/outbounds?${params}`;

  const rawData = await fetchWithFallback(
    url, 
    headers, 
    `Outbounds-${store.name}`,
    () => [] as ApiOutbound[]
  );

  let summaries: ApiOutbound[] = (rawData as any).outbounds || rawData;

  if (!Array.isArray(summaries) || summaries.length === 0) {
    return []; // Return empty, App.tsx handles mock fallback if enabled
  }

  const detailedPromises = summaries.map(async (summary) => {
    try {
      const detailUrl = `${BASE_URL}/outbounds/${summary.id}/events`;
      const detailedData: ApiOutbound = await fetchWithFallback(
        detailUrl, 
        headers, 
        `Detail-${summary.id}`, 
        () => summary
      );
      return mapApiOutboundToType(detailedData, store.name);
    } catch (e) {
       return mapApiOutboundToType(summary, store.name);
    }
  });

  return Promise.all(detailedPromises);
};

export const fetchStoreInbounds = async (store: typeof STORE_CREDENTIALS[0]): Promise<InboundReturn[]> => {
  const headers = getAuthHeader(store.username, store.password);
  const params = getCommonParams(store.storeId);
  const url = `${BASE_URL}/inbounds?${params}`;

  const rawData = await fetchWithFallback(
    url, 
    headers, 
    `Inbounds-${store.name}`,
    () => [] as ApiInbound[]
  );

  let summaries: ApiInbound[] = (rawData as any).inbounds || rawData;

  if (!Array.isArray(summaries) || summaries.length === 0) {
    return [];
  }

  const detailedPromises = summaries.map(async (summary) => {
    try {
      const detailUrl = `${BASE_URL}/inbounds/${summary.id}/events`;
      const detailedData: ApiInbound = await fetchWithFallback(
        detailUrl, 
        headers, 
        `InboundDetail-${summary.id}`,
        () => summary
      );
      return mapApiInboundToType(detailedData, store.name);
    } catch (e) {
      return mapApiInboundToType(summary, store.name);
    }
  });

  return Promise.all(detailedPromises);
};

// --- Main Exporters ---

export const fetchAllOutbounds = async (): Promise<OutboundShipment[]> => {
  const allPromises = STORE_CREDENTIALS.map(store => fetchStoreOutbounds(store));
  const results = await Promise.all(allPromises);
  return results.flat().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const fetchAllInbounds = async (): Promise<InboundReturn[]> => {
  const allPromises = STORE_CREDENTIALS.map(store => fetchStoreInbounds(store));
  const results = await Promise.all(allPromises);
  return results.flat().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};