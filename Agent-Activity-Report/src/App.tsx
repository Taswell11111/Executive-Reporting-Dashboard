import React, { useState, useEffect } from 'react';
function App() {
  const [agents, setAgents] = useState([]);
  useEffect(() => {
    fetch('/api/v2/agents')
      .then(res => res.json())
      .then(data => setAgents(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, []);
  return (
    <div style={{padding: '20px'}}>
      <h1>Freshdesk Agents</h1>
      <ul>{agents.map((a:any) => <li key={a.id}>{a.contact.name}</li>)}</ul>
    </div>
  );
}
export default App;
