import React, { useEffect, useState } from 'react';

function PageWrapper({ children }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Force a microtask delay to ensure proper rendering
    setIsReady(true);
  }, []);

  if (!isReady) {
    return null; // Or return a loading spinner
  }

  return <>{children}</>;
}

export default PageWrapper;
