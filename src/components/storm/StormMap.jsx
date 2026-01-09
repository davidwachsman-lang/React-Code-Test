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

  // Load Google Maps API
  useEffect(() => {
    // Check if already loaded
    if (window.google && window.google.maps) {
      initializeMap();
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      // Wait for it to load
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkInterval);
          initializeMap();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.google || !window.google.maps) {
          setLoadError(new Error('Google Maps API failed to load. Please check your API key and network connection.'));
        }
      }, 10000);

      return () => clearInterval(checkInterval);
    }

    // Load the script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDr-fsgvYFv916-fICA781RT6VaCbeZh_Q&libraries=places,visualization&callback=initStormMap`;
    script.async = true;
    script.defer = true;
    
    // Set up global callback
    window.initStormMap = () => {
      if (window.google && window.google.maps) {
        initializeMap();
      }
    };

    script.onerror = () => {
      setLoadError(new Error('Failed to load Google Maps API. Please check your API key.'));
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (window.initStormMap) {
        delete window.initStormMap;
      }
    };
  }, []);

  // Update markers when jobs or map instance changes
  useEffect(() => {
    if (mapLoaded && mapInstanceRef.current && jobsWithCoords.length > 0) {
      updateMarkers();
    }
  }, [mapLoaded, jobsWithCoords, showHeatmap]);

  const initializeMap = () => {
    console.log('Initializing map...', { mapRef: !!mapRef.current, mapInstance: !!mapInstanceRef.current, google: !!window.google });
    if (!mapRef.current || mapInstanceRef.current) return;

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
    const status = job.status?.toLowerCase();
    const priority = job.priority?.toLowerCase();

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
        const marker = new window.google.maps.Marker({
          position: {
            lat: parseFloat(job.latitude),
            lng: parseFloat(job.longitude)
          },
          map: mapInstanceRef.current,
          title: job.customer_name || 'Unknown',
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

        // Create info window content
        const infoContent = `
          <div class="storm-map-info-window">
            <h4>${job.customer_name || 'Unknown'}</h4>
            <p><strong>Address:</strong> ${job.property_address || job.address || '-'}</p>
            <p><strong>Property ID:</strong> ${job.property_reference || '-'}</p>
            <p><strong>Status:</strong> ${job.status || '-'}</p>
            <p><strong>Priority:</strong> ${job.priority || '-'}</p>
            ${job.storm_event_name ? `<p><strong>Storm Event:</strong> ${job.storm_event_name}</p>` : ''}
            ${job.damage_types && job.damage_types.length > 0 ? 
              `<p><strong>Damage Types:</strong> ${job.damage_types.join(', ')}</p>` : ''}
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

  if (loadError) {
    return (
      <div className="storm-map-container">
        <div className="storm-map-loading" style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Error loading Google Maps. Please check your API key and try again.</p>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.5rem' }}>
            {loadError.message}
          </p>
        </div>
      </div>
    );
  }

  if (!mapLoaded) {
    return (
      <div className="storm-map-container">
        <div className="storm-map-loading">
          Loading Google Maps...
        </div>
      </div>
    );
  }

  console.log('StormMap render:', { 
    jobs: jobs?.length, 
    jobsWithCoords: jobsWithCoords.length, 
    mapLoaded, 
    loadError: loadError?.message 
  });

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
      
      <div ref={mapRef} className="storm-map" />
      
      {!mapLoaded && !loadError && (
        <div className="storm-map-loading">
          <p>Loading map...</p>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem' }}>
            {!window.google ? 'Loading Google Maps API...' : 'Initializing map...'}
          </p>
        </div>
      )}
      
      {loadError && (
        <div className="storm-map-error">
          <p>Error loading map: {loadError.message}</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: '#94a3b8' }}>
            Check your internet connection and Google Maps API key.
          </p>
        </div>
      )}
      
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
