import React from 'react';

const Offline: React.FC = () => {
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>You're Offline</h1>
      <p>Please check your internet connection and try again.</p>
      <button onClick={() => window.location.reload()}>Retry</button>
    </div>
  );
};

export default Offline;