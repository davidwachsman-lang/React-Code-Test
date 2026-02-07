/**
 * Distance Matrix Service
 * Uses Google Maps Distance Matrix (via Maps JavaScript API) to get travel times between points.
 * Used for drive-time optimization of job ordering and assignment.
 */

export const MAX_POINTS_PER_REQUEST = 25;

/**
 * Get a travel time matrix between points (in seconds).
 * Uses Driving mode. Requires window.google.maps to be loaded.
 * @param {Array<{lat: number, lng: number}>} points - Array of {lat, lng}
 * @returns {Promise<number[][]>} matrix[i][j] = travel time in seconds from i to j, or Infinity if unavailable
 */
export async function getTravelTimeMatrix(points) {
  if (!points?.length) return [];
  if (!window.google?.maps?.DistanceMatrixService) {
    console.warn('Distance Matrix Service not available (Google Maps may not be loaded)');
    return points.map(() => points.map(() => Infinity));
  }

  const service = new window.google.maps.DistanceMatrixService();
  const toLatLng = (p) => new window.google.maps.LatLng(p.lat, p.lng);
  const origins = points.map(toLatLng);
  const destinations = points.map(toLatLng);

  return new Promise((resolve) => {
    service.getDistanceMatrix(
      {
        origins,
        destinations,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (response, status) => {
        if (status !== 'OK' || !response?.rows) {
          console.warn('Distance Matrix request failed:', status);
          resolve(points.map(() => points.map(() => Infinity)));
          return;
        }
        const matrix = response.rows.map((row, i) =>
          row.elements.map((el, j) => {
            if (el.status === 'OK' && el.duration?.value != null) return el.duration.value;
            return i === j ? 0 : Infinity;
          })
        );
        resolve(matrix);
      }
    );
  });
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
