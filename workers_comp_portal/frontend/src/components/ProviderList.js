import React, { useState, useEffect } from 'react';

const ProviderList = ({ orderId }) => {
  const [providers, setProviders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProviders = async () => {
      if (!orderId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/orders/${orderId}/providers`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch providers');
        }
        const data = await response.json();
        setProviders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, [orderId]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm">
        {error}
      </div>
    );
  }

  if (!providers) {
    return null;
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Nearby Providers
      </h3>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            Patient Location: {providers.patient_location.address}
          </p>
        </div>
        
        <ul className="divide-y divide-gray-200">
          {providers.providers.map((provider, index) => (
            <li key={provider.PrimaryKey} className="px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {provider['DBA Name Billing Name']}
                  </h4>
                  <div className="mt-1 text-sm text-gray-500">
                    <p>TIN: {provider.TIN}</p>
                    <p>{provider.City}, {provider.State}</p>
                    <p>Network: {provider['Provider Network']}</p>
                    <p>Type: {provider['Provider Type']}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  <span className="font-medium">{provider.distance_miles}</span> miles away
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ProviderList; 