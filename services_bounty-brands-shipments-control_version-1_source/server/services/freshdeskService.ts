
import axios from 'axios';

const freshdeskDomain = process.env.FRESHDESK_DOMAIN;
const freshdeskApiKey = process.env.FRESHDESK_API_KEY;

if (!freshdeskDomain || !freshdeskApiKey) {
  console.error('Freshdesk domain and API key are required.');
}

const freshdeskAPI = axios.create({
  baseURL: `https://${freshdeskDomain}/api/v2`,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${Buffer.from(freshdeskApiKey + ':X').toString('base64')}`
  }
});

export const getTickets = async () => {
  try {
    const response = await freshdeskAPI.get('/tickets');
    return response.data;
  } catch (error) {
    console.error('Error fetching tickets from Freshdesk:', error);
    throw error;
  }
};
