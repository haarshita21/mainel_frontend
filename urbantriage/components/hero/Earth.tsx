"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sphere, Stars, useTexture } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";

type Phase = "rotating" | "zoomingIn" | "holding" | "zoomingOut";
type FocusType = "waste" | "cleanup";

// 2D Glowing Spot flush with Earth surface
function Glowing2DSpot({
  position,
  color,
  isTarget = false,
  pulse = true,
}: {
  position: THREE.Vector3;
  color: string;
  isTarget?: boolean;
  pulse?: boolean;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  const auraRef = useRef<THREE.Mesh>(null);

  // Align 2D flat disc with sphere surface normal vector
  const normal = position.clone().normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    normal
  );

  // Minimal offset to ensure zero z-fighting on sphere
  const surfacePos = position.clone().add(normal.clone().multiplyScalar(0.007));

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * 4.0;
    if (ringRef.current && (isTarget || pulse)) {
      const s = 1.0 + 0.35 * Math.sin(t);
      ringRef.current.scale.set(s, s, 1);
    }
    if (auraRef.current && isTarget) {
      const sAura = 1.0 + 0.18 * Math.cos(t * 0.8);
      auraRef.current.scale.set(sAura, sAura, 1);
    }
  });

  return (
    <group position={surfacePos} quaternion={quat}>
      {/* 2D Outer Glowing Halo Disc */}
      <mesh ref={auraRef}>
        <circleGeometry args={[isTarget ? 0.09 : 0.05, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isTarget ? 0.45 : 0.28}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 2D Pulsing Neon Radar Ring */}
      <mesh ref={ringRef}>
        <ringGeometry
          args={[
            isTarget ? 0.08 : 0.045,
            isTarget ? 0.11 : 0.07,
            32,
          ]}
        />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isTarget ? 0.85 : 0.55}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 2D Solid Highlight Core */}
      <mesh position={[0, 0, 0.002]}>
        <circleGeometry args={[isTarget ? 0.045 : 0.026, 32]} />
        <meshBasicMaterial color="#FFFFFF" side={THREE.DoubleSide} />
      </mesh>

      {/* 2D Color Center Dot */}
      <mesh position={[0, 0, 0.003]}>
        <circleGeometry args={[isTarget ? 0.038 : 0.021, 32]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function GlobeContent({
  onPhaseChange,
  onFocusChange,
}: {
  onPhaseChange: (phase: Phase) => void;
  onFocusChange: (focus: FocusType) => void;
}) {
  const globeRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const phase = useRef<Phase>("rotating");
  // Initialize to "cleanup" so the very first 1/2 rotation switches to "waste" (RED SPOT)
  const focus = useRef<FocusType>("cleanup");

  const rotationAmount = useRef(0);
  const timer = useRef(0);

  const baseCamera = new THREE.Vector3(0, 0, 5.5);

  // Exact coordinates on radius R = 1.45
  // Red Primary Target (Waste): positioned on front face when rotation = PI (or 3*PI, etc.)
  // After 1/2 rotation (PI radians), this target will be centered facing the camera!
  const PRIMARY_RED = new THREE.Vector3(0.25, 0.35, -1.39);

  // Green Primary Target (Cleanup): positioned on opposite face (rotated by PI)
  // After the next 1/2 rotation (2*PI radians), this target will be centered facing the camera!
  const PRIMARY_GREEN = new THREE.Vector3(-0.25, 0.35, 1.39);

  // Scattered 2D glowing spots placed across various continents on the globe
  const extraRedSpots = [
    new THREE.Vector3(0.15, -0.85, 1.15).normalize().multiplyScalar(1.45),
    new THREE.Vector3(-0.95, -0.65, 0.80).normalize().multiplyScalar(1.45),
    new THREE.Vector3(1.10, 0.60, -0.65).normalize().multiplyScalar(1.45),
    new THREE.Vector3(1.20, -0.55, -0.60).normalize().multiplyScalar(1.45),
  ];

  const extraGreenSpots = [
    new THREE.Vector3(-0.35, 0.75, 1.15).normalize().multiplyScalar(1.45),
    new THREE.Vector3(1.25, -0.45, 0.55).normalize().multiplyScalar(1.45),
    new THREE.Vector3(-0.60, -0.45, -1.15).normalize().multiplyScalar(1.45),
    new THREE.Vector3(-0.70, 0.65, -0.95).normalize().multiplyScalar(1.45),
  ];

  // Photorealistic Earth textures
  const [dayMap, cloudsMap] = useTexture([
    "/images/earth_daymap.jpg",
    "/images/earth_clouds_rgba.png",
  ]);

  useEffect(() => {
    if (dayMap) {
      dayMap.colorSpace = THREE.SRGBColorSpace;
      dayMap.needsUpdate = true;
    }
  }, [dayMap]);

  useFrame((_, delta) => {
    if (!globeRef.current) return;
    const globe = globeRef.current;

    // Atmospheric cloud drift
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += 0.03 * delta;
    }

    /*
    ==================================================================
    PHASE 1: 1/2 ROTATION (Rotate 180° / PI radians)
    ==================================================================
    */
    if (phase.current === "rotating") {
      const rotationSpeed = 1.35;
      const step = rotationSpeed * delta;

      globe.rotation.y += step;
      rotationAmount.current += step;

      // Exact 1/2 rotation (PI radians = 180 degrees)
      if (rotationAmount.current >= Math.PI) {
        rotationAmount.current = 0;
        phase.current = "zoomingIn";

        // Alternate focus: first to "waste" (red spot), then to "cleanup" (green spot)
        focus.current = focus.current === "waste" ? "cleanup" : "waste";

        onFocusChange(focus.current);
        onPhaseChange("zoomingIn");
        timer.current = 0;
      }
      return;
    }

    /*
    ==================================================================
    CURRENT TARGET
    ==================================================================
    */
    const localTarget =
      focus.current === "waste" ? PRIMARY_RED : PRIMARY_GREEN;

    const worldTarget = localTarget
      .clone()
      .applyQuaternion(globe.quaternion);

    /*
    ==================================================================
    PHASE 2: ZOOM DIRECTLY INTO SPOT
    ==================================================================
    */
    if (phase.current === "zoomingIn") {
      timer.current += delta;
      const duration = 1.1;
      const progress = Math.min(timer.current / duration, 1);
      const eased = progress * progress * (3 - 2 * progress);

      const direction = new THREE.Vector3()
        .subVectors(baseCamera, worldTarget)
        .normalize();

      // Position camera closely aligned with the targeted spot
      const closeCamera = worldTarget
        .clone()
        .add(direction.multiplyScalar(1.2));

      camera.position.lerpVectors(baseCamera, closeCamera, eased);
      camera.lookAt(worldTarget);

      if (progress >= 1) {
        phase.current = "holding";
        timer.current = 0;
        onPhaseChange("holding");
      }
      return;
    }

    /*
    ==================================================================
    PHASE 3: HOLD ON SPOT & SHOW PICTURE FOR EXACTLY 2 SECONDS
    ==================================================================
    */
    if (phase.current === "holding") {
      timer.current += delta;
      camera.lookAt(worldTarget);

      // User instruction: show picture for exactly 2 seconds
      if (timer.current >= 2.0) {
        phase.current = "zoomingOut";
        timer.current = 0;
        onPhaseChange("zoomingOut");
      }
      return;
    }

    /*
    ==================================================================
    PHASE 4: ZOOM OUT BACK TO FULL GLOBE VIEW
    ==================================================================
    */
    if (phase.current === "zoomingOut") {
      timer.current += delta;
      const duration = 1.0;
      const progress = Math.min(timer.current / duration, 1);
      const eased = progress * progress * (3 - 2 * progress);

      camera.position.lerpVectors(camera.position, baseCamera, eased);
      camera.lookAt(0, 0, 0);

      if (progress >= 1) {
        camera.position.copy(baseCamera);
        rotationAmount.current = 0;
        phase.current = "rotating";
        onPhaseChange("rotating");
        timer.current = 0;
      }
    }
  });

  return (
    <group ref={globeRef}>
      {/* COSMIC STARS */}
      <Stars
        radius={6}
        depth={4}
        count={350}
        factor={1.6}
        saturation={0}
        fade
        speed={0.15}
      />

      {/* REALISTIC BLUE-GREEN 3D EARTH SPHERE */}
      <Sphere args={[1.45, 64, 64]}>
        <meshStandardMaterial
          map={dayMap}
          roughness={0.55}
          metalness={0.02}
          color="#ffffff"
        />
      </Sphere>

      {/* REALISTIC CLOUDS LAYER */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[1.458, 64, 64]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>

      {/* ATMOSPHERIC BLUE CYAN RIM HAZE */}
      <Sphere args={[1.475, 64, 64]}>
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.07}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </Sphere>

      {/* SUBTLE GEOSPATIAL COORDINATES MESH */}
      <Sphere args={[1.495, 32, 32]}>
        <meshBasicMaterial
          color="#19D879"
          wireframe
          transparent
          opacity={0.03}
        />
      </Sphere>

      {/* PRIMARY RED SPOT (Waste incident) */}
      <Glowing2DSpot
        position={PRIMARY_RED}
        color="#FF3B30"
        isTarget={focus.current === "waste"}
        pulse
      />

      {/* PRIMARY GREEN SPOT (Cleanup resolution) */}
      <Glowing2DSpot
        position={PRIMARY_GREEN}
        color="#19D879"
        isTarget={focus.current === "cleanup"}
        pulse
      />

      {/* SCATTERED 2D GLOWING RED SPOTS HERE AND THERE */}
      {extraRedSpots.map((pos, idx) => (
        <Glowing2DSpot
          key={`red-${idx}`}
          position={pos}
          color="#FF3B30"
          pulse
        />
      ))}

      {/* SCATTERED 2D GLOWING GREEN SPOTS HERE AND THERE */}
      {extraGreenSpots.map((pos, idx) => (
        <Glowing2DSpot
          key={`green-${idx}`}
          position={pos}
          color="#19D879"
          pulse
        />
      ))}

      {/* BRIGHT BALANCED GLOBE LIGHTING (Vibrant Blue & Green) */}
      <ambientLight intensity={1.25} />
      <directionalLight
        position={[5, 3, 5]}
        intensity={1.8}
        color="#FFFFFF"
      />
      <directionalLight
        position={[-5, -1, 3]}
        intensity={0.8}
        color="#bae6fd"
      />
      <pointLight
        position={[0, -3, 2]}
        intensity={0.4}
        color="#38bdf8"
      />
    </group>
  );
}

export default function Earth() {
  const [phase, setPhase] = useState<Phase>("rotating");
  const [focus, setFocus] = useState<FocusType>("waste");
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (phase !== "holding") {
      setBlink(false);
      return;
    }

    const interval = setInterval(() => {
      setBlink((value) => !value);
    }, 300);

    return () => clearInterval(interval);
  }, [phase]);

  // Picture stays strictly for the 2.0-second holding phase
  const showEvidence = phase === "holding";

  return (
    <div className="relative h-[620px] w-full">
      {/* ======================================================== */}
      {/* 3D REALISTIC BLUE-GREEN EARTH */}
      {/* ======================================================== */}
      <Canvas
        camera={{
          position: [0, 0, 5.5],
          fov: 42,
        }}
        dpr={[1, 2]}
        gl={{
          alpha: true,
          antialias: true,
        }}
      >
        <Suspense fallback={null}>
          <GlobeContent
            onPhaseChange={setPhase}
            onFocusChange={setFocus}
          />
        </Suspense>
      </Canvas>

      {/* ======================================================== */}
      {/* EVIDENCE PICTURE CARD (Visible for exactly 2 seconds) */}
      {/* ======================================================== */}
      <div
        className={`
          pointer-events-none
          absolute
          right-[-10px]
          top-1/2
          w-[320px]
          -translate-y-1/2
          transition-all
          duration-300
          ease-out
          ${
            showEvidence
              ? "translate-x-0 opacity-100 scale-100"
              : "translate-x-8 opacity-0 scale-95"
          }
        `}
      >
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#071A12]/90 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          {/* IMAGE */}
          <div className="relative aspect-[16/9] overflow-hidden">
            <img
              src={
                focus === "waste"
                  ? "/images/waste-scene.png"
                  : "/images/cleanup-scene.png"
              }
              alt={
                focus === "waste"
                  ? "Waste hotspot detected"
                  : "Community cleanup verified"
              }
              className="h-full w-full object-cover"
            />

            {/* Image gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#06110D]/85 via-transparent to-transparent" />

            {/* Glowing hotspot indicator */}
            <div
              className={`
                absolute
                left-4
                top-4
                h-3.5
                w-3.5
                rounded-full
                ${
                  focus === "waste"
                    ? "bg-[#FF3B30] shadow-[0_0_14px_#FF3B30]"
                    : "bg-[#19D879] shadow-[0_0_14px_#19D879]"
                }
                ${
                  blink
                    ? "scale-125 opacity-70"
                    : "scale-100 opacity-100"
                }
                transition-all
                duration-300
              `}
            />

            <span className="absolute bottom-3 left-4 rounded-md bg-black/65 px-2 py-0.5 font-mono text-[10px] text-white backdrop-blur-md">
              {focus === "waste"
                ? "LAT 12.978° N · LON 77.640° E"
                : "VERIFIED SITE RESOLUTION"}
            </span>
          </div>

          {/* INFORMATION */}
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#91A99C]">
                  {focus === "waste"
                    ? "Active Geospatial Hotspot"
                    : "Verified Cleanup Impact"}
                </p>

                <h3 className="mt-1 text-sm font-semibold text-[#F4FFF8]">
                  {focus === "waste"
                    ? "Waste Hotspot Detected"
                    : "Community Cleanup Completed"}
                </h3>
              </div>

              <div
                className={`
                  rounded-full
                  px-2.5
                  py-1
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-wider
                  ${
                    focus === "waste"
                      ? "bg-[#FF3B30]/15 text-[#FF5364] border border-[#FF3B30]/35 shadow-[0_0_10px_rgba(255,59,48,0.2)]"
                      : "bg-[#19D879]/15 text-[#19D879] border border-[#19D879]/35 shadow-[0_0_10px_rgba(25,216,121,0.2)]"
                  }
                `}
              >
                {focus === "waste" ? "Active" : "Cleaned"}
              </div>
            </div>

            <p className="mt-2.5 text-xs leading-5 text-[#91A99C]">
              {focus === "waste"
                ? "AI computer vision flagged illegal open waste accumulation requiring community cleanup mobilization."
                : "Volunteers verified site resolution with before/after structural SSIM perspective alignment."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}