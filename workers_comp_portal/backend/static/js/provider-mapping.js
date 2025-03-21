// Global map variable
let map = null;
let markers = [];

// Function to load providers
function loadProviders(orderId) {
    console.log('Loading providers for order:', orderId);
    
    const procCode = document.getElementById('proc-code')?.value;
    const url = procCode ? 
        `/api/orders/${orderId}/providers?proc_code=${encodeURIComponent(procCode)}` :
        `/api/orders/${orderId}/providers`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to load providers');
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Provider data:', data);
            
            // Update patient location text
            document.getElementById('patient-location').textContent = 
                `Patient Location: ${data.patient_location.address}`;
            
            // Initialize map
            initMap(data.map_center);
            
            // Create array to store all coordinates
            const coordinates = [];
            
            // Add patient marker
            const patientMarker = L.marker([data.patient_location.latitude, data.patient_location.longitude], {
                icon: createCustomMarker('patient-marker', 'IW')
            }).addTo(map)
              .bindPopup('Injured Worker Location');
            
            // Add patient location to coordinates
            coordinates.push([data.patient_location.latitude, data.patient_location.longitude]);
            
            // Clear existing provider list
            const providerList = document.getElementById('provider-list');
            providerList.innerHTML = '';
            
            // Add providers
            data.providers.forEach((provider, index) => {
                // Add marker to map
                if (provider.lat && provider.lon) {
                    const marker = L.marker([provider.lat, provider.lon], {
                        icon: createCustomMarker('provider-marker', index + 1)
                    }).addTo(map)
                      .bindPopup(`
                        <b>${provider['DBA Name Billing Name']}</b><br>
                        ${provider.distance_miles} miles away<br>
                        ${provider.rate !== undefined ? 
                            (provider.rate ? 
                                `<b>Rate: ${provider.rate.toFixed(2)}</b>` : 
                                'Rate: Not available') 
                            : ''}
                      `);
                    
                    // Add provider location to coordinates
                    coordinates.push([provider.lat, provider.lon]);
                }
                
                // Add to list
                const li = document.createElement('li');
                li.className = 'px-4 py-4';
                li.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <div class="flex items-center">
                                <div class="provider-marker mr-3">${index + 1}</div>
                                <div>
                                    <h4 class="text-sm font-medium text-gray-900">
                                        ${provider['DBA Name Billing Name']}
                                    </h4>
                                    <div class="mt-1 text-sm text-gray-500">
                                        <p>TIN: ${provider.TIN}</p>
                                        <p>${provider.City}, ${provider.State}</p>
                                        <p>Network: ${provider['Provider Network']}</p>
                                        <p>Type: ${provider['Provider Type']}</p>
                                        <p class="mt-1 font-medium ${provider.rate ? 'text-green-600' : 'text-gray-500'}">
                                            Rate: ${provider.rate ? `${provider.rate.toFixed(2)}` : 'Not available'}
                                        </p>
                                        <div class="mt-2">
                                            ${provider.Email ? `<p>Email: ${provider.Email}</p>` : ''}
                                            ${provider['Fax Number'] ? `<p>Fax: ${provider['Fax Number']}</p>` : ''}
                                            ${provider.Phone ? `<p>Phone: ${provider.Phone}</p>` : ''}
                                            ${provider.Website ? `<p>Website: <a href="${provider.Website}" target="_blank" class="text-blue-600 hover:underline">${provider.Website}</a></p>` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="ml-4 flex flex-col items-end">
                            <div class="text-sm text-gray-500">
                                <span class="font-medium">${provider.distance_miles}</span> miles away
                            </div>
                            <button 
                                onclick="selectProvider('${provider.PrimaryKey}')"
                                class="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                            >
                                Select Provider
                            </button>
                        </div>
                    </div>
                `;
                providerList.appendChild(li);
            });
            
            // Fit map to show all markers if we have coordinates
            if (coordinates.length > 0) {
                const bounds = L.latLngBounds(coordinates);
                map.fitBounds(bounds, {
                    padding: [50, 50], // Add padding around the bounds
                    maxZoom: 12 // Limit maximum zoom level
                });
            }
        })
        .catch(error => {
            console.error('Error loading providers:', error);
            document.getElementById('providers-section').innerHTML = `
                <div class="px-4 py-5 sm:px-6">
                    <h3 class="text-lg leading-6 font-medium text-gray-900">Nearby Providers</h3>
                    <div class="text-red-500 text-sm mt-2">
                        Error loading providers: ${error.message}
                    </div>
                </div>
            `;
        });
}

function initMap(center) {
    if (map) {
        map.remove();
    }

    map = L.map('map');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

function createCustomMarker(className, number) {
    const el = document.createElement('div');
    el.className = className;
    el.textContent = number;
    return L.divIcon({
        html: el,
        className: 'custom-marker',
        iconSize: [24, 24]
    });
}

function selectProvider(providerId) {
    fetch(`/api/orders/${selectedOrderId}/select-provider`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider_id: providerId })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Failed to select provider');
            });
        }
        return response.json();
    })
    .then(data => {
        showNotification('success', 'Provider Selected', 'Provider selected successfully');
        loadOrderDetails(selectedOrderId);
    })
    .catch(error => {
        console.error('Error selecting provider:', error);
        showNotification('error', 'Selection Failed', error.message || 'Error selecting provider');
    });
}

// Refresh providers list
function refreshProviders() {
    if (selectedOrderId) {
        loadProviders(selectedOrderId);
    }
}