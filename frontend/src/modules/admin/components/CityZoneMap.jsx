import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Polygon, Marker, Tooltip, useMapEvents } from 'react-leaflet';
import AddLocationAltRoundedIcon from '@mui/icons-material/AddLocationAltRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CenterFocusStrongRoundedIcon from '@mui/icons-material/CenterFocusStrongRounded';
import toast from 'react-hot-toast';
import {
  computeHexagonPath,
  haversineDistance,
  clampRadius,
  zonePath,
  DEFAULT_ZONE_RADIUS_METERS,
  MIN_ZONE_RADIUS_METERS,
  MAX_ZONE_RADIUS_METERS,
  ZONE_RADIUS_STEP_METERS,
} from '../../../utils/geoHex';

// Free map stack: OpenStreetMap tiles + Nominatim search. No API key, no billing.
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };
const MAX_HISTORY = 20;
// Nominatim's usage policy allows ~1 request/second; debounce well above that.
const SEARCH_DEBOUNCE_MS = 600;

const dotIcon = (fill, stroke, size) =>
  L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${fill};border:3px solid ${stroke};box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
const CITY_CENTER_ICON = dotIcon('#4338CA', '#FFFFFF', 16);
const ZONE_CENTER_ICON = dotIcon('#5EB929', '#FFFFFF', 16);
const RESIZE_HANDLE_ICON = dotIcon('#FFFFFF', '#5EB929', 18);

const zoneKey = (zone, index) => zone._id || zone.id || zone.tempId || `new-${index}`;
const hasValidCoordinates = (point) =>
  !!point && typeof point.lat === 'number' && typeof point.lng === 'number' && (point.lat !== 0 || point.lng !== 0);
const toLatLng = (latlng) => ({ lat: latlng.lat, lng: latlng.lng });

// Forwards raw map events to the latest handlers held in a ref, so Leaflet
// never calls a stale closure.
const MapEvents = ({ handlersRef }) => {
  useMapEvents({
    click: (e) => handlersRef.current.onMapClick(e),
    mousemove: (e) => handlersRef.current.onMouseMove(e),
    mouseup: (e) => handlersRef.current.onMouseUp(e),
  });
  return null;
};

const CityZoneMap = ({ coordinates, onCoordinatesChange, zones, onZonesChange }) => {
  const [map, setMap] = useState(null);
  const [mode, setMode] = useState(null); // null | 'center' | 'zone'
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [placingIndex, setPlacingIndex] = useState(null);
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const radiusSnapshotRef = useRef(null);
  const resizeSnapshotRef = useRef(null);
  const polygonDragRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const searchAbortRef = useRef(null);
  const didInitialFitRef = useRef(false);
  // Leaflet fires a map "click" right after a marker drag ends; without this
  // guard that click deselects the zone the admin just moved or resized.
  const suppressClickUntilRef = useRef(0);
  const endMarkerDrag = () => {
    suppressClickUntilRef.current = Date.now() + 400;
  };

  const hasCenter = hasValidCoordinates(coordinates);

  // Frame the city once the map is ready: all zones if there are any,
  // otherwise the city center, otherwise all of India.
  const fitToCity = (instance = map) => {
    if (!instance) return;
    const points = zones.filter((z) => z.center).flatMap((z) => zonePath(z));
    if (points.length) {
      instance.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [24, 24], maxZoom: 15 });
    } else if (hasCenter) {
      instance.setView([coordinates.lat, coordinates.lng], 13);
    } else {
      instance.setView([INDIA_CENTER.lat, INDIA_CENTER.lng], 5);
    }
  };

  useEffect(() => {
    if (map && !didInitialFitRef.current) {
      didInitialFitRef.current = true;
      fitToCity(map);
      // The slide-over animates open, so Leaflet measures a 0-size box first.
      setTimeout(() => map.invalidateSize(), 350);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // ── Search (Nominatim) ──────────────────────────────────────────────
  const handleSearchInputChange = (value) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (value.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      setSearching(true);
      try {
        const params = new URLSearchParams({ q: value, format: 'jsonv2', countrycodes: 'in', limit: '6' });
        const res = await fetch(`${NOMINATIM_URL}?${params}`, {
          signal: controller.signal,
          headers: { 'Accept-Language': 'en' },
        });
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== 'AbortError') setSearchResults([]);
      } finally {
        if (searchAbortRef.current === controller) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleSearchSelect = (result) => {
    const point = { lat: Number(result.lat), lng: Number(result.lon) };
    setSearchQuery(result.display_name?.split(',').slice(0, 2).join(',') || '');
    setSearchResults([]);
    if (!map || !Number.isFinite(point.lat)) {
      toast.error('Could not locate that place');
      return;
    }
    map.flyTo([point.lat, point.lng], 14, { duration: 0.8 });
    // A brand-new city with no center yet: the place you searched for is the obvious one.
    if (!hasCenter) {
      pushHistory({ zones, coordinates });
      onCoordinatesChange(point);
      toast.success('City center set to this place - drag the blue dot to adjust');
    }
  };

  // ── Editing ─────────────────────────────────────────────────────────
  const pushHistory = (snapshot) => setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), snapshot]);

  const updateZone = (index, patch) => {
    onZonesChange(zones.map((zone, i) => (i === index ? { ...zone, ...patch } : zone)));
  };

  const moveZoneTo = (index, center) => {
    const radiusMeters = zones[index]?.radiusMeters || DEFAULT_ZONE_RADIUS_METERS;
    updateZone(index, { center, path: computeHexagonPath(center, radiusMeters) });
  };

  const handleMapClick = (event) => {
    if (polygonDragRef.current?.moved) return; // the click that ends a drag
    if (Date.now() < suppressClickUntilRef.current) return;
    const point = toLatLng(event.latlng);

    if (mode === 'center') {
      pushHistory({ zones, coordinates });
      onCoordinatesChange(point);
      setMode(null);
      return;
    }

    if (placingIndex !== null) {
      pushHistory({ zones, coordinates });
      const radiusMeters = zones[placingIndex]?.radiusMeters || DEFAULT_ZONE_RADIUS_METERS;
      updateZone(placingIndex, { center: point, radiusMeters, path: computeHexagonPath(point, radiusMeters) });
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
  };

  // Grab anywhere inside a hexagon and drag it. Leaflet has no draggable
  // polygons, so we pause map panning and follow the mouse ourselves.
  const handlePolygonMouseDown = (index, event) => {
    L.DomEvent.stop(event);
    const zone = zones[index];
    if (!zone?.center || !map) return;
    map.dragging.disable();
    polygonDragRef.current = {
      index,
      start: toLatLng(event.latlng),
      startCenter: zone.center,
      snapshot: { zones, coordinates },
      moved: false,
    };
    setMode(null);
    setPlacingIndex(null);
    setSelectedIndex(index);
  };

  const handleMouseMove = (event) => {
    const drag = polygonDragRef.current;
    if (!drag) return;
    drag.moved = true;
    const now = toLatLng(event.latlng);
    moveZoneTo(drag.index, {
      lat: drag.startCenter.lat + (now.lat - drag.start.lat),
      lng: drag.startCenter.lng + (now.lng - drag.start.lng),
    });
  };

  const handleMouseUp = () => {
    const drag = polygonDragRef.current;
    if (!drag) return;
    map?.dragging.enable();
    if (drag.moved) pushHistory(drag.snapshot);
    // Let the click event that follows mouseup see `moved`, then clear.
    setTimeout(() => {
      polygonDragRef.current = null;
    }, 0);
  };

  const handlersRef = useRef({});
  handlersRef.current = { onMapClick: handleMapClick, onMouseMove: handleMouseMove, onMouseUp: handleMouseUp };

  // A mouseup outside the map would otherwise leave panning disabled.
  useEffect(() => {
    const onWindowUp = () => handlersRef.current.onMouseUp();
    window.addEventListener('mouseup', onWindowUp);
    return () => window.removeEventListener('mouseup', onWindowUp);
  }, []);

  const handleRadiusChange = (index, radiusMeters) => {
    const center = zones[index]?.center;
    updateZone(index, { radiusMeters, path: center ? computeHexagonPath(center, radiusMeters) : undefined });
  };

  const handleResizeDrag = (index, latlng) => {
    const center = zones[index]?.center;
    if (!center) return;
    const radiusMeters = clampRadius(haversineDistance(center, toLatLng(latlng)));
    updateZone(index, { radiusMeters, path: computeHexagonPath(center, radiusMeters) });
  };

  const commitRadiusHistory = () => {
    if (radiusSnapshotRef.current) {
      pushHistory(radiusSnapshotRef.current);
      radiusSnapshotRef.current = null;
    }
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
      map.fitBounds(L.latLngBounds(zonePath(zone).map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 16 });
    }
  };

  const placeZoneOnMap = (index) => {
    setMode(null);
    setSelectedIndex(index);
    setPlacingIndex((current) => (current === index ? null : index));
  };

  const removeZone = (index) => {
    pushHistory({ zones, coordinates });
    onZonesChange(zones.filter((_, i) => i !== index));
    if (selectedIndex === index) setSelectedIndex(null);
    if (placingIndex === index) setPlacingIndex(null);
    const count = zones[index]?.merchantCount || 0;
    if (count > 0) {
      toast(`${count} store(s) in this zone will be moved to whichever zone their location falls in when you save.`, { icon: 'ℹ️' });
    }
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
  const selectedPath = useMemo(() => (selectedZone?.center ? zonePath(selectedZone) : []), [selectedZone]);

  const instruction =
    mode === 'center'
      ? 'Tap anywhere on the map to set the city center.'
      : mode === 'zone'
      ? 'Tap anywhere on the map to drop a new zone there.'
      : placingIndex !== null
      ? `Tap anywhere on the map to place "${zones[placingIndex]?.name || 'this zone'}".`
      : null;

  const crosshair = mode || placingIndex !== null;

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        {searching ? (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
        ) : (
          <SearchRoundedIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" sx={{ fontSize: 18 }} />
        )}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchInputChange(e.target.value)}
          onBlur={() => setTimeout(() => setSearchResults([]), 150)}
          placeholder="Search a city, area or landmark…"
          className="w-full h-11 bg-white border border-gray-200 rounded-xl pl-10 pr-3 text-sm font-medium focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
        />
        {searchResults.length > 0 && (
          <div className="absolute z-[1000] top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                type="button"
                // mousedown fires before the input's blur closes the list.
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSearchSelect(result);
                }}
                className="w-full text-left px-3 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0"
              >
                <span className="font-semibold">{result.display_name?.split(',')[0]}</span>
                <span className="block text-[11px] text-gray-400 truncate">{result.display_name?.split(',').slice(1).join(',')}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleAddZone}
          className={`flex-1 h-10 flex items-center justify-center gap-1.5 rounded-lg text-[11px] font-bold border transition-all ${
            mode === 'zone' ? 'bg-[#5EB929] text-white border-[#5EB929]' : 'bg-[#5EB929]/10 text-[#3f8a17] border-[#5EB929]/30'
          }`}
        >
          <AddLocationAltRoundedIcon sx={{ fontSize: 16 }} />
          {mode === 'zone' ? 'Tap the map…' : 'Add Zone'}
        </button>
        <button
          type="button"
          onClick={toggleSetCenter}
          className={`flex-1 h-10 flex items-center justify-center gap-1.5 rounded-lg text-[11px] font-bold border transition-all ${
            mode === 'center' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          <MyLocationRoundedIcon sx={{ fontSize: 15 }} />
          {mode === 'center' ? 'Tap the map…' : hasCenter ? 'Move City Center' : 'Set City Center'}
        </button>
        <button
          type="button"
          onClick={() => fitToCity()}
          title="Show the whole city"
          className="h-10 px-3 flex items-center justify-center rounded-lg border bg-white text-gray-500 border-gray-200"
        >
          <CenterFocusStrongRoundedIcon sx={{ fontSize: 17 }} />
        </button>
        <button
          type="button"
          onClick={handleUndo}
          disabled={!history.length}
          title="Undo last change"
          className="h-10 px-3 flex items-center justify-center rounded-lg border bg-white text-gray-500 border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <UndoRoundedIcon sx={{ fontSize: 17 }} />
        </button>
      </div>

      {instruction && (
        <p className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1 px-0.5">
          <PlaceRoundedIcon sx={{ fontSize: 13 }} />
          {instruction}
        </p>
      )}

      {/* Map. `relative z-0` keeps Leaflet's high z-index panes inside this box. */}
      <div
        className={`h-[26rem] sm:h-[32rem] rounded-2xl overflow-hidden border border-gray-100 relative z-0 ${
          crosshair ? '[&_.leaflet-container]:!cursor-crosshair' : ''
        }`}
      >
        <MapContainer
          ref={setMap}
          center={[INDIA_CENTER.lat, INDIA_CENTER.lng]}
          zoom={5}
          scrollWheelZoom
          className="w-full h-full"
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
          <MapEvents handlersRef={handlersRef} />

          {hasCenter && (
            <Marker
              position={[coordinates.lat, coordinates.lng]}
              icon={CITY_CENTER_ICON}
              draggable
              eventHandlers={{
                dragstart: () => pushHistory({ zones, coordinates }),
                dragend: (e) => {
                  endMarkerDrag();
                  onCoordinatesChange(toLatLng(e.target.getLatLng()));
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>City center</Tooltip>
            </Marker>
          )}

          {zones.map((zone, index) => {
            if (!zone.center) return null;
            const isSelected = index === selectedIndex;
            const color = zone.status === 'inactive' ? '#9CA3AF' : '#5EB929';
            return (
              <Polygon
                key={zoneKey(zone, index)}
                positions={zonePath(zone).map((p) => [p.lat, p.lng])}
                pathOptions={{
                  color,
                  weight: isSelected ? 3 : 1.5,
                  fillColor: color,
                  fillOpacity: isSelected ? 0.35 : 0.15,
                  dashArray: zone.status === 'inactive' ? '6 6' : undefined,
                }}
                eventHandlers={{
                  mousedown: (e) => handlePolygonMouseDown(index, e),
                  click: (e) => {
                    L.DomEvent.stop(e);
                    if (!polygonDragRef.current?.moved) setSelectedIndex(index);
                  },
                }}
              >
                <Tooltip permanent direction="center" className="!bg-white/90 !border-0 !shadow-sm !text-[11px] !font-bold !text-gray-700 !px-1.5 !py-0.5">
                  {zone.name || `Zone ${index + 1}`}
                </Tooltip>
              </Polygon>
            );
          })}

          {selectedZone?.center && (
            <Marker
              position={[selectedZone.center.lat, selectedZone.center.lng]}
              icon={ZONE_CENTER_ICON}
              draggable
              eventHandlers={{
                dragstart: () => pushHistory({ zones, coordinates }),
                drag: (e) => moveZoneTo(selectedIndex, toLatLng(e.target.getLatLng())),
                dragend: endMarkerDrag,
              }}
            />
          )}

          {selectedPath.length > 0 && (
            <Marker
              position={[selectedPath[1].lat, selectedPath[1].lng]}
              icon={RESIZE_HANDLE_ICON}
              draggable
              eventHandlers={{
                dragstart: () => {
                  resizeSnapshotRef.current = { zones, coordinates };
                },
                drag: (e) => handleResizeDrag(selectedIndex, e.target.getLatLng()),
                dragend: (e) => {
                  endMarkerDrag();
                  handleResizeDrag(selectedIndex, e.target.getLatLng());
                  if (resizeSnapshotRef.current) {
                    pushHistory(resizeSnapshotRef.current);
                    resizeSnapshotRef.current = null;
                  }
                },
              }}
            >
              <Tooltip direction="right" offset={[10, 0]}>Drag to resize</Tooltip>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Selected zone panel */}
      {selectedZone?.center && (
        <div className="p-3 bg-white rounded-xl border border-[#5EB929]/30 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <input
              type="text"
              value={selectedZone.name}
              onChange={(e) => updateZone(selectedIndex, { name: e.target.value })}
              placeholder="Zone name e.g. Beltola"
              className="flex-1 min-w-0 h-9 bg-gray-50 border border-gray-100 rounded-lg px-2.5 text-sm font-semibold outline-none focus:border-[#5EB929]"
            />
            <button
              type="button"
              onClick={() => removeZone(selectedIndex)}
              title="Delete this zone"
              className="p-1.5 rounded-md text-red-400 hover:bg-red-50"
            >
              <DeleteRoundedIcon sx={{ fontSize: 18 }} />
            </button>
            <button type="button" onClick={() => setSelectedIndex(null)} className="p-1.5 rounded-md text-gray-300 hover:text-gray-500">
              <CloseRoundedIcon sx={{ fontSize: 18 }} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">Size</span>
            <input
              type="range"
              min={MIN_ZONE_RADIUS_METERS}
              max={MAX_ZONE_RADIUS_METERS}
              step={ZONE_RADIUS_STEP_METERS}
              value={selectedZone.radiusMeters || DEFAULT_ZONE_RADIUS_METERS}
              onPointerDown={() => {
                radiusSnapshotRef.current = { zones, coordinates };
              }}
              onPointerUp={commitRadiusHistory}
              onChange={(e) => handleRadiusChange(selectedIndex, Number(e.target.value))}
              className="flex-1 accent-[#5EB929]"
            />
            <span className="text-[11px] font-bold text-gray-600 w-14 text-right">
              {((selectedZone.radiusMeters || DEFAULT_ZONE_RADIUS_METERS) / 1000).toFixed(2)} km
            </span>
          </div>
          <p className="text-[11px] text-gray-500 leading-snug">
            Drag the zone (or its green dot) to move it, and the white dot on its edge to resize it. Stores inside the zone are assigned to it automatically when you save.
          </p>
        </div>
      )}

      {/* Zone list */}
      <div className="space-y-2 pt-1">
        {zones.map((zone, index) => (
          <div
            key={zoneKey(zone, index)}
            className={`flex items-center gap-2 p-1.5 rounded-xl border ${index === selectedIndex ? 'border-[#5EB929]/40 bg-[#5EB929]/5' : 'border-transparent'}`}
          >
            <input
              type="text"
              value={zone.name}
              onChange={(e) => updateZone(index, { name: e.target.value })}
              placeholder="Zone name e.g. Beltola"
              className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl h-10 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
            />
            <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap" title="Stores in this zone">
              {zone.merchantCount || 0} stores
            </span>
            <button
              type="button"
              onClick={() => (zone.center ? locateZone(index) : placeZoneOnMap(index))}
              title={zone.center ? 'Show on map' : 'Place on map'}
              className={`p-2 rounded-lg shrink-0 border ${
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
              title={zone.status === 'inactive' ? 'Hidden from merchants and customers' : 'Visible to merchants and customers'}
              className={`px-2.5 h-9 rounded-lg text-[10px] font-bold border whitespace-nowrap ${
                zone.status === 'inactive' ? 'bg-gray-50 text-gray-400 border-gray-200' : 'bg-green-50 text-green-600 border-green-100'
              }`}
            >
              {zone.status === 'inactive' ? 'Off' : 'On'}
            </button>
            <button type="button" onClick={() => removeZone(index)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 shrink-0">
              <DeleteRoundedIcon sx={{ fontSize: 16 }} />
            </button>
          </div>
        ))}
        {zones.length === 0 && (
          <p className="text-[12px] text-gray-400 px-1">
            No zones yet. Search for the city, tap <span className="font-semibold text-[#3f8a17]">Add Zone</span>, then tap the map where the zone should be.
          </p>
        )}
      </div>
    </div>
  );
};

export default CityZoneMap;
