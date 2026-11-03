// Configurable acceptable distance threshold in meters for cleanup photo verification
export const CLEANUP_LOCATION_RADIUS_METERS = 100;

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  process.env.MAPBOX_TOKEN ||
  "";

/**
 * Calculates Haversine distance in meters between two lat/lon coordinates
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Formats distance nicely (e.g. "18 m" or "1.4 km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Known localities for instant resolution or offline fallback
 */
export const DEFAULT_LOCALITIES = [
  { area: "Indiranagar, 100ft Road", city: "Bengaluru", state: "Karnataka", latitude: 12.9784, longitude: 77.6408 },
  { area: "Koramangala 4th Block", city: "Bengaluru", state: "Karnataka", latitude: 12.9352, longitude: 77.6245 },
  { area: "HSR Layout, Sector 2", city: "Bengaluru", state: "Karnataka", latitude: 12.9121, longitude: 77.6446 },
  { area: "Whitefield, ITPL Main Rd", city: "Bengaluru", state: "Karnataka", latitude: 12.9698, longitude: 77.7499 },
  { area: "MG Road / Brigade Road", city: "Bengaluru", state: "Karnataka", latitude: 12.9716, longitude: 77.5946 },
  { area: "Jayanagar 4th Block", city: "Bengaluru", state: "Karnataka", latitude: 12.9308, longitude: 77.5838 },
];

/**
 * Reverse geocodes coordinates to Area, City, State.
 * Uses high-accuracy Mapbox Geocoding first, then OpenStreetMap Nominatim, then intelligent coordinate fallback.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ area: string; city: string; state: string }> {
  // 1. Try Mapbox Reverse Geocoding (Global, fast, highly reliable)
  if (MAPBOX_TOKEN) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,neighborhood,locality,place,poi`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const features = data?.features || [];
        if (features.length > 0) {
          const feat = features[0];
          let city = "";
          let state = "";
          let area = "";

          // Extract from context
          if (Array.isArray(feat.context)) {
            for (const c of feat.context) {
              if (c.id?.startsWith("place.")) city = c.text;
              if (c.id?.startsWith("region.")) state = c.text;
            }
          }

          // Format clean area from place_name
          const parts = (feat.place_name || "").split(",").map((s: string) => s.trim());
          if (parts.length >= 2) {
            area = `${parts[0]}, ${parts[1]}`;
          } else {
            area = parts[0] || feat.text || "Reported Location";
          }

          if (!city && parts.length >= 3) {
            city = parts[2];
          }

          return {
            area: area || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            city: city || "Civic Zone",
            state: state || "",
          };
        }
      }
    } catch {
      // Mapbox fetch error or timeout, proceed to fallback
    }
  }

  // 2. Try Nominatim (Safe for client & server without forbidden headers)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const isBrowser = typeof window !== "undefined";
    const headers: Record<string, string> = isBrowser
      ? {}
      : { "User-Agent": "UrbanTriage-Civic-App/1.0" };

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers,
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const area =
        addr.suburb ||
        addr.neighbourhood ||
        addr.residential ||
        addr.road ||
        addr.quarter ||
        addr.city_district ||
        "Detected Area";
      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        addr.county ||
        "Local District";
      const state = addr.state || "";

      return {
        area: `${area}, ${city}`,
        city,
        state,
      };
    }
  } catch {
    // network failure or abort
  }

  // 3. Fallback: Only match DEFAULT_LOCALITIES if coordinates are actually within ~35km of Bengaluru
  const BENGALURU_CENTER = { lat: 12.9716, lng: 77.5946 };
  const distFromBengaluru = calculateDistanceMeters(lat, lng, BENGALURU_CENTER.lat, BENGALURU_CENTER.lng);

  if (distFromBengaluru < 35000) {
    let closest = DEFAULT_LOCALITIES[0];
    let minDistance = Infinity;

    for (const loc of DEFAULT_LOCALITIES) {
      const d = calculateDistanceMeters(lat, lng, loc.latitude, loc.longitude);
      if (d < minDistance) {
        minDistance = d;
        closest = loc;
      }
    }

    return {
      area: closest.area,
      city: closest.city,
      state: closest.state,
    };
  }

  // Otherwise return standard clean coordinate tag
  return {
    area: `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    city: "Local Civic Zone",
    state: "",
  };
}

/**
 * Forward geocodes a location query (e.g. "Bandra Mumbai", "Whitefield", "Connaught Place Delhi")
 * into exact latitude, longitude, area, city, and state.
 */
export async function forwardGeocode(
  query: string
): Promise<{ latitude: number; longitude: number; area: string; city: string; state: string } | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // 1. Mapbox Forward Geocode
  if (MAPBOX_TOKEN) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const features = data?.features || [];
        if (features.length > 0) {
          const feat = features[0];
          const [lng, lat] = feat.center;

          let city = "";
          let state = "";

          if (Array.isArray(feat.context)) {
            for (const c of feat.context) {
              if (c.id?.startsWith("place.")) city = c.text;
              if (c.id?.startsWith("region.")) state = c.text;
            }
          }

          const parts = (feat.place_name || trimmed).split(",").map((s: string) => s.trim());
          const area = parts.length >= 2 ? `${parts[0]}, ${parts[1]}` : parts[0];

          return {
            latitude: lat,
            longitude: lng,
            area: area || trimmed,
            city: city || parts[1] || "City Zone",
            state: state || "",
          };
        }
      }
    } catch {
      // Mapbox failed, try Nominatim
    }
  }

  // 2. Nominatim Forward Geocode
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const isBrowser = typeof window !== "undefined";
    const headers: Record<string, string> = isBrowser
      ? {}
      : { "User-Agent": "UrbanTriage-Civic-App/1.0" };

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=1&addressdetails=1`,
      {
        headers,
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        const addr = item.address || {};

        const area =
          addr.suburb ||
          addr.neighbourhood ||
          addr.residential ||
          addr.road ||
          item.display_name?.split(",")?.[0] ||
          trimmed;

        const city =
          addr.city ||
          addr.town ||
          addr.municipality ||
          addr.county ||
          "City Zone";

        const state = addr.state || "";

        return {
          latitude: lat,
          longitude: lng,
          area: `${area}, ${city}`,
          city,
          state,
        };
      }
    }
  } catch {
    // fallback
  }

  // 3. Check preset matches
  const match = DEFAULT_LOCALITIES.find(
    (l) =>
      l.area.toLowerCase().includes(trimmed.toLowerCase()) ||
      trimmed.toLowerCase().includes(l.area.split(",")[0].toLowerCase())
  );
  if (match) {
    return {
      latitude: match.latitude,
      longitude: match.longitude,
      area: match.area,
      city: match.city,
      state: match.state,
    };
  }

  return null;
}
