import React, { useEffect, useRef, useState, useMemo } from 'react';
import './StormMap.css';

const defaultCenter = { lat: 36.1627, lng: -86.7816 }; // Nashville, TN
const defaultZoom = 10;

function StormMap({ 
  jobs = [], 
  selectedStormEventId,
  onJobClick
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const initRetryCountRef = useRef(0); // Added missing ref
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Filter jobs that have valid coordinates
  const jobsWithCoords = useMemo(() => {
    return (jobs || []).filter(job => 
      job.latitude && job.longitude && 
      !isNaN(parseFloat(job.latitude)) && 
      !isNaN(parseFloat(job.longitude))
    );
  }, [jobs]);

  // Load Google Maps API and initialize map
  useEffect(() => {
    // Function to try initializing the map
    const tryInitialize = () => {
      if (window.google && window.google.maps && mapRef.current) {
        console.log('Conditions met, initializing map...');
        initializeMap();
        return true;
      }
      return false;
    };

    // Check if already loaded
    if (window.google && window.google.maps && window.googleMapsLoaded) {
      console.log('Google Maps already loaded, waiting for DOM...');
      // Wait a bit for the DOM to be ready, then initialize
      const timer = setTimeout(() => {
        if (!tryInitialize()) {
          // If still not ready, wait a bit more
          setTimeout(() => tryInitialize(), 300);
        }
      }, 200);
      return () => clearTimeout(timer);
    }

    // Wait for the callback from index.html
    if (window.googleMapsLoaded) {
      // API says it's loaded, try initializing
      setTimeout(() => {
        if (!tryInitialize()) {
          setTimeout(() => tryInitialize(), 300);
        }
      }, 200);
    } else {
      // Wait for the callback from index.html
      const checkLoaded = setInterval(() => {
        if (window.googleMapsLoaded && window.google && window.google.maps) {
          clearInterval(checkLoaded);
          console.log('Google Maps API loaded via callback');
          setTimeout(() => {
            if (!tryInitialize()) {
              setTimeout(() => tryInitialize(), 300);
            }
          }, 200);
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkLoaded);
        if (!window.google || !window.google.maps) {
          setLoadError(new Error('Google Maps API failed to load. Please check your API key and network connection.'));
        } else if (!mapRef.current) {
          setLoadError(new Error('Map container not found. Please refresh the page.'));
        }
      }, 10000);

      return () => clearInterval(checkLoaded);
    }
  }, []);

  // Update markers when jobs or map instance changes
  useEffect(() => {
    if (mapLoaded && mapInstanceRef.current) {
      updateMarkers();
    }
  }, [mapLoaded, jobsWithCoords, showHeatmap]);

  const initializeMap = () => {
    console.log('Initializing map...', { 
      mapRef: !!mapRef.current, 
      mapInstance: !!mapInstanceRef.current, 
      google: !!window.google,
      mapRefCurrent: mapRef.current
    });
    
    // Check if map ref is available and Google Maps is loaded
    if (!mapRef.current) {
      initRetryCountRef.current += 1;
      if (initRetryCountRef.current > 20) {
        // Give up after 4 seconds (20 * 200ms)
        console.error('Map ref not available after multiple retries');
        setLoadError(new Error('Failed to initialize map container. Please refresh the page.'));
        return;
      }
      console.warn('Map ref not available yet, retrying...', initRetryCountRef.current);
      // Retry after a short delay
      setTimeout(() => {
        initializeMap();
      }, 200);
      return;
    }
    
    // Reset retry count on success
    initRetryCountRef.current = 0;
    
    if (mapInstanceRef.current) {
      console.log('Map already initialized');
      return;
    }
    
    if (!window.google || !window.google.maps) {
      console.error('Google Maps API not loaded', {
        google: !!window.google,
        maps: window.google?.maps,
        googleMapsLoaded: window.googleMapsLoaded,
        googleMapsError: window.googleMapsError
      });
      setLoadError(new Error('Google Maps API not available. Check that Maps JavaScript API is enabled in Google Cloud Console.'));
      return;
    }
    
    // Log successful API detection
    console.log('Google Maps API detected:', {
      maps: !!window.google.maps,
      places: !!window.google.maps.places,
      visualization: !!window.google.maps.visualization
    });

    try {
      const mapOptions = {
        center: defaultCenter,
        zoom: defaultZoom,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      };

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
      infoWindowRef.current = new window.google.maps.InfoWindow();

      // Adjust map to fit all jobs
      if (jobsWithCoords.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        jobsWithCoords.forEach(job => {
          bounds.extend({
            lat: parseFloat(job.latitude),
            lng: parseFloat(job.longitude)
          });
        });
        mapInstanceRef.current.fitBounds(bounds);
      }

      setMapLoaded(true);
      setLoadError(null);
    } catch (error) {
      console.error('Error initializing map:', error);
      setLoadError(error);
      setMapLoaded(false);
    }
  };

  const getMarkerColor = (job) => {
    // If job has a direct color property (from Excel upload), use it
    if (job.color) {
      return job.color;
    }

    const status = job.status?.toLowerCase();
    const priority = job.priority?.toLowerCase();
    
    // Database job status colors
    if (priority === 'emergency' || status === 'lead' || !job.inspection_completed) {
      return '#ef4444'; // Red
    } else if (status === 'inspection_scheduled') {
      return '#f97316'; // Orange
    } else if (status === 'inspected' || status === 'pending_crew') {
      return '#eab308'; // Yellow
    } else if (status === 'in_progress' || status === 'wip') {
      return '#22c55e'; // Green
    } else if (status === 'completed' || status === 'complete') {
      return '#3b82f6'; // Blue
    }
    return '#6b7280'; // Gray
  };

  const updateMarkers = () => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    if (jobsWithCoords.length === 0) return;

    if (showHeatmap && window.google.maps.visualization) {
      // Create heatmap
      const heatmapData = jobsWithCoords.map(job => ({
        location: new window.google.maps.LatLng(
          parseFloat(job.latitude),
          parseFloat(job.longitude)
        ),
        weight: job.priority === 'emergency' ? 3 : job.priority === 'high' ? 2 : 1
      }));

      const heatmap = new window.google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: mapInstanceRef.current,
        radius: 50,
        opacity: 0.6
      });

      // Store reference for cleanup
      markersRef.current.push({ heatmap, setMap: (map) => heatmap.setMap(map) });
    } else {
      // Create individual markers
      jobsWithCoords.forEach(job => {
        const color = getMarkerColor(job);
        
        // Build hover tooltip text (shows on mouse hover)
        const jobId = job.job_number || job.id || '';
        const customerName = job.customer_name || 'Unknown';
        const address = job.property_address || job.address || '';
        
        // Multi-line tooltip for hover
        const hoverTitle = [
          jobId ? `Job: ${jobId}` : '',
          customerName,
          address
        ].filter(Boolean).join('\n');

        const marker = new window.google.maps.Marker({
          position: {
            lat: parseFloat(job.latitude),
            lng: parseFloat(job.longitude)
          },
          map: mapInstanceRef.current,
          title: hoverTitle,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          },
          animation: job.priority === 'emergency' ? window.google.maps.Animation.BOUNCE : null
        });

        // Create info window content (shows on click)
        // Handle both Excel jobs and database jobs
        const isExcelJob = job.source === 'excel';
        const statusOrColorValue = job.colorValue || job.status || '-';
        
        const infoContent = `
          <div class="storm-map-info-window">
            ${jobId ? `<div class="info-job-id">Job #${jobId}</div>` : ''}
            <h4>${customerName}</h4>
            <p><strong>Address:</strong> ${address || '-'}</p>
            ${isExcelJob ? `
              <p><strong>Status:</strong> <span style="color: ${color}; font-weight: 600;">${statusOrColorValue}</span></p>
              ${job.notes ? `<p><strong>Notes:</strong> ${job.notes}</p>` : ''}
            ` : `
              <p><strong>Property ID:</strong> ${job.property_reference || '-'}</p>
              <p><strong>Status:</strong> ${job.status || '-'}</p>
              <p><strong>Priority:</strong> ${job.priority || '-'}</p>
              ${job.storm_event_name ? `<p><strong>Storm Event:</strong> ${job.storm_event_name}</p>` : ''}
              ${job.damage_types && job.damage_types.length > 0 ? 
                `<p><strong>Damage Types:</strong> ${job.damage_types.join(', ')}</p>` : ''}
            `}
            <div class="storm-map-actions">
              <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}', '_blank')">
                Get Directions
              </button>
            </div>
          </div>
        `;

        marker.addListener('click', () => {
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(infoContent);
            infoWindowRef.current.open(mapInstanceRef.current, marker);
          }
          onJobClick?.(job);
        });

        markersRef.current.push(marker);
      });
    }
  };

  console.log('StormMap render:', { 
    jobs: jobs?.length, 
    jobsWithCoords: jobsWithCoords.length, 
    mapLoaded, 
    loadError: loadError?.message,
    mapRef: !!mapRef.current,
    google: !!window.google,
    googleMapsLoaded: window.googleMapsLoaded,
    googleMapsError: window.googleMapsError
  });
  
  // Check for authentication errors and API errors
  useEffect(() => {
    // Check for existing errors
    if (window.googleMapsError) {
      console.error('Google Maps Error detected:', window.googleMapsError);
      setLoadError(new Error(window.googleMapsError));
    }

    // Listen for Google Maps errors
    const handleError = (event) => {
      console.error('Google Maps Error Event:', event.detail);
      setLoadError(new Error(event.detail?.message || 'Google Maps API error'));
    };

    window.addEventListener('googlemapserror', handleError);

    // Check if Google Maps loaded successfully after 2 seconds
    const checkLoaded = setTimeout(() => {
      if (!window.google || !window.google.maps) {
        if (!window.googleMapsLoaded && !window.googleMapsError) {
          console.warn('Google Maps API not loaded after 2 seconds');
          console.log('window.google:', window.google);
          console.log('window.googleMapsLoaded:', window.googleMapsLoaded);
          console.log('window.googleMapsError:', window.googleMapsError);
        }
      } else {
        console.log('Google Maps API loaded:', {
          maps: !!window.google.maps,
          places: !!window.google.maps.places,
          visualization: !!window.google.maps.visualization
        });
      }
    }, 2000);

    return () => {
      window.removeEventListener('googlemapserror', handleError);
      clearTimeout(checkLoaded);
    };
  }, []);

  return (
    <div className="storm-map-container">
      <div className="storm-map-controls">
        <div className="storm-map-filters">
          <label>
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
            />
            Show Heat Map
          </label>
        </div>
        <div className="storm-map-stats">
          {jobsWithCoords.length > 0 ? (
            <span>{jobsWithCoords.length} of {jobs.length} jobs with location data</span>
          ) : jobs.length > 0 ? (
            <span>{jobs.length} jobs - none have location data</span>
          ) : (
            <span>No jobs found</span>
          )}
        </div>
      </div>
      
      {/* Always render the map div so the ref can be attached */}
      <div ref={mapRef} className="storm-map" style={{ flex: 1, minHeight: 0 }} />
      
      {/* Show loading overlay */}
      {!mapLoaded && !loadError && (
        <div className="storm-map-loading">
          <p>Loading map...</p>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem' }}>
            {!window.google ? 'Loading Google Maps API...' : 'Initializing map...'}
          </p>
        </div>
      )}
      
      {/* Show error overlay */}
      {loadError && (
        <div className="storm-map-error">
          <p>Error loading map: {loadError.message}</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: '#94a3b8' }}>
            Check your internet connection and Google Maps API key.
          </p>
        </div>
      )}
      
      {/* Show info when map is loaded but no jobs have coordinates */}
      {mapLoaded && jobsWithCoords.length === 0 && jobs.length > 0 && (
        <div className="storm-map-info">
          <p>Map loaded - no jobs have location data</p>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem' }}>
            Addresses need GPS coordinates from Google Places Autocomplete
          </p>
        </div>
      )}
    </div>
  );
}

export default StormMap;
