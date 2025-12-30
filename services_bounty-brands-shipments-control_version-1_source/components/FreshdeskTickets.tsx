
import React, { useEffect, useState } from 'react';

const FreshdeskTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await fetch('/api/freshdesk/tickets');
        if (!response.ok) {
          throw new Error('Failed to fetch tickets');
        }
        const data = await response.json();
        setTickets(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  if (loading) {
    return <div>Loading tickets...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Freshdesk Tickets</h1>
      <ul>
        {tickets.map((ticket: any) => (
          <li key={ticket.id}>{ticket.subject}</li>
        ))}
      </ul>
    </div>
  );
};

export default FreshdeskTickets;
