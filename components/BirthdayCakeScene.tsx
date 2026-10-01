'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { SurpriseData } from '@/types/ecard';

interface BirthdayCakeSceneProps {
  data: SurpriseData;
  onOpenEnvelope: () => void;
  onNext?: () => void;
}

const TOTAL_CANDLES = 5;

const CANDLE_CONFIGS = [
  { id: 0, baseColor: '#ff4d6d', stripeColor: '#ffffff', wish: 'A wish for boundless joy and laughter ✨' },
  { id: 1, baseColor: '#ffa726', stripeColor: '#fff9c4', wish: 'A wish for vibrant health and sunshine ☀️' },
  { id: 2, baseColor: '#26c6da', stripeColor: '#e0f7fa', wish: 'A wish for exciting adventures & dreams 🌟' },
  { id: 3, baseColor: '#ab47bc', stripeColor: '#f3e5f5', wish: 'A wish for deep love & cherished moments 💖' },
  { id: 4, baseColor: '#ff7043', stripeColor: '#ffebee', wish: 'A wish for your happiest year yet! 🎂' },
];

const getUnlockCookieKey = (data: SurpriseData) => {
  const identifier = data.id || `q_${encodeURIComponent((data.secretQuestion || '').trim())}`;
  return `ecard_unlocked_${identifier}`;
};

const isCardUnlocked = (data: SurpriseData): boolean => {
  if (typeof document === 'undefined') return false;
  const key = getUnlockCookieKey(data);
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + key + '=([^;]*)'));
  if (match && match[1] === 'true') return true;
  try {
    if (localStorage.getItem(key) === 'true') return true;
  } catch (e) {
    // Ignore storage issues
  }
  return false;
};

const setCardUnlocked = (data: SurpriseData) => {
  if (typeof document === 'undefined') return;
  const key = getUnlockCookieKey(data);
  const maxAge = 365 * 24 * 60 * 60;
  document.cookie = `${key}=true; max-age=${maxAge}; path=/; SameSite=Lax`;
  try {
    localStorage.setItem(key, 'true');
  } catch (e) {
    // Ignore storage issues
  }
};

// Web Audio sound synthesizer for magical candle chimes and blow out puff
const playChimeSound = (freq = 587.33) => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.85);
  } catch (e) {
    // Audio context may require explicit user gesture
  }
};

const playBlowOutSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const bufferSize = Math.floor(ctx.sampleRate * 0.7);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      channelData[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.7);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    noise.stop(ctx.currentTime + 0.7);
  } catch (e) {
    // Ignore audio error
  }
};

// Helper: generate procedural striped texture for candles
const createCandleTexture = (baseColor: string, stripeColor: string): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 128, 256);

    ctx.fillStyle = stripeColor;
    ctx.lineWidth = 14;
    for (let y = -128; y < 384; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(128, y + 64);
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

// Helper: generate crisp procedural texture for the top face with recipient's name
const createTopIcingTexture = (receiverName: string): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Base icing radial gradient (vanilla peach-pink cream)
    const radial = ctx.createRadialGradient(512, 512, 50, 512, 512, 512);
    radial.addColorStop(0, '#fffbf7');
    radial.addColorStop(0.55, '#ffeade');
    radial.addColorStop(0.85, '#ffd2bc');
    radial.addColorStop(1, '#f5b597');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, 1024, 1024);

    // Decorative outer gold ring
    ctx.strokeStyle = '#e6b800';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(512, 512, 470, 0, Math.PI * 2);
    ctx.stroke();

    // Dotted inner gold ring
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 14]);
    ctx.beginPath();
    ctx.arc(512, 512, 440, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Decorative piped pearls along outer border
    const pearlCount = 36;
    for (let i = 0; i < pearlCount; i++) {
      const angle = (i / pearlCount) * Math.PI * 2;
      const px = 512 + Math.cos(angle) * 455;
      const py = 512 + Math.sin(angle) * 455;
      const pGrad = ctx.createRadialGradient(px - 3, py - 3, 2, px, py, 12);
      pGrad.addColorStop(0, '#ffffff');
      pGrad.addColorStop(0.6, '#ffd54f');
      pGrad.addColorStop(1, '#c79100');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Edible colorful sprinkles scattered across top
    const sprinkleColors = ['#ff4081', '#ffd700', '#00e5ff', '#ab47bc', '#76ff03'];
    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    for (let i = 0; i < 70; i++) {
      const dist = rand(130, 410);
      const angle = rand(0, Math.PI * 2);
      const sx = 512 + Math.cos(angle) * dist;
      const sy = 512 + Math.sin(angle) * dist;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(rand(0, Math.PI));
      ctx.fillStyle = sprinkleColors[i % sprinkleColors.length];
      ctx.beginPath();
      ctx.roundRect(-7, -3, 14, 6, 3);
      ctx.fill();
      ctx.restore();
    }

    // Typography in Center
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Flourish top
    ctx.font = 'bold 36px "Fraunces", serif, Georgia';
    ctx.fillStyle = '#e91e63';
    ctx.fillText('✿  ✿  ✿', 512, 320);

    // "HAPPY BIRTHDAY"
    ctx.font = 'bold 44px "Fraunces", serif, Georgia';
    ctx.fillStyle = '#880e4f';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 4;
    ctx.fillText('HAPPY BIRTHDAY', 512, 385);

    // Recipient's name in glorious script
    ctx.shadowColor = 'rgba(255, 64, 129, 0.4)';
    ctx.shadowBlur = 18;
    ctx.font = 'bold 96px "Caveat", cursive, "Brush Script MT", cursive';
    ctx.fillStyle = '#b71c1c';
    ctx.fillText(receiverName, 512, 500);

    // Subtle outline for name
    ctx.strokeStyle = '#fff0f3';
    ctx.lineWidth = 3;
    ctx.strokeText(receiverName, 512, 500);

    // Reset shadow
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.font = 'bold 34px "Fraunces", serif, Georgia';
    ctx.fillStyle = '#ad1457';
    ctx.fillText('🎂  Make a Wish!  🎂', 512, 605);

    // Bottom stars
    ctx.font = 'bold 30px "Fraunces", serif, Georgia';
    ctx.fillStyle = '#f57f17';
    ctx.fillText('★   ★   ★', 512, 665);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
};

// Procedural soft feathered smoke puff texture
const createSmokeTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    gradient.addColorStop(0.2, 'rgba(240, 240, 240, 0.6)');
    gradient.addColorStop(0.45, 'rgba(220, 220, 220, 0.28)');
    gradient.addColorStop(0.75, 'rgba(200, 200, 200, 0.08)');
    gradient.addColorStop(1, 'rgba(180, 180, 180, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

interface WiggleSmokeParticle {
  sprite: THREE.Sprite;
  candleIdx: number;
  initialY: number;
  delay: number;
  baseSpeed: number;
  curY: number;
  wiggleFreq: number;
  wiggleAmp: number;
  wigglePhase: number;
  baseScale: number;
  maxLife: number;
  age: number;
  spinSpeed: number;
}

export const BirthdayCakeScene: React.FC<BirthdayCakeSceneProps> = ({
  data,
  onOpenEnvelope,
  onNext,
}) => {
  // Secret unlock state
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [answerInput, setAnswerInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  // Phases: 'initial' -> 'lighting' -> 'all_lit' -> 'turning' -> 'top_view' -> 'blown'
  const [phase, setPhase] = useState<'initial' | 'lighting' | 'all_lit' | 'turning' | 'top_view' | 'blown'>('initial');
  const [litCount, setLitCount] = useState<number>(0);
  const [activeWishText, setActiveWishText] = useState<string>('Tap to light the birthday candles ✨');

  const receiverName = data.receiver || 'Birthday Star';
  const senderName = data.sender || 'Someone who loves you';

  // Refs for Three.js canvas & animation
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // References to 3D objects for dynamic animation
  const flameMeshesRef = useRef<THREE.Group[]>([]);
  const pointLightsRef = useRef<THREE.PointLight[]>([]);
  const smokeParticlesRef = useRef<WiggleSmokeParticle[]>([]);
  const emberMeshesRef = useRef<THREE.Mesh[]>([]);
  const blownStartTimeRef = useRef<number>(0);
  const cakeGroupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Animation progress for camera flight from front to top
  const transitionProgressRef = useRef<number>(0);
  const isTransitioningRef = useRef<boolean>(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const litCountRef = useRef(litCount);
  litCountRef.current = litCount;

  // Sound frequency scale
  const candleFreqs = [587.33, 659.25, 739.99, 880.0, 987.77];

  const hasSecret = Boolean(
    data.secretQuestion &&
      data.secretQuestion.trim() &&
      data.secretAnswer &&
      data.secretAnswer.trim()
  );

  const startCeremony = () => {
    if (hasSecret && !isCardUnlocked(data)) {
      setShowPasscodeModal(true);
      setAnswerInput('');
      setPasscodeError('');
      return;
    }

    if (phase !== 'initial') return;

    // Trigger music / background audio
    onOpenEnvelope();

    // Start lighting sequence
    setPhase('lighting');
    setLitCount(0);
  };

  // Helper to trigger the 3D continuous camera orbit
  const triggerTurnToTop = useCallback(() => {
    if (phaseRef.current === 'all_lit') {
      setPhase('turning');
    }
  }, []);

  // EFFECT 1: Sequential candle lighting
  useEffect(() => {
    if (phase !== 'lighting') return;

    if (litCount < TOTAL_CANDLES) {
      const delay = litCount === 0 ? 500 : 1300;
      const timer = setTimeout(() => {
        const nextIndex = litCount;
        setLitCount((prev) => prev + 1);
        setActiveWishText(CANDLE_CONFIGS[nextIndex].wish);
        playChimeSound(candleFreqs[nextIndex] || 600);
      }, delay);

      return () => clearTimeout(timer);
    } else {
      // All candles lit -> move to 'all_lit'
      setPhase('all_lit');
      setActiveWishText(`All ${TOTAL_CANDLES} candles are glowing bright for ${receiverName}! 🎂✨`);

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#ff9a3c', '#ff6b8b', '#ffd166', '#06d6a0', '#118ab2'],
        });
      } catch (e) {
        // Ignore
      }
    }
  }, [phase, litCount, receiverName]);

  // EFFECT 2: When all candles are lit, smoothly initiate 3D camera flight
  useEffect(() => {
    if (phase !== 'all_lit') return;

    const timer = setTimeout(() => {
      setPhase('turning');
    }, 500);

    return () => clearTimeout(timer);
  }, [phase]);

  // EFFECT 3: When in 'turning', execute continuous 2.4s 3D camera flight to top view
  useEffect(() => {
    if (phase !== 'turning') return;

    isTransitioningRef.current = true;
    const startTime = performance.now();
    const duration = 2400; // 2.4s smooth flight

    const checkTransition = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      transitionProgressRef.current = progress;

      if (progress < 1) {
        requestAnimationFrame(checkTransition);
      } else {
        isTransitioningRef.current = false;
        setPhase('top_view');
      }
    };

    requestAnimationFrame(checkTransition);
  }, [phase]);

  const handleBlowOut = () => {
    if (phase !== 'top_view') return;

    playBlowOutSound();
    setPhase('blown');
    blownStartTimeRef.current = 0;

    // Massive double-burst confetti celebration
    try {
      const colors = ['#ff7043', '#ffa000', '#ffeb3b', '#e91e63', '#29b6f6', '#66bb6a'];
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.5 },
        colors,
      });

      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 130,
          origin: { y: 0.35, x: 0.3 },
          colors,
        });
        confetti({
          particleCount: 80,
          spread: 130,
          origin: { y: 0.35, x: 0.7 },
          colors,
        });
      }, 350);
    } catch (e) {
      // Ignore
    }

    // Give ample time for candles to completely blow out, smoke to curl away, and celebration to complete
    setTimeout(() => {
      if (onNext) onNext();
    }, 4200);
  };

  const handleUnlock = () => {
    const userAns = answerInput.trim().toLowerCase();
    const target = (data.secretAnswer || '').trim().toLowerCase();

    if (!userAns) {
      setPasscodeError('Please enter an answer!');
      return;
    }

    if (userAns === target || target.includes(userAns) || userAns.includes(target)) {
      setCardUnlocked(data);
      setShowPasscodeModal(false);
      onOpenEnvelope();
      setPhase('lighting');
      setLitCount(0);
    } else {
      setPasscodeError('Not quite! Think about that special memory ✿');
    }
  };

  // =========================================================================
  // THREE.JS 3D CAKE SCENE SETUP
  // =========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 420;

    // 1. Scene
    const scene = new THREE.Scene();

    // 2. Camera: PerspectiveCamera (starts at eye-level front view)
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 3.4, 15.2);
    camera.lookAt(0, 2.2, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    // 4. Lighting
    // Warm Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffeedb, 0.9);
    scene.add(ambientLight);

    // Directional Key Light (from top-right front)
    const keyLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    keyLight.position.set(6, 12, 10);
    scene.add(keyLight);

    // Soft Rim Light (from top-left rear)
    const rimLight = new THREE.DirectionalLight(0xffd1a4, 0.8);
    rimLight.position.set(-6, 8, -6);
    scene.add(rimLight);

    // 5. CAKE HIERARCHY
    const cakeGroup = new THREE.Group();
    cakeGroupRef.current = cakeGroup;
    scene.add(cakeGroup);

    // Materials
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.25,
      metalness: 0.85,
    });

    const porcelainMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.05,
    });

    const creamBottomMaterial = new THREE.MeshStandardMaterial({
      color: 0xffe2e8,
      roughness: 0.42,
      metalness: 0.04,
    });

    const creamTopMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd8df,
      roughness: 0.38,
      metalness: 0.04,
    });

    const whiteIcingMaterial = new THREE.MeshStandardMaterial({
      color: 0xfffcf7,
      roughness: 0.35,
      metalness: 0.02,
    });

    const strawberryMaterial = new THREE.MeshStandardMaterial({
      color: 0xe63946,
      roughness: 0.2,
      metalness: 0.1,
    });

    // ----------------------------------------------------
    // A. PEDESTAL CAKE STAND
    // ----------------------------------------------------
    const standGroup = new THREE.Group();

    // Table shadow disc
    const shadowGeo = new THREE.CircleGeometry(4.2, 48);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.25;
    standGroup.add(shadowMesh);

    // Stand base foot
    const standBaseGeo = new THREE.CylinderGeometry(2.4, 2.7, 0.32, 48);
    const standBase = new THREE.Mesh(standBaseGeo, porcelainMaterial);
    standBase.position.y = -1.1;
    standGroup.add(standBase);

    // Stand base gold rim
    const baseGoldTorus = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.06, 16, 48), goldMaterial);
    baseGoldTorus.rotation.x = Math.PI / 2;
    baseGoldTorus.position.y = -1.0;
    standGroup.add(baseGoldTorus);

    // Stand stem
    const standStemGeo = new THREE.CylinderGeometry(0.7, 1.2, 1.4, 32);
    const standStem = new THREE.Mesh(standStemGeo, porcelainMaterial);
    standStem.position.y = -0.35;
    standGroup.add(standStem);

    // Stand stem gold accent ring
    const stemGoldRing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 16, 32), goldMaterial);
    stemGoldRing.rotation.x = Math.PI / 2;
    stemGoldRing.position.y = -0.35;
    standGroup.add(stemGoldRing);

    // Stand top serving platter
    const standPlatterGeo = new THREE.CylinderGeometry(4.6, 4.3, 0.32, 54);
    const standPlatter = new THREE.Mesh(standPlatterGeo, porcelainMaterial);
    standPlatter.position.y = 0.45;
    standGroup.add(standPlatter);

    // Platter gold rim
    const platterGoldTorus = new THREE.Mesh(new THREE.TorusGeometry(4.55, 0.08, 16, 54), goldMaterial);
    platterGoldTorus.rotation.x = Math.PI / 2;
    platterGoldTorus.position.y = 0.58;
    standGroup.add(platterGoldTorus);

    cakeGroup.add(standGroup);

    // ----------------------------------------------------
    // B. BOTTOM TIER
    // ----------------------------------------------------
    const bottomTierGroup = new THREE.Group();
    bottomTierGroup.position.y = 1.7; // sits directly on platter

    const bottomCylinderGeo = new THREE.CylinderGeometry(3.8, 3.8, 2.1, 64);
    const bottomCylinder = new THREE.Mesh(bottomCylinderGeo, creamBottomMaterial);
    bottomTierGroup.add(bottomCylinder);

    // Gold pearls along bottom rim
    const bottomPearlCount = 26;
    for (let i = 0; i < bottomPearlCount; i++) {
      const angle = (i / bottomPearlCount) * Math.PI * 2;
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), goldMaterial);
      pearl.position.set(Math.cos(angle) * 3.82, -1.0, Math.sin(angle) * 3.82);
      bottomTierGroup.add(pearl);
    }

    // Whipped cream rosettes between tiers
    const middleRosetteCount = 22;
    for (let i = 0; i < middleRosetteCount; i++) {
      const angle = (i / middleRosetteCount) * Math.PI * 2;
      const rosette = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), whiteIcingMaterial);
      rosette.scale.set(1, 0.75, 1);
      rosette.position.set(Math.cos(angle) * 3.5, 1.05, Math.sin(angle) * 3.5);
      bottomTierGroup.add(rosette);
    }

    // Front golden plaque on bottom tier
    const plaqueGeo = new THREE.BoxGeometry(2.4, 0.6, 0.1);
    const plaqueMesh = new THREE.Mesh(plaqueGeo, whiteIcingMaterial);
    plaqueMesh.position.set(0, 0, 3.84);
    bottomTierGroup.add(plaqueMesh);

    const plaqueBorder = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.68, 0.08), goldMaterial);
    plaqueBorder.position.set(0, 0, 3.82);
    bottomTierGroup.add(plaqueBorder);

    cakeGroup.add(bottomTierGroup);

    // ----------------------------------------------------
    // C. TOP TIER
    // ----------------------------------------------------
    const topTierGroup = new THREE.Group();
    topTierGroup.position.y = 3.65;

    const topCylinderGeo = new THREE.CylinderGeometry(2.8, 2.8, 1.8, 64);
    const topCylinder = new THREE.Mesh(topCylinderGeo, creamTopMaterial);
    topTierGroup.add(topCylinder);

    // Whipped cream rosettes & strawberry slices around top rim
    const topRosetteCount = 18;
    for (let i = 0; i < topRosetteCount; i++) {
      const angle = (i / topRosetteCount) * Math.PI * 2;
      const rosette = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), whiteIcingMaterial);
      rosette.scale.set(1, 0.8, 1);
      rosette.position.set(Math.cos(angle) * 2.75, 0.94, Math.sin(angle) * 2.75);
      topTierGroup.add(rosette);

      // Alternating ruby strawberry slices
      if (i % 2 === 0) {
        const berry = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.26, 16), strawberryMaterial);
        berry.position.set(Math.cos(angle) * 2.75, 1.15, Math.sin(angle) * 2.75);
        berry.rotation.z = Math.PI;
        topTierGroup.add(berry);
      }
    }

    // ----------------------------------------------------
    // D. TOP SURFACE INSCRIPTION (Dynamic Canvas Texture)
    // ----------------------------------------------------
    const topIcingTexture = createTopIcingTexture(receiverName);
    const topCapGeo = new THREE.CircleGeometry(2.78, 64);
    const topCapMat = new THREE.MeshStandardMaterial({
      map: topIcingTexture,
      roughness: 0.35,
      metalness: 0.05,
    });
    const topCap = new THREE.Mesh(topCapGeo, topCapMat);
    topCap.rotation.x = -Math.PI / 2;
    topCap.position.y = 0.92;
    topTierGroup.add(topCap);

    // ----------------------------------------------------
    // E. 5 VOLUMETRIC 3D CANDLES ON TOP TIER
    // ----------------------------------------------------
    const flames: THREE.Group[] = [];
    const lights: THREE.PointLight[] = [];
    const embers: THREE.Mesh[] = [];
    const smokeParticles: WiggleSmokeParticle[] = [];
    const smokeTexture = createSmokeTexture();

    const candleRadius = 2.05; // radius on top cap, leaving center wide open for name

    for (let i = 0; i < TOTAL_CANDLES; i++) {
      const angle = (i / TOTAL_CANDLES) * Math.PI * 2 - Math.PI / 2;
      const cx = Math.cos(angle) * candleRadius;
      const cz = Math.sin(angle) * candleRadius;

      const candleHolder = new THREE.Group();
      candleHolder.position.set(cx, 0.92, cz);

      // Rosette base for candle
      const cBase = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), whiteIcingMaterial);
      cBase.scale.set(1, 0.6, 1);
      cBase.position.y = 0.06;
      candleHolder.add(cBase);

      // Candle wax cylinder
      const cTexture = createCandleTexture(CANDLE_CONFIGS[i].baseColor, CANDLE_CONFIGS[i].stripeColor);
      const cWaxGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.25, 24);
      const cWaxMat = new THREE.MeshStandardMaterial({
        map: cTexture,
        roughness: 0.25,
        metalness: 0.1,
      });
      const cWax = new THREE.Mesh(cWaxGeo, cWaxMat);
      cWax.position.y = 0.7;
      candleHolder.add(cWax);

      // Candle wick
      const wickGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8);
      const wickMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.8 });
      const wick = new THREE.Mesh(wickGeo, wickMat);
      wick.position.y = 1.38;
      candleHolder.add(wick);

      // Smoldering red-orange ember tip on wick when blown out
      const emberGeo = new THREE.SphereGeometry(0.034, 8, 8);
      const emberMat = new THREE.MeshBasicMaterial({
        color: 0xff3d00,
        transparent: true,
        opacity: 0,
      });
      const emberMesh = new THREE.Mesh(emberGeo, emberMat);
      emberMesh.position.y = 1.48;
      emberMesh.visible = false;
      candleHolder.add(emberMesh);
      embers.push(emberMesh);

      // 3D Teardrop Flame Group
      const flameGroup = new THREE.Group();
      flameGroup.position.set(0, 1.6, 0);

      // Outer warm flame halo
      const outerFlameGeo = new THREE.ConeGeometry(0.14, 0.42, 16);
      outerFlameGeo.translate(0, 0.21, 0);
      const outerFlameMat = new THREE.MeshBasicMaterial({
        color: 0xff7700,
        transparent: true,
        opacity: 0.85,
      });
      const outerFlame = new THREE.Mesh(outerFlameGeo, outerFlameMat);
      flameGroup.add(outerFlame);

      // Inner white-hot flame core
      const innerFlameGeo = new THREE.ConeGeometry(0.07, 0.28, 16);
      innerFlameGeo.translate(0, 0.14, 0);
      const innerFlameMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
      });
      const innerFlame = new THREE.Mesh(innerFlameGeo, innerFlameMat);
      flameGroup.add(innerFlame);

      // Initial flame visibility: hidden (unlit)
      flameGroup.scale.set(0, 0, 0);
      flameGroup.visible = false;
      candleHolder.add(flameGroup);
      flames.push(flameGroup);

      // Dynamic PointLight inside flame
      const candleLight = new THREE.PointLight(0xffa726, 0, 6, 2);
      candleLight.position.set(0, 1.65, 0);
      candleHolder.add(candleLight);
      lights.push(candleLight);

      // Organic Feathered Smoke Wisps (14 staggered particles per candle)
      const candleSmokeGroup = new THREE.Group();
      candleSmokeGroup.position.set(0, 1.48, 0);
      candleHolder.add(candleSmokeGroup);

      for (let s = 0; s < 14; s++) {
        const sMat = new THREE.SpriteMaterial({
          map: smokeTexture,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.NormalBlending,
        });
        const sSprite = new THREE.Sprite(sMat);
        sSprite.visible = false;
        candleSmokeGroup.add(sSprite);

        smokeParticles.push({
          sprite: sSprite,
          candleIdx: i,
          initialY: 0.05,
          delay: s * 0.13 + Math.random() * 0.04,
          baseSpeed: 0.62 + Math.random() * 0.22,
          curY: 0,
          wiggleFreq: 2.8 + Math.random() * 1.4,
          wiggleAmp: 0.14 + Math.random() * 0.06,
          wigglePhase: i * 1.25 + s * 0.45,
          baseScale: 0.16 + Math.random() * 0.05,
          maxLife: 2.7 + Math.random() * 0.5,
          age: 0,
          spinSpeed: (Math.random() - 0.5) * 1.4,
        });
      }

      topTierGroup.add(candleHolder);
    }

    flameMeshesRef.current = flames;
    pointLightsRef.current = lights;
    emberMeshesRef.current = embers;
    smokeParticlesRef.current = smokeParticles;

    cakeGroup.add(topTierGroup);

    // Initial positioning of cake
    cakeGroup.position.y = -0.5;

    // ----------------------------------------------------
    // ANIMATION & RENDER LOOP
    // ----------------------------------------------------
    let lastTime = performance.now();

    // Mouse interactive gentle parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetRotY = 0;
    let targetRotX = 0;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const rect = container.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x;
      mouseY = y;
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });

    // Handle Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 400;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(container);
    }

    const cubicEaseInOut = (t: number) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const currentPhase = phaseRef.current;
      const currentLitCount = litCountRef.current;

      // 1. Candle Flame updates
      flames.forEach((fGroup, idx) => {
        const isCandleLit = idx < currentLitCount && currentPhase !== 'blown';
        const pLight = lights[idx];

        if (isCandleLit) {
          fGroup.visible = true;
          // Gentle organic flame flicker
          const flicker = 1.0 + Math.sin(now * 0.015 + idx * 2.3) * 0.09;
          const wobble = Math.sin(now * 0.02 + idx) * 0.06;

          // Smooth scale-in on light
          fGroup.scale.lerp(new THREE.Vector3(flicker, flicker * 1.1, flicker), 0.2);
          fGroup.rotation.z = wobble;

          if (pLight) {
            pLight.intensity = THREE.MathUtils.lerp(pLight.intensity, 1.8 + flicker * 0.4, 0.15);
          }
        } else {
          // Unlit or blown
          fGroup.scale.lerp(new THREE.Vector3(0.001, 0.001, 0.001), 0.25);
          if (fGroup.scale.x < 0.05) {
            fGroup.visible = false;
          }
          if (pLight) {
            pLight.intensity = THREE.MathUtils.lerp(pLight.intensity, 0, 0.2);
          }
        }
      });

      // 2. Realistic Wiggling Smoke Wisps & Smoldering Ember when blown out
      if (currentPhase === 'blown') {
        if (blownStartTimeRef.current === 0) {
          blownStartTimeRef.current = now;
        }
        const blownElapsed = (now - blownStartTimeRef.current) / 1000;

        // A. Wick glowing ember: bright orange-red at first, flickers and smolders to dark charcoal
        emberMeshesRef.current.forEach((emb, eIdx) => {
          if (blownElapsed < 2.6) {
            emb.visible = true;
            const emberProgress = blownElapsed / 2.6;
            const flicker = 0.85 + Math.sin(now * 0.02 + eIdx * 2.5) * 0.15;
            const mat = emb.material as THREE.MeshBasicMaterial;
            mat.opacity = (1 - emberProgress) * 0.95 * flicker;
            const r = THREE.MathUtils.lerp(1.0, 0.22, emberProgress);
            const g = THREE.MathUtils.lerp(0.24, 0.04, emberProgress);
            mat.color.setRGB(r, g, 0);
          } else {
            emb.visible = false;
          }
        });

        // B. Feathered billowing smoke puffs wiggling upwards
        smokeParticles.forEach((sp) => {
          if (blownElapsed < sp.delay) {
            sp.sprite.visible = false;
            return;
          }

          sp.age += delta;
          const progress = Math.min(sp.age / sp.maxLife, 1);

          if (progress >= 1) {
            sp.sprite.visible = false;
            return;
          }

          sp.sprite.visible = true;

          // Rises upward with natural thermal deceleration
          sp.curY += delta * sp.baseSpeed * (1 - progress * 0.35);

          // Natural harmonic S-curve curl wiggle in 3D
          const amplitudeScale = 0.6 + Math.pow(progress, 0.7) * 2.4;
          const waveX = Math.sin(blownElapsed * sp.wiggleFreq + sp.wigglePhase) * sp.wiggleAmp * amplitudeScale;
          const waveZ = Math.cos(blownElapsed * (sp.wiggleFreq * 0.82) + sp.wigglePhase) * (sp.wiggleAmp * 0.72) * amplitudeScale;

          sp.sprite.position.set(waveX, sp.initialY + sp.curY, waveZ);

          // Organic rotational swirl
          sp.sprite.material.rotation += delta * sp.spinSpeed;

          // Natural soft expansion as smoke billows into air
          const scale = sp.baseScale * (1 + progress * 4.2);
          sp.sprite.scale.set(scale, scale, 1);

          // Soft realistic opacity curve: gentle fade in, then dissipates smoothly
          if (progress < 0.14) {
            sp.sprite.material.opacity = (progress / 0.14) * 0.48;
          } else {
            sp.sprite.material.opacity = Math.max(0, 0.48 * Math.pow(1 - (progress - 0.14) / 0.86, 1.4));
          }
        });
      }

      // 3. Smooth Camera Flight from Front to Top Perspective
      // Front View Camera Coordinates:
      const frontCam = { x: 0, y: 3.4, z: 15.2, lookY: 2.2 };
      // Top Overhead Camera Coordinates:
      // High above and slightly in front (y=14.0, z=3.8) looking down at (y=2.0)
      // This gives an exquisite top-down isometric view showing the whole inscription AND the 3D depth of the cake!
      const topCam = { x: 0, y: 14.2, z: 3.2, lookY: 2.0 };

      let flightT = 0;
      if (currentPhase === 'top_view' || currentPhase === 'blown') {
        flightT = 1;
      } else if (currentPhase === 'turning') {
        flightT = cubicEaseInOut(transitionProgressRef.current);
      } else {
        flightT = 0;
      }

      // Smooth camera position interpolation
      const targetCamX = THREE.MathUtils.lerp(frontCam.x, topCam.x, flightT);
      const targetCamY = THREE.MathUtils.lerp(frontCam.y, topCam.y, flightT);
      const targetCamZ = THREE.MathUtils.lerp(frontCam.z, topCam.z, flightT);
      const targetLookY = THREE.MathUtils.lerp(frontCam.lookY, topCam.lookY, flightT);

      // Subtle interactive mouse parallax:
      // When at front view, mouse tilts Y rotation; when at top view, subtle tilt
      const parallaxFactor = 1 - flightT * 0.6;
      targetRotY = mouseX * 0.2 * parallaxFactor;
      targetRotX = mouseY * 0.08 * parallaxFactor;

      cakeGroup.rotation.y = THREE.MathUtils.lerp(cakeGroup.rotation.y, targetRotY, 0.08);
      cakeGroup.rotation.x = THREE.MathUtils.lerp(cakeGroup.rotation.x, targetRotX, 0.08);

      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, 0.12);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, 0.12);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, 0.12);
      camera.lookAt(0, targetLookY, 0);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      renderer.dispose();
    };
  }, [receiverName]);

  const isFlipped = phase === 'turning' || phase === 'top_view' || phase === 'blown';

  return (
    <div
      className={`birthday-cake-scene-container ${phase}`}
      onClick={() => {
        if (phase === 'initial') {
          startCeremony();
        } else if (phase === 'all_lit') {
          triggerTurnToTop();
        } else if (phase === 'top_view') {
          handleBlowOut();
        } else if (phase === 'blown') {
          if (onNext) onNext();
        }
      }}
      style={{
        cursor:
          phase === 'initial' || phase === 'top_view' || phase === 'all_lit' || phase === 'blown'
            ? 'pointer'
            : 'default',
      }}
    >
      {/* Twilight party fairy lights banner */}
      <div className="cake-fairy-lights" aria-hidden="true">
        <span className="fairy-bulb b1" />
        <span className="fairy-bulb b2" />
        <span className="fairy-bulb b3" />
        <span className="fairy-bulb b4" />
        <span className="fairy-bulb b5" />
        <span className="fairy-bulb b6" />
        <span className="fairy-bulb b7" />
        <span className="fairy-bulb b8" />
      </div>

      {/* Floating party sparkles across entire viewport */}
      <div className="cake-ambient-sparkles" aria-hidden="true">
        <span className="sparkle-star s1">✨</span>
        <span className="sparkle-star s2">⭐</span>
        <span className="sparkle-star s3">🎉</span>
        <span className="sparkle-star s4">✨</span>
        <span className="sparkle-star s5">⭐</span>
        <span className="sparkle-star s6">✨</span>
        <span className="sparkle-star s7">🌟</span>
      </div>

      {/* Header Tag */}
      <div className="cake-scene-header">
        <span className="cake-scene-badge">✿ SPECIAL BIRTHDAY DELIVERY ✿</span>
        <h1 className="cake-scene-title">
          {isFlipped ? (
            <>Make A Wish, <span className="highlight-name">{receiverName}</span>! 🎂</>
          ) : (
            <>A Birthday Surprise For <span className="highlight-name">{receiverName}</span> ✨</>
          )}
        </h1>
        <p className="cake-scene-subtitle">
          {phase === 'blown' ? (
            '✨ Your birthday wish has been released into the stars! ✨'
          ) : phase === 'top_view' ? (
            '✨ Close your eyes, make a wish, and tap the screen to blow out the candles 🌬️'
          ) : phase === 'turning' ? (
            'Gliding smoothly to top view... 🎂✨'
          ) : (
            activeWishText
          )}
        </p>
      </div>

      {/* =========================================================================
          AUTHENTIC 3D WEBGL CAKE STAGE
          Real volumetric 3D model: Pedestal stand, 2 tiers, candles, and smooth
          cinematic camera flight directly into top-down view! Never flattens into a line!
         ========================================================================= */}
      <div
        className="cake-stage-3d"
        ref={containerRef}
        onClick={(e) => {
          if (phase === 'initial') {
            e.stopPropagation();
            startCeremony();
          } else if (phase === 'all_lit') {
            e.stopPropagation();
            triggerTurnToTop();
          } else if (phase === 'top_view') {
            e.stopPropagation();
            handleBlowOut();
          }
        }}
        role={phase === 'initial' || phase === 'all_lit' || phase === 'top_view' ? 'button' : undefined}
        tabIndex={phase === 'initial' || phase === 'all_lit' || phase === 'top_view' ? 0 : undefined}
        style={{
          cursor:
            phase === 'initial' || phase === 'all_lit' || phase === 'top_view'
              ? 'pointer'
              : 'default',
        }}
      >
        <canvas ref={canvasRef} className="cake-webgl-canvas" />

        {/* Ambient warm light halo that intensifies as candles light */}
        <div
          className="cake-illumination-halo"
          style={{
            opacity: litCount === 0 ? 0.15 : 0.25 + (litCount / TOTAL_CANDLES) * 0.65,
            transform: `scale(${1 + litCount * 0.12})`,
          }}
        />
      </div>

      {/* =========================================================================
          CONTROLS & ACTION BUTTONS BELOW CAKE
         ========================================================================= */}
      <div className="cake-scene-footer-controls">
        {/* Interactive Trigger prompt when in 'initial' state */}
        {phase === 'initial' && (
          <div className="cake-prompt-action">
            <button
              type="button"
              className="btn-light-candles"
              onClick={(e) => {
                e.stopPropagation();
                startCeremony();
              }}
            >
              <span className="candle-icon">🕯️</span>
              <span>Light the Birthday Candles</span>
              <span className="sparkle-icon">✨</span>
            </button>
          </div>
        )}

        {/* Top View Action Controls — Only visible when arrived at top view */}
        {phase === 'top_view' && (
          <div className="cake-top-view-controls">
            <div className="cake-sender-ribbon">
              <span className="ribbon-text">
                Baked with all my love for you, from <strong>{senderName}</strong> 💖
              </span>
            </div>
          </div>
        )}

        {/* Celebratory badge on blown */}
        {phase === 'blown' && (
          <div className="wish-granted-badge">
            <p className="wish-granted-text">
              🌟 Your birthday wish is sealed with love! 🌟
            </p>
          </div>
        )}
      </div>

      {/* Secret Passcode Modal if creator set one */}
      {showPasscodeModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowPasscodeModal(false)}
        >
          <div
            className="passcode-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lock-icon">🔒</div>
            <h2>Birthday Secret Question</h2>
            <p style={{ fontSize: 14, color: 'var(--mut)', marginTop: 4 }}>
              Unlock your birthday cake ceremony:
            </p>
            <div className="question-badge">{data.secretQuestion}</div>
            {data.secretHint && (
              <div className="passcode-hint">Hint: {data.secretHint}</div>
            )}
            <input
              type="text"
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUnlock();
              }}
              placeholder="Your secret answer..."
              autoFocus
            />
            {passcodeError && <div className="passcode-err">{passcodeError}</div>}
            <button
              type="button"
              className="btn"
              style={{ width: '100%', marginTop: 12 }}
              onClick={handleUnlock}
            >
              Unlock Cake 🎂
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
