"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { getLocalTasks } from "@/lib/task-store";
import { CleanupTask } from "@/lib/types";

interface LocationGroup {
  key: string;
  latitude: number;
  longitude: number;
  area: string;
  tasks: CleanupTask[];
  openCount: number;
  completedCount: number;
}

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-[#06110D] text-[#19D879]">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#19D879]/20 border-t-[#19D879]" />
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-[#91A99C]">
              Loading Environmental Map...
            </p>
          </div>
        </div>
      }
    >
      <MapContent />
    </Suspense>
  );
}

function MapContent() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletLibRef = useRef<any>(null);
  const taskLayerGroupRef = useRef<any>(null);
  const searchParams = useSearchParams();

  const [locationStatus, setLocationStatus] = useState<
    "locating" | "active" | "denied"
  >("locating");

  const [tasks, setTasks] = useState<CleanupTask[]>([]);
  const [userRole, setUserRole] = useState<"user" | "volunteer">("user");
  const [activeModalGroup, setActiveModalGroup] = useState<LocationGroup | null>(null);
  const [activeModalIncidentIndex, setActiveModalIncidentIndex] = useState(0);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const zoomParam = searchParams.get("zoom");
  const statusParam = searchParams.get("status");
  const taskIdParam = searchParams.get("taskId");

  const fallbackLat = Number(latParam) || 12.9716;
  const fallbackLng = Number(lngParam) || 77.5946;
  const fallbackZoom = Number(zoomParam) || 13;

  const taskSelected = Boolean((latParam && lngParam) || taskIdParam);
  const ACTIVITY_RADIUS = 900;

  // Detect user role from local storage
  useEffect(() => {
    try {
      const storedRole = localStorage.getItem("urbantriage_role");
      if (storedRole === "volunteer") {
        setUserRole("volunteer");
      } else {
        setUserRole("user");
      }
    } catch {
      setUserRole("user");
    }
  }, []);

  // Selected task state for top banner
  const selectedTask = tasks.find(
    (t) =>
      (taskIdParam && t.id === taskIdParam) ||
      (taskSelected &&
        Math.abs(t.location.latitude - fallbackLat) < 0.001 &&
        Math.abs(t.location.longitude - fallbackLng) < 0.001)
  );

  const isSelectedCompleted =
    selectedTask?.status === "completed" || statusParam === "completed";

  // Refresh tasks from local storage
  const refreshTasks = useCallback(() => {
    const current = getLocalTasks();
    setTasks(current);
  }, []);

  // Listen to cross-component and cross-tab task updates
  useEffect(() => {
    refreshTasks();

    const handleTaskUpdate = () => {
      refreshTasks();
    };

    window.addEventListener("urbantriage_tasks_updated", handleTaskUpdate);
    window.addEventListener("storage", handleTaskUpdate);

    return () => {
      window.removeEventListener("urbantriage_tasks_updated", handleTaskUpdate);
      window.removeEventListener("storage", handleTaskUpdate);
    };
  }, [refreshTasks]);

  // Group tasks by geographic proximity (~70 meters / 0.0007 deg)
  const locationGroups = useMemo<LocationGroup[]>(() => {
    const groups: LocationGroup[] = [];

    tasks.forEach((t) => {
      const existing = groups.find(
        (g) =>
          Math.abs(g.latitude - t.location.latitude) < 0.0007 &&
          Math.abs(g.longitude - t.location.longitude) < 0.0007
      );

      if (existing) {
        existing.tasks.push(t);
        if (t.status === "completed") {
          existing.completedCount += 1;
        } else {
          existing.openCount += 1;
        }
      } else {
        groups.push({
          key: `${t.location.latitude.toFixed(4)},${t.location.longitude.toFixed(4)}`,
          latitude: t.location.latitude,
          longitude: t.location.longitude,
          area: t.location.area || "Bengaluru",
          tasks: [t],
          openCount: t.status === "completed" ? 0 : 1,
          completedCount: t.status === "completed" ? 1 : 0,
        });
      }
    });

    return groups;
  }, [tasks]);

  // Register window callbacks so HTML inside Leaflet popups can open React Modal without navigating to tasks
  useEffect(() => {
    (window as any).urbanTriageShowGroupDetails = (groupKey: string) => {
      const found = locationGroups.find((g) => g.key === groupKey);
      if (found) {
        setActiveModalGroup(found);
        setActiveModalIncidentIndex(0);
      }
    };

    (window as any).urbanTriageShowTaskDetails = (taskId: string) => {
      const foundGroup = locationGroups.find((g) =>
        g.tasks.some((t) => t.id === taskId)
      );
      if (foundGroup) {
        const index = foundGroup.tasks.findIndex((t) => t.id === taskId);
        setActiveModalGroup(foundGroup);
        setActiveModalIncidentIndex(index >= 0 ? index : 0);
      }
    };

    return () => {
      delete (window as any).urbanTriageShowGroupDetails;
      delete (window as any).urbanTriageShowTaskDetails;
    };
  }, [locationGroups]);

  // HTML generator for Single Incident Dot
  const createSingleDotHtml = (
    color: "#FF3B30" | "#19D879",
    isSelected: boolean,
    isCompleted: boolean
  ) => {
    const size = isSelected ? 36 : 28;
    const dotSize = isSelected ? 18 : 14;
    const pulseAnim = isCompleted ? "urbanTriageGreenPulse" : "urbanTriageRedPulse";
    const glowColor =
      color === "#FF3B30" ? "rgba(255, 59, 48, 0.95)" : "rgba(25, 216, 121, 0.95)";

    return `
      <div style="position: relative; width: ${size}px; height: ${size}px; cursor: pointer;">
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: ${color};
          opacity: 0.38;
          animation: ${pulseAnim} 2.2s cubic-bezier(0.24, 0, 0.38, 1) infinite;
        "></div>
        <div style="
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: ${dotSize}px;
          height: ${dotSize}px;
          border-radius: 50%;
          background: ${color};
          border: 2.5px solid #FFFFFF;
          box-shadow: 0 0 16px ${glowColor}, 0 2px 8px rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${
            isCompleted
              ? `<svg width="9" height="7" viewBox="0 0 10 8" fill="none" style="display: block;">
                   <path d="M1 4L3.8 6.8L9 1.2" stroke="#06110D" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                 </svg>`
              : ""
          }
        </div>
      </div>
    `;
  };

  // HTML generator for MULTIPLE INCIDENTS Cluster Dot (shows count)
  const createClusterDotHtml = (
    group: LocationGroup,
    isSelected: boolean
  ) => {
    const count = group.tasks.length;
    const hasOpen = group.openCount > 0;
    const allCompleted = group.openCount === 0 && group.completedCount > 0;
    const isMixed = group.openCount > 0 && group.completedCount > 0;

    const baseColor = allCompleted ? "#19D879" : "#FF3B30";
    const pulseAnim = allCompleted ? "urbanTriageGreenPulse" : "urbanTriageRedPulse";
    const size = isSelected ? 44 : 36;
    const badgeSize = isSelected ? 28 : 24;

    return `
      <div style="position: relative; width: ${size}px; height: ${size}px; cursor: pointer;">
        <!-- Pulsing Aura -->
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: ${baseColor};
          opacity: 0.45;
          animation: ${pulseAnim} 2s cubic-bezier(0.24, 0, 0.38, 1) infinite;
        "></div>

        <!-- Center Badge with Count -->
        <div style="
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: ${badgeSize}px;
          height: ${badgeSize}px;
          border-radius: 50%;
          background: ${baseColor};
          border: 2.5px solid #FFFFFF;
          box-shadow: 0 0 18px ${baseColor}, 0 2px 10px rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: ${count >= 10 ? "10px" : "12px"};
          font-weight: 800;
          letter-spacing: -0.02em;
        ">
          ${count}
        </div>

        <!-- Sub-badge indicator if mixed (Active + Cleaned) -->
        ${
          isMixed
            ? `<div style="
                 position: absolute;
                 bottom: -2px;
                 right: -2px;
                 width: 10px;
                 height: 10px;
                 border-radius: 50%;
                 background: #19D879;
                 border: 1.5px solid #FFFFFF;
               "></div>`
            : ""
        }
      </div>
    `;
  };

  // Helper for human-readable relative time formatting
  const formatIncidentTime = (isoString?: string): string => {
    if (!isoString) return "Recently";
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      if (diffMs < 0 || diffMs < 60000) return "Just now";
      const mins = Math.floor(diffMs / 60000);
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days === 1) return "Yesterday";
      if (days < 7) return `${days}d ago`;
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "Recently";
    }
  };

  // Popup HTML builder (Shows ALL incidents at the location, strictly NO tasks navigation)
  const buildPopupHtml = (group: LocationGroup) => {
    const count = group.tasks.length;

    if (count === 1) {
      const t = group.tasks[0];
      const isCompleted = t.status === "completed";
      const statusLabel = isCompleted ? "🟢 CLEANUP DONE & VERIFIED" : "🔴 SCHEDULED CLEANUP (ACTIVE)";
      const statusColor = isCompleted ? "#19D879" : "#FF5364";
      const timeDisplay = formatIncidentTime(t.reportedAt);

      return `
        <div style="min-width: 250px; max-width: 290px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.14em; color: ${statusColor};">
              ${statusLabel}
            </div>
            <span style="font-size: 9px; font-weight: 600; background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; color: #91A99C;">
              ${timeDisplay}
            </span>
          </div>

          ${
            t.imageUrl
              ? `<div style="width: 100%; height: 110px; border-radius: 10px; overflow: hidden; margin-bottom: 8px; background: #0B2118;">
                   <img src="${t.imageUrl}" alt="${t.wasteCategory}" style="width: 100%; height: 100%; object-fit: cover;" />
                 </div>`
              : ""
          }

          <div style="font-size: 14px; font-weight: 700; color: #FFFFFF; margin-bottom: 2px;">
            ${t.wasteCategory || "Waste Incident"}
          </div>
          <div style="font-size: 11px; color: #91A99C; margin-bottom: 6px;">
            📍 ${t.location.area}
          </div>
          <div style="font-size: 11px; color: #BACDC3; margin-bottom: 6px;">
            Detected: <strong style="color: #FFFFFF;">${t.wasteTypes?.join(", ") || t.wasteCategory}</strong> · ${t.quantity.scale} scale
          </div>
          ${
            typeof t.threatScore === "number" || t.isAuthentic || t.hazmatInfo?.isHazmat
              ? `<div style="font-size: 10px; margin-bottom: 8px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px;">
                   ${t.hazmatInfo?.isHazmat ? `<span style="padding: 2px 6px; border-radius: 4px; font-weight: 700; background: rgba(255,50,50,0.25); color: #FF4D4D; border: 1px solid rgba(255,50,50,0.4);">☣️ HAZMAT [${t.hazmatInfo.priority || "CRITICAL"}]</span>` : ""}
                   ${typeof t.threatScore === "number" ? `<span style="padding: 2px 6px; border-radius: 4px; font-weight: 600; background: ${t.threatDetected ? "rgba(255,83,100,0.15)" : "rgba(25,216,121,0.15)"}; color: ${t.threatDetected ? "#FF5364" : "#19D879"};">${t.threatDetected ? "⚡ THREAT ACTIVE" : "THREAT CLEAR"} (${Math.round(t.threatScore * 100)}%)</span>` : ""}
                   ${t.isAuthentic ? `<span style="color: #19D879; font-weight: 600;">✓ EXIF</span>` : ""}
                 </div>`
              : ""
          }

          <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px;">
            <div style="display: flex; gap: 6px; align-items: center;">
              <button onclick="window.urbanTriageShowTaskDetails('${t.id}')" style="
                background: #19D879;
                color: #06110D;
                font-size: 11px;
                font-weight: 700;
                border: none;
                border-radius: 6px;
                padding: 5px 10px;
                cursor: pointer;
              ">
                View Details →
              </button>
              <a href="/volunteer/tasks/${t.id}" style="
                background: rgba(25,216,121,0.15);
                color: #19D879;
                border: 1px solid rgba(25,216,121,0.35);
                font-size: 11px;
                font-weight: 700;
                border-radius: 6px;
                padding: 4px 8px;
                text-decoration: none;
              ">
                Back to Task →
              </a>
            </div>
            <a href="/report?lat=${t.location.latitude}&lng=${t.location.longitude}" style="
              color: #91A99C;
              font-size: 10px;
              text-decoration: underline;
            ">
              + Report Here
            </a>
          </div>
        </div>
      `;
    }

    // MULTIPLE INCIDENTS at this location
    return `
      <div style="min-width: 280px; max-width: 320px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2px;">
        <div style="border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: #FFB84D; text-transform: uppercase;">
              ⚡ ${count} INCIDENTS AT THIS PLACE
            </div>
            <div style="display: flex; gap: 4px;">
              ${group.openCount > 0 ? `<span style="font-size: 9px; font-weight: 700; background: rgba(255,59,48,0.25); color: #FF5364; padding: 2px 6px; border-radius: 5px;">${group.openCount} Active</span>` : ""}
              ${group.completedCount > 0 ? `<span style="font-size: 9px; font-weight: 700; background: rgba(25,216,121,0.25); color: #19D879; padding: 2px 6px; border-radius: 5px;">${group.completedCount} Cleaned</span>` : ""}
            </div>
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #FFFFFF; margin-top: 3px;">
            📍 ${group.area}
          </div>
        </div>

        <div style="max-height: 200px; overflow-y: auto; padding-right: 2px; display: flex; flex-direction: column; gap: 6px;">
          ${group.tasks
            .map(
              (t, i) => `
            <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 7px 9px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                <span style="font-size: 10px; font-weight: 700; color: ${t.status === "completed" ? "#19D879" : "#FF5364"};">
                  ${t.status === "completed" ? "🟢 Cleaned" : "🔴 Active Waste"}
                </span>
                <span style="font-size: 9px; color: #91A99C;">
                  ${formatIncidentTime(t.reportedAt)} · ${t.severity}
                </span>
              </div>
              <div style="font-size: 12px; font-weight: 700; color: #FFFFFF;">
                ${t.wasteCategory || "Waste Hotspot"}
              </div>
              <div style="font-size: 10px; color: #91A99C; margin-top: 2px;">
                ${t.wasteTypes?.slice(0, 2).join(", ") || "General waste"} · ${t.quantity.scale} scale
              </div>
            </div>
          `
            )
            .join("")}
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px; margin-top: 8px;">
          <button onclick="window.urbanTriageShowGroupDetails('${group.key}')" style="
            background: #19D879;
            color: #06110D;
            font-size: 11px;
            font-weight: 700;
            border: none;
            border-radius: 6px;
            padding: 5px 12px;
            cursor: pointer;
          ">
            View All ${count} Incidents →
          </button>
          <a href="/report?lat=${group.latitude}&lng=${group.longitude}" style="
            color: #91A99C;
            font-size: 10px;
            text-decoration: underline;
          ">
            + Report Here
          </a>
        </div>
      </div>
    `;
  };

  // Re-draw task markers whenever locationGroups change or map is ready
  useEffect(() => {
    const L = leafletLibRef.current;
    const map = mapInstanceRef.current;
    const layerGroup = taskLayerGroupRef.current;

    if (!L || !map || !layerGroup) return;

    // Clear previous markers
    layerGroup.clearLayers();

    let matchedSelected = false;

    // RENDER LOCATION GROUPS (SINGLE OR MULTI-INCIDENT CLUSTERS)
    locationGroups.forEach((group: LocationGroup) => {
      const isSelected =
        taskSelected &&
        Math.abs(group.latitude - fallbackLat) < 0.001 &&
        Math.abs(group.longitude - fallbackLng) < 0.001;

      if (isSelected) matchedSelected = true;

      const isCluster = group.tasks.length > 1;
      const singleTask = group.tasks[0];
      const isCompleted = isCluster
        ? group.openCount === 0 && group.completedCount > 0
        : singleTask.status === "completed";
      const markerColor = isCompleted ? "#19D879" : "#FF3B30";
      const size = isCluster
        ? isSelected
          ? 44
          : 36
        : isSelected
        ? 36
        : 28;

      const markerHtml = isCluster
        ? createClusterDotHtml(group, isSelected)
        : createSingleDotHtml(markerColor, isSelected, isCompleted);

      const dotIcon = L.divIcon({
        className: "",
        html: markerHtml,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([group.latitude, group.longitude], {
        icon: dotIcon,
        zIndexOffset: isSelected ? 800 : isCluster ? 500 : 300,
      });

      // Bind interactive popup
      const popup = L.popup({
        maxWidth: 340,
        minWidth: 260,
        autoPan: true,
        closeButton: true,
        offset: [0, -10],
      });
      popup.setContent(buildPopupHtml(group));
      marker.bindPopup(popup);

      // HOVER INTERACTION: hover around to view incidents
      marker.on("mouseover", () => {
        marker.openPopup();
      });

      // CLICK INTERACTION: opens popup and prepares detail modal
      marker.on("click", () => {
        marker.openPopup();
      });

      layerGroup.addLayer(marker);

      if (isSelected) {
        marker.openPopup();
      }
    });

    // IF A QUERY PARAM COORDINATE WAS PROVIDED AND NOT MATCHED, RENDER APPROPRIATE DOT
    if (taskSelected && !matchedSelected) {
      const isCompleted = statusParam === "completed";
      const markerColor = isCompleted ? "#19D879" : "#FF3B30";
      const size = 36;

      const dotIcon = L.divIcon({
        className: "",
        html: createSingleDotHtml(markerColor, true, isCompleted),
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const adHocMarker = L.marker([fallbackLat, fallbackLng], {
        icon: dotIcon,
        zIndexOffset: 800,
      });

      const popupHtml = `
        <div style="min-width: 220px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2px;">
          <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.15em; color: ${markerColor}; margin-bottom: 4px;">
            ${isCompleted ? "🟢 CLEANUP VERIFIED" : "🚨 REPORTED INCIDENT (ACTIVE)"}
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #FFFFFF; margin-bottom: 2px;">
            ${isCompleted ? "Verified Cleaned Site" : "Reported Waste Hotspot"}
          </div>
          <div style="font-size: 11px; color: #91A99C; margin-bottom: 8px;">
            ${fallbackLat.toFixed(4)}, ${fallbackLng.toFixed(4)}
          </div>
          <a href="/report?lat=${fallbackLat}&lng=${fallbackLng}" style="color: #19D879; font-size: 11px; text-decoration: underline;">
            + Report additional details
          </a>
        </div>
      `;

      adHocMarker.bindPopup(popupHtml);
      layerGroup.addLayer(adHocMarker);
      adHocMarker.openPopup();
    }
  }, [locationGroups, fallbackLat, fallbackLng, taskSelected, statusParam]);

  // Leaflet Map Initialization & Auto-Framing so dots are ALWAYS visible on clicking City Map
  useEffect(() => {
    let map: any;
    let userMarker: any;
    let radiusCircle: any;
    let locationAccuracyCircle: any;
    let cancelled = false;

    const loadMap = async () => {
      try {
        const L = await import("leaflet");
        leafletLibRef.current = L;

        if (!mapContainer.current || cancelled) return;

        // Reset previous leaflet instance if container was reused
        if ((mapContainer.current as any)._leaflet_id) {
          (mapContainer.current as any)._leaflet_id = null;
        }

        // INITIAL MAP INSTANCE
        map = L.map(mapContainer.current, {
          center: [fallbackLat, fallbackLng],
          zoom: fallbackZoom,
          zoomControl: false,
        });

        mapInstanceRef.current = map;

        // Tile layer
        L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }
        ).addTo(map);

        // Zoom controls bottom right
        L.control
          .zoom({
            position: "bottomright",
          })
          .addTo(map);

        // Task markers layer group
        const layerGroup = L.layerGroup().addTo(map);
        taskLayerGroupRef.current = layerGroup;

        // Trigger task marker generation
        refreshTasks();

        // INITIALLY FIT MAP TO ALL INCIDENTS SO DOTS ARE ALWAYS VISIBLE WHEN CLICKING CITY MAP!
        const currentTasks = getLocalTasks();
        if (currentTasks.length > 0 && !taskSelected) {
          const points = currentTasks.map(
            (t) => [t.location.latitude, t.location.longitude] as [number, number]
          );
          const bounds = L.latLngBounds(points);
          map.fitBounds(bounds, {
            padding: [90, 90],
            maxZoom: 14,
            animate: false,
          });
        }

        setTimeout(() => {
          if (map) {
            map.invalidateSize();
          }
        }, 150);

        // CURRENT USER LOCATION HANDLING
        if (!navigator.geolocation) {
          setLocationStatus("denied");
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (cancelled || !map) return;

            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            setUserCoords({ lat: userLat, lng: userLng });

            const userIcon = L.divIcon({
              className: "",
              html: `
                <div style="position: relative; width: 22px; height: 22px;">
                  <div style="
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: 22px;
                    height: 22px;
                    transform: translate(-50%, -50%);
                    border-radius: 50%;
                    background: rgba(77,166,255,0.20);
                    animation: urbanTriageLocationPulse 2s infinite;
                  "></div>
                  <div style="
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: 12px;
                    height: 12px;
                    transform: translate(-50%, -50%);
                    border-radius: 50%;
                    background: #4DA6FF;
                    border: 3px solid white;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.35);
                  "></div>
                </div>
              `,
              iconSize: [22, 22],
              iconAnchor: [11, 11],
            });

            userMarker = L.marker([userLat, userLng], {
              icon: userIcon,
              zIndexOffset: 1000,
            });

            userMarker.addTo(map).bindPopup(
              `
                <div style="min-width: 150px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  <div style="
                    font-size: 10px;
                    font-weight: 600;
                    letter-spacing: 0.15em;
                    color: #268BE8;
                    margin-bottom: 6px;
                  ">
                    YOUR LOCATION
                  </div>
                  <div style="font-size: 14px; font-weight: 600; color: #FFFFFF;">
                    You are here
                  </div>
                  <div style="margin-top: 5px; font-size: 11px; color: #91A99C;">
                    900 m monitoring radius
                  </div>
                </div>
              `
            );

            // 900 M ACTIVITY RADIUS
            radiusCircle = L.circle([userLat, userLng], {
              radius: ACTIVITY_RADIUS,
              color: "#4DA6FF",
              weight: 1.5,
              opacity: 0.55,
              fillColor: "#4DA6FF",
              fillOpacity: 0.045,
              dashArray: "6 8",
            });
            radiusCircle.addTo(map);

            if (position.coords.accuracy) {
              locationAccuracyCircle = L.circle([userLat, userLng], {
                radius: position.coords.accuracy,
                color: "#4DA6FF",
                weight: 1,
                opacity: 0.25,
                fillColor: "#4DA6FF",
                fillOpacity: 0.06,
              });
              locationAccuracyCircle.addTo(map);
            }

            // SMART ZOOMING:
            // If user is within 35 km of the incidents, include both user location and incidents!
            // If user is far away (e.g. testing remotely), KEEP map framed on incidents so dots are NOT lost!
            if (!taskSelected) {
              const userPoint = L.latLng(userLat, userLng);
              const cityPoint = L.latLng(12.9716, 77.5946);
              const distFromCity = userPoint.distanceTo(cityPoint);

              const allTasks = getLocalTasks();
              if (allTasks.length > 0) {
                const points = allTasks.map(
                  (t) => [t.location.latitude, t.location.longitude] as [number, number]
                );

                if (distFromCity <= 35000) {
                  // User is nearby: show user + all incidents
                  const combined = L.latLngBounds([...points, [userLat, userLng]]);
                  map.fitBounds(combined, {
                    padding: [80, 80],
                    maxZoom: 14,
                    animate: true,
                  });
                } else {
                  // User is testing from far away: keep incident dots in view!
                  const incidentBounds = L.latLngBounds(points);
                  map.fitBounds(incidentBounds, {
                    padding: [80, 80],
                    maxZoom: 14,
                    animate: true,
                  });
                }
              }
            } else {
              // Specific task was selected (e.g. from report submission)
              const userPoint = L.latLng(userLat, userLng);
              const taskPoint = L.latLng(fallbackLat, fallbackLng);
              const distance = userPoint.distanceTo(taskPoint);

              if (distance > 1100 && distance < 35000) {
                const bounds = L.latLngBounds([
                  [userLat, userLng],
                  [fallbackLat, fallbackLng],
                ]);
                map.fitBounds(bounds, {
                  padding: [70, 70],
                  maxZoom: 14,
                  animate: true,
                });
              } else {
                map.setView([fallbackLat, fallbackLng], 15, { animate: true });
              }
            }

            setLocationStatus("active");
          },
          (error) => {
            if (cancelled) return;
            console.log("Unable to get current location:", error.message);
            setLocationStatus("denied");
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      } catch (err) {
        console.error("Map initialization error:", err);
      }
    };

    loadMap();

    return () => {
      cancelled = true;
      if (userMarker) userMarker.remove();
      if (radiusCircle) radiusCircle.remove();
      if (locationAccuracyCircle) locationAccuracyCircle.remove();
      if (taskLayerGroupRef.current) taskLayerGroupRef.current.clearLayers();
      if (map) map.remove();
    };
  }, [fallbackLat, fallbackLng, fallbackZoom, taskSelected, refreshTasks]);

  // Fit all incidents helper button
  const fitAllIncidents = () => {
    const map = mapInstanceRef.current;
    const L = leafletLibRef.current;
    if (!map || !L || tasks.length === 0) return;

    const points = tasks.map(
      (t) => [t.location.latitude, t.location.longitude] as [number, number]
    );
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, {
      padding: [80, 80],
      maxZoom: 15,
      animate: true,
    });
  };

  // Zoom to user location helper button
  const zoomToUser = () => {
    const map = mapInstanceRef.current;
    if (!map || !userCoords) return;
    map.setView([userCoords.lat, userCoords.lng], 15, { animate: true });
  };

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#06110D]">
      {/* Dark Leaflet Popup Styling */}
      <style>{`
        @keyframes urbanTriageRedPulse {
          0% {
            transform: scale(0.9);
            opacity: 0.85;
          }
          70% {
            transform: scale(2.2);
            opacity: 0;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
        @keyframes urbanTriageGreenPulse {
          0% {
            transform: scale(0.9);
            opacity: 0.85;
          }
          70% {
            transform: scale(2.1);
            opacity: 0;
          }
          100% {
            transform: scale(2.1);
            opacity: 0;
          }
        }
        @keyframes urbanTriageLocationPulse {
          0% {
            transform: translate(-50%, -50%) scale(0.7);
            opacity: 0.9;
          }
          70% {
            transform: translate(-50%, -50%) scale(1.7);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.7);
            opacity: 0;
          }
        }
        .leaflet-popup-content-wrapper {
          background: #071A12 !important;
          color: #F4FFF8 !important;
          border: 1px solid rgba(255, 255, 255, 0.14) !important;
          border-radius: 16px !important;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.65) !important;
          padding: 2px !important;
        }
        .leaflet-popup-tip {
          background: #071A12 !important;
          border: 1px solid rgba(255, 255, 255, 0.14) !important;
        }
        .leaflet-popup-content {
          margin: 12px 14px !important;
          line-height: 1.4 !important;
        }
        .leaflet-popup-close-button {
          color: #91A99C !important;
          padding: 8px 10px 0 0 !important;
        }
        .leaflet-popup-close-button:hover {
          color: #FFFFFF !important;
        }
      `}</style>

      {/* MAP CONTAINER */}
      <div
        ref={mapContainer}
        className="absolute inset-0 z-0 h-full w-full"
        style={{ minHeight: "100vh", width: "100%" }}
      />

      {/* TOP LEFT BRANDING & CITIZEN BADGE */}
      <div className="pointer-events-none absolute left-6 top-6 z-[1000]">
        <div className="rounded-2xl border border-white/10 bg-[#06110D]/85 px-5 py-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#19D879]">
              UrbanTriage
            </p>
            <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[9px] font-semibold text-[#91A99C]">
              Citizen Mode
            </span>
          </div>
          <h1 className="mt-1 text-xl font-semibold text-white">
            Civic Environmental Map
          </h1>
          <p className="mt-1 text-xs text-[#91A99C]">
            Hover or click dots to inspect single or clustered waste incidents
          </p>
        </div>
      </div>

      {/* TOP RIGHT NAV */}
      <div className="absolute right-6 top-6 z-[1000] flex items-center gap-2">
        {taskIdParam || selectedTask ? (
          <Link
            href={`/volunteer/tasks/${taskIdParam || selectedTask?.id}`}
            className="rounded-xl border border-[#19D879]/50 bg-[#19D879]/20 px-4 py-2.5 text-sm font-bold text-[#19D879] shadow-xl backdrop-blur-xl transition-all duration-200 hover:bg-[#19D879]/30 hover:scale-105 flex items-center gap-2"
          >
            <span>← Back to Task</span>
          </Link>
        ) : (
          <Link
            href="/volunteer/tasks"
            className="rounded-xl border border-white/10 bg-[#06110D]/85 px-4 py-2.5 text-sm font-medium text-[#91A99C] shadow-xl backdrop-blur-xl transition-all duration-200 hover:border-[#19D879]/30 hover:bg-[#0B2118] hover:text-[#F4FFF8]"
          >
            ← Tasks
          </Link>
        )}

        <Link
          href="/report"
          className="rounded-xl border border-white/10 bg-[#06110D]/85 px-4 py-2.5 text-sm font-medium text-[#F4FFF8] shadow-xl backdrop-blur-xl transition-all duration-200 hover:border-[#19D879]/30 hover:bg-[#0B2118]"
        >
          Report Incident
        </Link>

        <span className="rounded-xl border border-[#19D879]/30 bg-[#19D879]/10 px-4 py-2.5 text-sm font-medium text-[#19D879] shadow-xl backdrop-blur-xl">
          City Map
        </span>

        {userRole === "volunteer" ? (
          <Link
            href="/volunteer"
            className="rounded-xl border border-white/10 bg-[#06110D]/85 px-4 py-2.5 text-sm font-medium text-[#91A99C] shadow-xl backdrop-blur-xl transition-all duration-200 hover:border-[#19D879]/30 hover:bg-[#0B2118] hover:text-[#F4FFF8]"
          >
            Volunteer Hub
          </Link>
        ) : null}

        <Link
          href="/"
          className="rounded-xl border border-white/10 bg-[#06110D]/85 px-4 py-2.5 text-sm font-medium text-[#91A99C] shadow-xl backdrop-blur-xl transition-all duration-200 hover:border-[#19D879]/30 hover:bg-[#0B2118] hover:text-[#F4FFF8]"
        >
          Home
        </Link>
      </div>

      {/* CENTER STATUS & QUICK MAP ACTIONS */}
      <div className="absolute left-1/2 top-6 z-[1000] -translate-x-1/2 flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#06110D]/85 px-4 py-2.5 shadow-xl backdrop-blur-xl">
          {locationStatus === "locating" && (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#FFB84D]" />
              <span className="text-xs font-medium text-[#F4FFF8]">
                Locating you...
              </span>
            </>
          )}

          {locationStatus === "active" && (
            <>
              <span className="h-2 w-2 rounded-full bg-[#4DA6FF] shadow-[0_0_10px_rgba(77,166,255,0.7)]" />
              <span className="text-xs font-medium text-[#F4FFF8]">
                {userCoords ? "GPS active · 900 m radius" : "Locating"}
              </span>
            </>
          )}

          {locationStatus === "denied" && (
            <>
              <span className="h-2 w-2 rounded-full bg-[#FF5364]" />
              <span className="text-xs font-medium text-[#F4FFF8]">
                Showing City Incidents
              </span>
            </>
          )}
        </div>

        {/* Quick view button: Fit All Incidents */}
        <button
          type="button"
          onClick={fitAllIncidents}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#06110D]/85 px-3.5 py-2.5 text-xs font-semibold text-[#19D879] shadow-xl backdrop-blur-xl transition hover:border-[#19D879]/40 hover:bg-[#0B2118]"
          title="Fit all reported incident dots in view"
        >
          <span>🎯</span> Fit All Dots
        </button>

        {userCoords && (
          <button
            type="button"
            onClick={zoomToUser}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#06110D]/85 px-3.5 py-2.5 text-xs font-semibold text-[#4DA6FF] shadow-xl backdrop-blur-xl transition hover:border-[#4DA6FF]/40 hover:bg-[#0B2118]"
            title="Pan map to your current GPS position"
          >
            <span>📍</span> My Location
          </button>
        )}
      </div>

      {/* SELECTED TASK BANNER (If redirected from report) */}
      {taskSelected && (
        <div className="absolute left-1/2 top-[76px] z-[1000] -translate-x-1/2">
          {isSelectedCompleted ? (
            <div className="flex items-center gap-2 rounded-full border border-[#19D879]/40 bg-[#06110D]/90 px-4 py-2.5 shadow-xl backdrop-blur-xl">
              <span className="h-2.5 w-2.5 rounded-full bg-[#19D879] shadow-[0_0_10px_rgba(25,216,121,0.8)]" />
              <span className="text-xs font-semibold text-[#19D879]">
                🟢 Done & Verified Cleanup Marked Here
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-full border border-[#FF3B30]/40 bg-[#06110D]/90 px-4 py-2.5 shadow-xl backdrop-blur-xl">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#FF3B30] shadow-[0_0_10px_rgba(255,59,48,0.8)]" />
              <span className="text-xs font-semibold text-[#FF5364]">
                🔴 Scheduled Cleanup Marked (Needs Volunteers)
              </span>
            </div>
          )}
        </div>
      )}

      {/* MAP LEGEND: SINGLE & MULTIPLE INCIDENTS */}
      <div className="absolute bottom-6 left-6 z-[1000] rounded-2xl border border-white/10 bg-[#06110D]/90 px-5 py-4 backdrop-blur-xl">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#91A99C]">
          Map Legend
        </p>

        <div className="space-y-2.5 text-xs text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#FF3B30]/25">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF3B30] shadow-[0_0_8px_#FF3B30]" />
            </span>
            <span className="font-semibold text-[#FF5364]">
              Active Waste (Single Dot)
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#FF3B30] text-[9px] font-extrabold text-white shadow-[0_0_8px_#FF3B30]">
              3
            </span>
            <span className="font-semibold text-[#FFB84D]">
              Multiple Incidents (Cluster Dot)
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#19D879]/25">
              <span className="h-2.5 w-2.5 rounded-full bg-[#19D879] shadow-[0_0_8px_#19D879]" />
            </span>
            <span className="font-semibold text-[#19D879]">
              Verified Cleaned Site
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#4DA6FF] shadow-[0_0_8px_#4DA6FF]" />
            <span className="text-[#91A99C]">Your GPS Location</span>
          </div>

          <div className="mt-3 border-t border-white/[0.08] pt-2 text-[10px] text-[#91A99C]">
            💡 Hover around or click any dot to see all incidents
          </div>
        </div>
      </div>

      {/* FULL INCIDENT DETAILS MODAL (Purely on-map, never navigates to tasks!) */}
      {activeModalGroup && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/15 bg-[#071A12] p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#19D879]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#19D879]">
                    Civic Incident Intelligence
                  </span>
                  {activeModalGroup.tasks.length > 1 && (
                    <span className="rounded-full bg-[#FFB84D]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#FFB84D]">
                      {activeModalGroup.tasks.length} Incidents Here
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-xl font-bold text-white">
                  📍 {activeModalGroup.area}
                </h2>
                <p className="text-xs text-[#91A99C]">
                  Coordinates: {activeModalGroup.latitude.toFixed(4)}, {activeModalGroup.longitude.toFixed(4)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveModalGroup(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-[#91A99C] transition hover:bg-white/20 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* If Multiple Incidents: Tab Switcher */}
            {activeModalGroup.tasks.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {activeModalGroup.tasks.map((task, idx) => {
                  const isActive = idx === activeModalIncidentIndex;
                  const isCleaned = task.status === "completed";
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setActiveModalIncidentIndex(idx)}
                      className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                        isActive
                          ? "bg-[#19D879] text-[#06110D] shadow-[0_0_12px_rgba(25,216,121,0.3)]"
                          : "border border-white/10 bg-white/[0.04] text-[#91A99C] hover:bg-white/[0.08] hover:text-white"
                      }`}
                    >
                      <span>{isCleaned ? "🟢" : "🔴"}</span>
                      <span>
                        Incident #{idx + 1}: {task.wasteCategory}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Current Selected Incident Card */}
            {(() => {
              const currentTask =
                activeModalGroup.tasks[activeModalIncidentIndex] ||
                activeModalGroup.tasks[0];
              if (!currentTask) return null;

              const isCleaned = currentTask.status === "completed";

              return (
                <div className="mt-4 space-y-4">
                  {/* Photo if available */}
                  {currentTask.imageUrl && (
                    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0B2118]">
                      <img
                        src={currentTask.imageUrl}
                        alt={currentTask.wasteCategory}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute left-3 top-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            isCleaned
                              ? "bg-[#19D879] text-[#06110D]"
                              : "bg-[#FF3B30] text-white"
                          }`}
                        >
                          {isCleaned
                            ? "✓ Done & Verified"
                            : "🔴 Scheduled Cleanup (Active)"}
                        </span>
                      </div>
                      {currentTask.hazmatInfo?.isHazmat && (
                        <div className="absolute right-3 top-3">
                          <span className="rounded-full border border-red-500/60 bg-red-600/90 px-3 py-1 text-xs font-bold text-white shadow-lg flex items-center gap-1.5 animate-pulse">
                            ☣️ HAZMAT [{currentTask.hazmatInfo.priority || "CRITICAL"}]
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Incident Specs Grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#91A99C]">
                        Category
                      </p>
                      <p className="mt-1 text-xs font-bold text-white">
                        {currentTask.wasteCategory}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#91A99C]">
                        Severity
                      </p>
                      <p
                        className={`mt-1 text-xs font-bold ${
                          currentTask.severity === "High"
                            ? "text-[#FF5364]"
                            : currentTask.severity === "Medium"
                            ? "text-[#FFB84D]"
                            : "text-[#19D879]"
                        }`}
                      >
                        {currentTask.severity || "Medium"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#91A99C]">
                        Scale / Volume
                      </p>
                      <p className="mt-1 text-xs font-bold text-white capitalize">
                        {currentTask.quantity?.scale || "Medium"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#91A99C]">
                        AI Confidence
                      </p>
                      <p className="mt-1 text-xs font-bold text-[#19D879]">
                        {Math.round((currentTask.confidence || 0.88) * 100)}%
                      </p>
                    </div>
                  </div>

                  {/* Materials Detected */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#91A99C]">
                      Identified Materials
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {currentTask.wasteTypes?.map((type, i) => (
                        <span
                          key={i}
                          className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-white"
                        >
                          {type}
                        </span>
                      )) || (
                        <span className="text-xs text-[#91A99C]">
                          General recyclable & dry waste
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Recommended Action / Disposal */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#91A99C]">
                      Disposal Plan & Precautions
                    </p>
                    <ul className="mt-2 space-y-1.5 text-xs text-[#BACDC3]">
                      {currentTask.recommendedDisposal?.map((disp, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[#19D879]">•</span>
                          <span>{disp}</span>
                        </li>
                      )) || (
                        <li>Route to municipal segregation center.</li>
                      )}
                      {currentTask.precautions?.map((prec, i) => (
                        <li key={`p-${i}`} className="flex items-start gap-2 text-[#FFB84D]">
                          <span>⚠️</span>
                          <span>{prec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Modal Footer (No tasks navigation!) */}
                  <div className="flex items-center justify-between border-t border-white/10 pt-4">
                    <div className="flex items-center gap-1.5 text-xs text-[#91A99C]">
                      <span>⏰ Reported:</span>
                      <span className="font-mono font-medium text-[#F4FFF8]">
                        {currentTask.reportedAt
                          ? `${formatIncidentTime(currentTask.reportedAt)} (${new Date(currentTask.reportedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })})`
                          : "Recently"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/volunteer/tasks/${currentTask.id}`}
                        className="rounded-xl border border-[#19D879]/40 bg-[#19D879]/15 px-4 py-2.5 text-xs font-bold text-[#19D879] transition hover:bg-[#19D879]/25 flex items-center gap-1.5"
                      >
                        ← Back to Task
                      </Link>

                      <Link
                        href={`/report?lat=${activeModalGroup.latitude}&lng=${activeModalGroup.longitude}`}
                        className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold text-[#F4FFF8] transition hover:border-[#19D879]/40 hover:bg-[#0B2118]"
                      >
                        + Report New Issue Here
                      </Link>

                      <button
                        type="button"
                        onClick={() => setActiveModalGroup(null)}
                        className="rounded-xl bg-[#19D879] px-5 py-2.5 text-xs font-bold text-[#06110D] transition hover:bg-[#4DFF9A]"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </main>
  );
}