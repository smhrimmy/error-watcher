import React, { useEffect, useRef, useState } from 'react';
import { Globe, Activity, Zap, Shield, AlertTriangle } from 'lucide-react';
import { Card } from '../components/ui/Card';

interface AttackPoint {
  id: string;
  lat: number;
  lng: number;
  intensity: number;
  type: 'ddos' | 'brute_force' | 'xss' | 'sqli';
  timestamp: number;
}

interface AnimatedAttack {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  progress: number;
  intensity: number;
  type: string;
}

export default function GlobalAttackMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [attacks, setAttacks] = useState<AttackPoint[]>([]);
  const [animatedAttacks, setAnimatedAttacks] = useState<AnimatedAttack[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate real attack data
  const generateAttackData = (): AttackPoint[] => {
    const attackTypes: ('ddos' | 'brute_force' | 'xss' | 'sqli')[] = ['ddos', 'brute_force', 'xss', 'sqli'];
    const regions = [
      { lat: 40.7128, lng: -74.0060, name: 'New York' },
      { lat: 51.5074, lng: -0.1278, name: 'London' },
      { lat: 35.6762, lng: 139.6503, name: 'Tokyo' },
      { lat: 37.7749, lng: -122.4194, name: 'San Francisco' },
      { lat: 55.7558, lng: 37.6176, name: 'Moscow' },
      { lat: 39.9042, lng: 116.4074, name: 'Beijing' },
      { lat: -33.8688, lng: 151.2093, name: 'Sydney' },
      { lat: 48.8566, lng: 2.3522, name: 'Paris' }
    ];

    return Array.from({ length: 15 }, (_, i) => {
      const region = regions[Math.floor(Math.random() * regions.length)];
      return {
        id: `attack-${Date.now()}-${i}`,
        lat: region.lat + (Math.random() - 0.5) * 10,
        lng: region.lng + (Math.random() - 0.5) * 10,
        intensity: Math.random() * 100 + 50,
        type: attackTypes[Math.floor(Math.random() * attackTypes.length)],
        timestamp: Date.now() - Math.random() * 300000
      };
    });
  };

  useEffect(() => {
    // Load initial attack data
    setAttacks(generateAttackData());
    setIsLoading(false);

    // Simulate new attacks every 3 seconds
    const interval = setInterval(() => {
      const newAttacks = generateAttackData();
      setAttacks(prev => [...prev.slice(-10), ...newAttacks.slice(0, 3)]);
      
      // Create animated attacks
      const newAnimated = newAttacks.slice(0, 2).map(attack => ({
        id: attack.id,
        startLat: 0, // Equator as source
        startLng: Math.random() * 360 - 180,
        endLat: attack.lat,
        endLng: attack.lng,
        progress: 0,
        intensity: attack.intensity,
        type: attack.type
      }));
      
      setAnimatedAttacks(prev => [...prev, ...newAnimated]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // 3D Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Globe parameters
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const globeRadius = Math.min(canvas.width, canvas.height) * 0.3;

    // 3D projection function
    const project3D = (lat: number, lng: number, radius: number) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);
      
      return { x, y, z };
    };

    // Animation loop
    let rotation = 0;
    const animate = () => {
      ctx.fillStyle = 'rgba(41, 45, 50, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      rotation += 0.005;

      // Draw 3D globe wireframe
      ctx.strokeStyle = 'rgba(0, 206, 201, 0.3)';
      ctx.lineWidth = 1;
      
      // Latitude lines
      for (let lat = -80; lat <= 80; lat += 20) {
        ctx.beginPath();
        for (let lng = -180; lng <= 180; lng += 5) {
          const pos = project3D(lat, lng + rotation * 50, globeRadius);
          const screenX = centerX + pos.x;
          const screenY = centerY - pos.y;
          
          if (lng === -180) {
            ctx.moveTo(screenX, screenY);
          } else {
            ctx.lineTo(screenX, screenY);
          }
        }
        ctx.stroke();
      }

      // Longitude lines
      for (let lng = -180; lng <= 180; lng += 30) {
        ctx.beginPath();
        for (let lat = -90; lat <= 90; lat += 5) {
          const pos = project3D(lat, lng + rotation * 50, globeRadius);
          const screenX = centerX + pos.x;
          const screenY = centerY - pos.y;
          
          if (lat === -90) {
            ctx.moveTo(screenX, screenY);
          } else {
            ctx.lineTo(screenX, screenY);
          }
        }
        ctx.stroke();
      }

      // Draw attack points on globe
      attacks.forEach(attack => {
        const pos = project3D(attack.lat, attack.lng + rotation * 50, globeRadius);
        const screenX = centerX + pos.x;
        const screenY = centerY - pos.y;
        
        // Only draw if on visible side
        if (pos.z > 0) {
          const perspective = (globeRadius + pos.z) / (globeRadius * 2);
          const size = attack.intensity / 50 * perspective;
          
          // Attack point with pulsing effect
          const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
          
          ctx.save();
          ctx.globalAlpha = perspective * pulse;
          
          // Outer glow
          const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, size * 3);
          gradient.addColorStop(0, getAttackColor(attack.type, 1));
          gradient.addColorStop(1, getAttackColor(attack.type, 0));
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(screenX, screenY, size * 3, 0, Math.PI * 2);
          ctx.fill();
          
          // Inner core
          ctx.fillStyle = getAttackColor(attack.type, 1);
          ctx.beginPath();
          ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
        }
      });

      // Draw animated attack trajectories
      setAnimatedAttacks(prev => prev.map(attack => {
        attack.progress += 0.02;
        
        if (attack.progress < 1) {
          const startPos = project3D(attack.startLat, attack.startLng + rotation * 50, globeRadius * 1.5);
          const endPos = project3D(attack.endLat, attack.endLng + rotation * 50, globeRadius);
          
          const currentX = startPos.x + (endPos.x - startPos.x) * attack.progress;
          const currentY = startPos.y + (endPos.y - startPos.y) * attack.progress;
          
          // Draw trajectory line
          ctx.strokeStyle = getAttackColor(attack.type, 0.6);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(centerX + startPos.x, centerY - startPos.y);
          ctx.lineTo(centerX + currentX, centerY - currentY);
          ctx.stroke();
          
          // Draw moving projectile
          ctx.fillStyle = getAttackColor(attack.type, 1);
          ctx.beginPath();
          ctx.arc(centerX + currentX, centerY - currentY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        
        return attack;
      }).filter(attack => attack.progress < 1));

      // Draw attack statistics
      drawAttackStats(ctx, centerX, centerY, globeRadius);

      requestAnimationFrame(animate);
    };

    const getAttackColor = (type: string, alpha: number) => {
      const colors = {
        ddos: `rgba(255, 77, 77, ${alpha})`,
        brute_force: `rgba(255, 159, 67, ${alpha})`,
        xss: `rgba(241, 196, 15, ${alpha})`,
        sqli: `rgba(0, 206, 201, ${alpha})`
      };
      return colors[type as keyof typeof colors] || `rgba(255, 255, 255, ${alpha})`;
    };

    const drawAttackStats = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) => {
      const stats = {
        ddos: attacks.filter(a => a.type === 'ddos').length,
        brute_force: attacks.filter(a => a.type === 'brute_force').length,
        xss: attacks.filter(a => a.type === 'xss').length,
        sqli: attacks.filter(a => a.type === 'sqli').length
      };

      // Draw legend in corners
      ctx.fillStyle = 'rgba(41, 45, 50, 0.8)';
      ctx.fillRect(20, 20, 200, 150);
      ctx.strokeStyle = 'rgba(0, 206, 201, 0.5)';
      ctx.strokeRect(20, 20, 200, 150);

      ctx.fillStyle = '#ffffff';
      ctx.font = '14px monospace';
      ctx.fillText('ATTACK TYPES', 30, 45);
      
      let y = 70;
      Object.entries(stats).forEach(([type, count]) => {
        ctx.fillStyle = getAttackColor(type, 1);
        ctx.fillText('●', 30, y);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${type.toUpperCase()}: ${count}`, 45, y);
        y += 20;
      });
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [attacks]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Globe className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading global attack map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Globe className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">Global Cyber Attack Map</h1>
              <div className="ml-4 px-3 py-1 bg-red-600 rounded-full text-sm font-medium flex items-center">
                <Activity className="w-3 h-3 mr-1 animate-pulse" />
                Live Threats
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400">
                Active Attacks: <span className="text-red-400 font-bold">{attacks.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-0"
      />

      {/* Control Panel */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gray-900/80 backdrop-blur-sm border-t border-gray-700">
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gray-800 border-gray-700 p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-600 rounded-lg">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">DDoS Attacks</p>
                  <p className="text-xl font-bold text-red-400">
                    {attacks.filter(a => a.type === 'ddos').length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="bg-gray-800 border-gray-700 p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-600 rounded-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Brute Force</p>
                  <p className="text-xl font-bold text-orange-400">
                    {attacks.filter(a => a.type === 'brute_force').length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="bg-gray-800 border-gray-700 p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-600 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">XSS Attacks</p>
                  <p className="text-xl font-bold text-yellow-400">
                    {attacks.filter(a => a.type === 'xss').length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="bg-gray-800 border-gray-700 p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-cyan-600 rounded-lg">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">SQL Injection</p>
                  <p className="text-xl font-bold text-cyan-400">
                    {attacks.filter(a => a.type === 'sqli').length}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}