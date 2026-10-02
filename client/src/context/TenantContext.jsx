import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [sites, setSites] = useState([]);
  const [tenant, setTenant] = useState('unified'); // 'unified' | site.key
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.sites()
      .then((d) => setSites(d.sites))
      .catch(() => setSites([]))
      .finally(() => setLoading(false));
  }, []);

  const currentSite = sites.find((s) => s.key === tenant) || null;

  return (
    <TenantContext.Provider value={{ sites, tenant, setTenant, currentSite, loading }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
