/**
 * Distance Matrix Service
 * Uses Google Maps Distance Matrix (via Maps JavaScript API) to get travel times between points.
 * Used for drive-time optimization of job ordering and assignment.
 */

export const MAX_POINTS_PER_REQUEST = 25;

/**
 * Get a travel time matrix between points (in seconds).
 * Uses Driving mode. Requires window.google.maps to be loaded.
 * If points exceed MAX_POINTS_PER_REQUEST, the request is automatically chunked.
 * @param {Array<{lat: number, lng: number}>} points - Array of {lat, lng}
 * @returns {Promise<number[][]>} matrix[i][j] = travel time in seconds from i to j, or Infinity if unavailable
 */
export async function getTravelTimeMatrix(points) {
  if (!points?.length) return [];
  if (!window.google?.maps?.DistanceMatrixService) {
    console.warn('Distance Matrix Service not available (Google Maps may not be loaded)');
    return points.map(() => points.map(() => Infinity));
  }

  if (points.length > MAX_POINTS_PER_REQUEST) {
    return getChunkedTravelTimeMatrix(points);
  }

  return fetchDistanceMatrix(points, points);
}

/**
 * Fetch a distance matrix for the given origins and destinations via Google Maps.
 * @param {Array<{lat: number, lng: number}>} origins
 * @param {Array<{lat: number, lng: number}>} destinations
 * @returns {Promise<number[][]>}
 */
function fetchDistanceMatrix(origins, destinations) {
  const service = new window.google.maps.DistanceMatrixService();
  const toLatLng = (p) => new window.google.maps.LatLng(p.lat, p.lng);

  return new Promise((resolve, reject) => {
    try {
      service.getDistanceMatrix(
        {
          origins: origins.map(toLatLng),
          destinations: destinations.map(toLatLng),
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (response, status) => {
          if (status !== 'OK' || !response?.rows) {
            console.warn('Distance Matrix request failed:', status);
            resolve(origins.map(() => destinations.map(() => Infinity)));
            return;
          }
          const matrix = response.rows.map((row, i) =>
            row.elements.map((el, j) => {
              if (el.status === 'OK' && el.duration?.value != null) return el.duration.value;
              // Self-distance is 0; unreachable pairs get Infinity
              const originIdx = i;
              const destIdx = j;
              return originIdx === destIdx ? 0 : Infinity;
            })
          );
          resolve(matrix);
        }
      );
    } catch (err) {
      reject(new Error('Distance Matrix API error: ' + err.message));
    }
  });
}

/**
 * Handle large point sets by chunking into sub-requests and stitching results.
 * @param {Array<{lat: number, lng: number}>} points
 * @returns {Promise<number[][]>}
 */
async function getChunkedTravelTimeMatrix(points) {
  const n = points.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(Infinity));
  const chunkSize = MAX_POINTS_PER_REQUEST;

  for (let i = 0; i < n; i += chunkSize) {
    const originSlice = points.slice(i, i + chunkSize);
    for (let j = 0; j < n; j += chunkSize) {
      const destSlice = points.slice(j, j + chunkSize);
      const subMatrix = await fetchDistanceMatrix(originSlice, destSlice);
      for (let oi = 0; oi < subMatrix.length; oi++) {
        for (let dj = 0; dj < subMatrix[oi].length; dj++) {
          matrix[i + oi][j + dj] = subMatrix[oi][dj];
        }
      }
    }
  }

  // Ensure diagonal is 0
  for (let k = 0; k < n; k++) matrix[k][k] = 0;

  return matrix;
}

/**
 * Run nearest-neighbor TSP from depot (index 0) over job indices 1..n.
 * Returns order of job indices (1..n) that minimizes total drive time.
 * @param {number[][]} matrix - Travel time matrix in seconds
 * @returns {number[]} Ordered job indices (1, 2, ... n), not including depot 0
 */
export function nearestNeighborOrder(matrix) {
  if (!matrix?.length || matrix[0].length < 2) return [];
  const n = matrix.length;
  const visited = new Set([0]);
  const order = [];
  let current = 0;
  while (visited.size < n) {
    let best = -1;
    let bestTime = Infinity;
    for (let j = 0; j < n; j++) {
      if (visited.has(j)) continue;
      const t = matrix[current][j];
      if (t < bestTime) {
        bestTime = t;
        best = j;
      }
    }
    if (best === -1) break;
    order.push(best);
    visited.add(best);
    current = best;
  }
  return order;
}

export default {
  getTravelTimeMatrix,
  nearestNeighborOrder,
  MAX_POINTS_PER_REQUEST,
};
