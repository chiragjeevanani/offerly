import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polygon } from '@react-google-maps/api';
import AddLocationAltRoundedIcon from '@mui/icons-material/AddLocationAltRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import toast from 'react-hot-toast';
import {
  computeHexagonPath,
  haversineDistance,
  clampRadius,
  DEFAULT_ZONE_RADIUS_METERS,
  MIN_ZONE_RADIUS_METERS,
  MAX_ZONE_RADIUS_METERS,
  ZONE_RADIUS_STEP_METERS,
} from '../../../utils/geoHex';

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };
const MAX_HISTORY = 20;

const MAP_OPTIONS = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  zoomControl: true,
  clickableIcons: false,
};

// Must be a stable reference — useJsApiLoader reloads the script if this
// array's identity changes between renders.
const PLACES_LIBRARIES = ['places'];
const SEARCH_DEBOUNCE_MS = 300;

const zoneKey = (zone, index) => zone._id || zone.id || zone.tempId || `new-${index}`;
const hasValidCoordinates = (point) =>
  !!point && typeof point.lat === 'number' && typeof point.lng === 'number' && (point.lat !== 0 || point.lng !== 0);

const CityZoneMap = ({ coordinates, onCoordinatesChange, zones, onZonesChange }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'admin-zone-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAP_API_KEY,
    libraries: PLACES_LIBRARIES,
  });

  const [map, setMap] = useState(null);
  const [mode, setMode] = useState(null); // null | 'center' | 'zone'
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [placingIndex, setPlacingIndex] = useState(null);
  const [history, setHistory] = useState([]);
  const radiusSnapshotRef = useRef(null);
  const resizeSnapshotRef = useRef(null);
  const polygonDragRef = useRef(null);
  const searchSessionTokenRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [placesReady, setPlacesReady] = useState(false);

  // The `libraries` option above kicks off loading the places library, but
  // useJsApiLoader's `isLoaded` doesn't wait for it — it can resolve before
  // google.maps.places is actually populated. Track that separately so the
  // search box can tell the admin it's still warming up instead of doing
  // nothing on the first couple of keystrokes.
  useEffect(() => {
    if (!isLoaded || !window.google?.maps?.importLibrary) return undefined;
    let cancelled = false;
    window.google.maps.importLibrary('places').then(() => {
      if (!cancelled) setPlacesReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isLoaded]);

  const hasCenter = hasValidCoordinates(coordinates);
  const mapCenter = useMemo(() => (hasCenter ? coordinates : INDIA_CENTER), [hasCenter, coordinates]);

  const onMapLoad = useCallback((instance) => setMap(instance), []);

  // Search box — jumps the map to a searched city/place. Pure navigation,
  // doesn't touch the city center or any zone, so it can't be confused with
  // "Set City Center". Uses the Places API (New) JS classes directly rather
  // than the legacy google.maps.places.Autocomplete widget, since that
  // legacy API isn't enabled on this project's Maps key.
  const handleSearchInputChange = (value) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!value.trim()) {
      setSearchSuggestions([]);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      const AutocompleteSuggestion = window.google?.maps?.places?.AutocompleteSuggestion;
      const SessionToken = window.google?.maps?.places?.AutocompleteSessionToken;
      if (!AutocompleteSuggestion) return;
      if (!searchSessionTokenRef.current && SessionToken) {
        searchSessionTokenRef.current = new SessionToken();
      }
      try {
        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: value,
          sessionToken: searchSessionTokenRef.current,
          includedRegionCodes: ['in'],
        });
        setSearchSuggestions(suggestions || []);
      } catch {
        setSearchSuggestions([]);
      }
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleSearchSuggestionSelect = async (suggestion) => {
    const placePrediction = suggestion.placePrediction;
    if (!placePrediction) return;
    setSearchQuery(placePrediction.text?.text || '');
    setSearchSuggestions([]);
    try {
      const place = placePrediction.toPlace();
      await place.fetchFields({ fields: ['location'] });
      if (!map || !place.location) {
        toast.error('Could not locate that place');
        return;
      }
      // A flat pan+zoom instead of fitBounds(place.viewport): fitBounds's
      // resulting zoom depends on when the map's "bounds_changed"/"idle"
      // events happen to fire, which was landing at inconsistent — sometimes
      // far too zoomed-out — levels. This is deterministic every time.
      map.panTo({ lat: place.location.lat(), lng: place.location.lng() });
      map.setZoom(13);
    } catch {
      toast.error('Could not locate that place');
    }
    // Start a fresh billing session for the next search, per Google's guidance.
    searchSessionTokenRef.current = null;
  };

  // Snapshot the pre-mutation state so a later "Undo" click can restore it.
  const pushHistory = (snapshot) => {
    setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), snapshot]);
  };

  const updateZone = (index, patch) => {
    onZonesChange(zones.map((zone, i) => (i === index ? { ...zone, ...patch } : zone)));
  };

  const handleMapClick = useCallback(
    (event) => {
      const point = { lat: event.latLng.lat(), lng: event.latLng.lng() };

      if (mode === 'center') {
        pushHistory({ zones, coordinates });
        onCoordinatesChange(point);
        setMode(null);
        return;
      }

      if (placingIndex !== null) {
        pushHistory({ zones, coordinates });
        const radiusMeters = zones[placingIndex]?.radiusMeters || DEFAULT_ZONE_RADIUS_METERS;
        onZonesChange(
          zones.map((zone, i) =>
            i === placingIndex
              ? { ...zone, center: point, radiusMeters, path: computeHexagonPath(point, radiusMeters) }
              : zone
          )
        );
        setSelectedIndex(placingIndex);
        setPlacingIndex(null);
        return;
      }

      if (mode === 'zone') {
        pushHistory({ zones, coordinates });
        const radiusMeters = DEFAULT_ZONE_RADIUS_METERS;
        const nextZones = [
          ...zones,
          {
            tempId: `zone-${Date.now()}`,
            name: `Zone ${zones.length + 1}`,
            merchantCount: 0,
            status: 'active',
            center: point,
            radiusMeters,
            path: computeHexagonPath(point, radiusMeters),
          },
        ];
        onZonesChange(nextZones);
        setSelectedIndex(nextZones.length - 1);
        setMode(null);
        return;
      }

      setSelectedIndex(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, placingIndex, zones, coordinates]
  );

  const handleCenterDrag = (event) => {
    pushHistory({ zones, coordinates });
    onCoordinatesChange({ lat: event.latLng.lat(), lng: event.latLng.lng() });
  };

  const handleZoneDrag = (index, event) => {
    pushHistory({ zones, coordinates });
    const point = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    const radiusMeters = zones[index]?.radiusMeters || DEFAULT_ZONE_RADIUS_METERS;
    updateZone(index, { center: point, path: computeHexagonPath(point, radiusMeters) });
  };

  const handleRadiusChange = (index, radiusMeters) => {
    const center = zones[index]?.center;
    updateZone(index, { radiusMeters, path: center ? computeHexagonPath(center, radiusMeters) : undefined });
  };

  // Drag-to-resize handle sitting on the hexagon's edge — dragging it in/out
  // recomputes the radius from its live distance to the center, so resizing
  // works directly on the map instead of only via the slider below it.
  const handleResizeDragStart = () => {
    resizeSnapshotRef.current = { zones, coordinates };
  };
  const handleResizeDrag = (index, event) => {
    const center = zones[index]?.center;
    if (!center) return;
    const point = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    const radiusMeters = clampRadius(haversineDistance(center, point));
    updateZone(index, { radiusMeters, path: computeHexagonPath(center, radiusMeters) });
  };
  const handleResizeDragEnd = (index, event) => {
    handleResizeDrag(index, event);
    if (resizeSnapshotRef.current) {
      pushHistory(resizeSnapshotRef.current);
      resizeSnapshotRef.current = null;
    }
  };

  // Range inputs fire onChange continuously while dragging — snapshot once at
  // the start of the gesture (pointerdown) instead of on every tick, so Undo
  // reverts a whole resize, not one pixel of it.
  const handleRadiusDragStart = () => {
    radiusSnapshotRef.current = { zones, coordinates };
  };
  const commitRadiusHistory = () => {
    if (radiusSnapshotRef.current) {
      pushHistory(radiusSnapshotRef.current);
      radiusSnapshotRef.current = null;
    }
  };

  const handlePolygonClick = (index, event) => {
    // Polygon clicks bubble up to the map's own onClick unless stopped —
    // without this, selecting a hexagon immediately deselects it again.
    event.stop?.();
    setMode(null);
    setPlacingIndex(null);
    setSelectedIndex(index);
  };

  // Polygons are draggable directly (grab anywhere inside a hexagon to move
  // it), not just via the small center pin. Google Maps only gives us the
  // cursor's lat/lng on drag events, so we track the start point ourselves
  // and re-derive how far the shape moved.
  const handlePolygonDragStart = (index, event) => {
    polygonDragRef.current = {
      index,
      startLatLng: { lat: event.latLng.lat(), lng: event.latLng.lng() },
      snapshot: { zones, coordinates },
    };
    setMode(null);
    setPlacingIndex(null);
    setSelectedIndex(index);
  };

  const handlePolygonDragEnd = (index, event) => {
    const drag = polygonDragRef.current;
    polygonDragRef.current = null;
    if (!drag || drag.index !== index) return;
    const zone = zones[index];
    if (!zone?.center) return;
    const endLatLng = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    const newCenter = {
      lat: zone.center.lat + (endLatLng.lat - drag.startLatLng.lat),
      lng: zone.center.lng + (endLatLng.lng - drag.startLatLng.lng),
    };
    pushHistory(drag.snapshot);
    updateZone(index, {
      center: newCenter,
      path: computeHexagonPath(newCenter, zone.radiusMeters || DEFAULT_ZONE_RADIUS_METERS),
    });
  };

  const toggleAddZone = () => {
    setPlacingIndex(null);
    setSelectedIndex(null);
    setMode((current) => (current === 'zone' ? null : 'zone'));
  };

  const toggleSetCenter = () => {
    setPlacingIndex(null);
    setMode((current) => (current === 'center' ? null : 'center'));
  };

  const locateZone = (index) => {
    const zone = zones[index];
    setMode(null);
    setPlacingIndex(null);
    setSelectedIndex(index);
    if (zone?.center && map) {
      map.panTo(zone.center);
      map.setZoom(15);
    }
  };

  const placeZoneOnMap = (index) => {
    setMode(null);
    setSelectedIndex(index);
    setPlacingIndex((current) => (current === index ? null : index));
  };

  const removeZone = (index) => {
    const zone = zones[index];
    if ((zone.merchantCount || 0) > 0) {
      toast.error(`Cannot remove — ${zone.merchantCount} merchant(s) assigned. Deactivate instead.`);
      return;
    }
    pushHistory({ zones, coordinates });
    onZonesChange(zones.filter((_, i) => i !== index));
    if (selectedIndex === index) setSelectedIndex(null);
    if (placingIndex === index) setPlacingIndex(null);
  };

  const handleUndo = () => {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    onZonesChange(previous.zones);
    onCoordinatesChange(previous.coordinates);
    setSelectedIndex(null);
    setPlacingIndex(null);
    setMode(null);
  };

  const selectedZone = selectedIndex !== null ? zones[selectedIndex] : null;

  const instruction =
    mode === 'center'
      ? 'Click anywhere on the map to set the city center.'
      : mode === 'zone'
      ? 'Click anywhere on the map to drop the new hexagon zone.'
      : placingIndex !== null
      ? `Click anywhere on the map to place "${zones[placingIndex]?.name || 'this zone'}".`
      : null;

  if (!isLoaded) {
    return (
      <div className="h-64 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        {placesReady ? (
          <SearchRoundedIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" sx={{ fontSize: 18 }} />
        ) : (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
        )}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchInputChange(e.target.value)}
          onBlur={() => setTimeout(() => setSearchSuggestions([]), 150)}
          disabled={!placesReady}
          placeholder={placesReady ? 'Search for a city or place to jump the map there…' : 'Loading search…'}
          className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 text-sm font-medium focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
        />
        {searchSuggestions.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
            {searchSuggestions.map((suggestion, i) => (
              <button
                key={suggestion.placePrediction?.placeId || i}
                type="button"
                // mousedown (not click/onBlur's cleanup timer) — mousedown fires
                // before the input's blur, so this can't lose the race against
                // the dropdown closing when a real click is a little slow.
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSearchSuggestionSelect(suggestion);
                }}
                className="w-full text-left px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0 truncate"
              >
                {suggestion.placePrediction?.text?.text}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleSetCenter}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all ${
            mode === 'center' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-gray-500 border-gray-200'
          }`}
        >
          <MyLocationRoundedIcon sx={{ fontSize: 14 }} />
          {mode === 'center' ? 'Click Map…' : 'Set City Center'}
        </button>
        <button
          type="button"
          onClick={toggleAddZone}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all ${
            mode === 'zone' ? 'bg-[#5EB929]/10 text-[#5EB929] border-[#5EB929]/30' : 'bg-white text-gray-500 border-gray-200'
          }`}
        >
          <AddLocationAltRoundedIcon sx={{ fontSize: 14 }} />
          {mode === 'zone' ? 'Click Map…' : 'Add Hexagon Zone'}
        </button>
        <button
          type="button"
          onClick={handleUndo}
          disabled={!history.length}
          title="Undo last change"
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all bg-white text-gray-500 border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <UndoRoundedIcon sx={{ fontSize: 16 }} />
        </button>
      </div>

      {instruction && (
        <p className="text-[10px] font-semibold text-indigo-500 flex items-center gap-1 px-0.5">
          <PlaceRoundedIcon sx={{ fontSize: 12 }} />
          {instruction}
        </p>
      )}

      <div className="h-[28rem] sm:h-[32rem] rounded-2xl overflow-hidden border border-gray-100 relative">
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={mapCenter}
          zoom={hasCenter ? 13 : 5}
          options={MAP_OPTIONS}
          onLoad={onMapLoad}
          onClick={handleMapClick}
        >
          {hasCenter && (
            <Marker
              position={coordinates}
              draggable
              onDragEnd={handleCenterDrag}
              title="City center"
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: '#4338CA',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
                scale: 7,
              }}
            />
          )}

          {zones.map((zone, index) => {
            if (!zone.center) return null;
            const isSelected = index === selectedIndex;
            const color = zone.status === 'inactive' ? '#9CA3AF' : '#5EB929';
            return (
              <Polygon
                key={zoneKey(zone, index)}
                path={zone.path?.length ? zone.path : computeHexagonPath(zone.center, zone.radiusMeters || DEFAULT_ZONE_RADIUS_METERS)}
                onClick={(event) => handlePolygonClick(index, event)}
                onDragStart={(event) => handlePolygonDragStart(index, event)}
                onDragEnd={(event) => handlePolygonDragEnd(index, event)}
                options={{
                  fillColor: color,
                  fillOpacity: isSelected ? 0.4 : 0.16,
                  strokeColor: color,
                  strokeWeight: isSelected ? 3 : 1.5,
                  clickable: true,
                  draggable: true,
                  zIndex: isSelected ? 2 : 1,
                }}
              />
            );
          })}

          {selectedZone?.center && (
            <Marker
              position={selectedZone.center}
              draggable
              onDragEnd={(event) => handleZoneDrag(selectedIndex, event)}
              title="Drag to move this zone"
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: '#5EB929',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
                scale: 6,
              }}
            />
          )}

          {selectedZone?.center && (
            <Marker
              position={
                (selectedZone.path?.length ? selectedZone.path : computeHexagonPath(selectedZone.center, selectedZone.radiusMeters || DEFAULT_ZONE_RADIUS_METERS))[0]
              }
              draggable
              onDragStart={handleResizeDragStart}
              onDrag={(event) => handleResizeDrag(selectedIndex, event)}
              onDragEnd={(event) => handleResizeDragEnd(selectedIndex, event)}
              title="Drag to resize this zone"
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: '#FFFFFF',
                fillOpacity: 1,
                strokeColor: '#5EB929',
                strokeWeight: 3,
                scale: 6,
              }}
            />
          )}
        </GoogleMap>
      </div>

      {selectedZone?.center && (
        <div className="p-3 bg-white rounded-xl border border-gray-100 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {selectedZone.name || 'Zone'} — Hexagon Size
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => removeZone(selectedIndex)}
                title="Delete this zone"
                className="p-1 rounded-md text-red-400 hover:bg-red-50"
              >
                <DeleteRoundedIcon sx={{ fontSize: 16 }} />
              </button>
              <button type="button" onClick={() => setSelectedIndex(null)} className="p-1 rounded-md text-gray-300 hover:text-gray-500">
                <CloseRoundedIcon sx={{ fontSize: 16 }} />
              </button>
            </div>
          </div>
          <input
            type="range"
            min={MIN_ZONE_RADIUS_METERS}
            max={MAX_ZONE_RADIUS_METERS}
            step={ZONE_RADIUS_STEP_METERS}
            value={selectedZone.radiusMeters || DEFAULT_ZONE_RADIUS_METERS}
            onPointerDown={handleRadiusDragStart}
            onPointerUp={commitRadiusHistory}
            onChange={(e) => handleRadiusChange(selectedIndex, Number(e.target.value))}
            className="w-full accent-[#5EB929]"
          />
          <p className="text-[11px] text-gray-500">
            {selectedZone.radiusMeters || DEFAULT_ZONE_RADIUS_METERS}m radius — drag <span className="font-semibold text-[#5EB929]">anywhere inside the hexagon</span> (or its center pin) to move it, the <span className="font-semibold text-[#5EB929]">white ring on the edge</span> to resize it, or use the slider.
          </p>
        </div>
      )}

      <div className="space-y-2 pt-1">
        {zones.map((zone, index) => (
          <div key={zoneKey(zone, index)} className="flex items-center gap-2">
            <input
              type="text"
              value={zone.name}
              onChange={(e) => updateZone(index, { name: e.target.value })}
              placeholder="Zone name e.g. Beltola"
              className="flex-1 bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => (zone.center ? locateZone(index) : placeZoneOnMap(index))}
              title={zone.center ? 'Locate on map' : 'Place on map'}
              className={`p-2.5 rounded-lg shrink-0 border ${
                placingIndex === index
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                  : zone.center
                  ? 'bg-white text-gray-500 border-gray-200'
                  : 'bg-amber-50 text-amber-600 border-amber-200'
              }`}
            >
              <PlaceRoundedIcon sx={{ fontSize: 16 }} />
            </button>
            <button
              type="button"
              onClick={() => updateZone(index, { status: zone.status === 'inactive' ? 'active' : 'inactive' })}
              className={`px-2.5 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wide border whitespace-nowrap ${
                zone.status === 'inactive' ? 'bg-gray-50 text-gray-400 border-gray-100' : 'bg-green-50 text-green-600 border-green-100'
              }`}
            >
              {zone.status === 'inactive' ? 'Inactive' : 'Active'}
            </button>
            <button
              type="button"
              onClick={() => removeZone(index)}
              className="p-2 rounded-lg text-red-400 hover:bg-red-50 shrink-0"
            >
              <DeleteRoundedIcon sx={{ fontSize: 16 }} />
            </button>
          </div>
        ))}
        {zones.length === 0 && (
          <p className="text-[11px] text-gray-400 italic px-1">No zones yet — tap "Add Hexagon Zone" and click the map.</p>
        )}
      </div>
    </div>
  );
};

export default CityZoneMap;
