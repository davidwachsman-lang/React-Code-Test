/**
 * Geocoding Service
 * Uses Google Geocoding API to convert addresses to lat/lng coordinates
 */

// Cache to avoid duplicate API calls
const geocodeCache = new Map();

/**
 * Geocode a single address
 * @param {string} address - Full address string
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export const geocodeAddress = async (address) => {
  if (!address || address.trim() === '') {
    return null;
  }

  const normalizedAddress = address.trim().toLowerCase();
  
  // Check cache first
  if (geocodeCache.has(normalizedAddress)) {
    return geocodeCache.get(normalizedAddress);
  }

  // Wait for Google Maps API to be available
  if (!window.google || !window.google.maps) {
    console.error('Google Maps API not loaded');
    return null;
  }

  return new Promise((resolve) => {
    const geocoder = new window.google.maps.Geocoder();
    
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        const coords = {
          lat: location.lat(),
          lng: location.lng()
        };
        // Cache the result
        geocodeCache.set(normalizedAddress, coords);
        resolve(coords);
      } else {
        console.warn(`Geocoding failed for "${address}": ${status}`);
        // Cache null result to avoid retrying
        geocodeCache.set(normalizedAddress, null);
        resolve(null);
      }
    });
  });
};

/**
 * Build a full address string from components
 * @param {Object} components - Address components
 * @returns {string}
 */
export const buildAddressString = ({ street, city, state, zip }) => {
  const parts = [];
  if (street) parts.push(street.trim());
  if (city) parts.push(city.trim());
  if (state) parts.push(state.trim());
  if (zip) parts.push(zip.trim());
  return parts.join(', ');
};

/**
 * Batch geocode multiple addresses with rate limiting
 * @param {Array<Object>} items - Array of items with address fields
 * @param {Object} columnMapping - Mapping of column names to address fields
 * @param {Function} onProgress - Progress callback (current, total)
 * @returns {Promise<Array<Object>>} - Items with added latitude and longitude
 */
export const batchGeocode = async (items, columnMapping, onProgress) => {
  const results = [];
  const batchSize = 10; // Process 10 at a time
  const delayMs = 100; // 100ms delay between batches (10 requests/second)

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (item) => {
      // Build address from mapped columns
      const address = buildAddressString({
        street: item[columnMapping.street] || '',
        city: item[columnMapping.city] || '',
        state: item[columnMapping.state] || '',
        zip: item[columnMapping.zip] || ''
      });

      if (!address || address === ', , , ') {
        return { ...item, latitude: null, longitude: null, geocodeError: 'No address' };
      }

      const coords = await geocodeAddress(address);
      
      if (coords) {
        return {
          ...item,
          latitude: coords.lat,
          longitude: coords.lng,
          fullAddress: address
        };
      } else {
        return {
          ...item,
          latitude: null,
          longitude: null,
          fullAddress: address,
          geocodeError: 'Could not geocode address'
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + batchSize, items.length), items.length);
    }

    // Delay before next batch (if not last batch)
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
};

/**
 * Clear the geocode cache
 */
export const clearGeocodeCache = () => {
  geocodeCache.clear();
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return {
    size: geocodeCache.size,
    entries: Array.from(geocodeCache.keys())
  };
};

export default {
  geocodeAddress,
  buildAddressString,
  batchGeocode,
  clearGeocodeCache,
  getCacheStats
};
