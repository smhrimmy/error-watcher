import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, AlertTriangle, RefreshCw, Mail, ShieldCheck } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function SecurityBlocked() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const reason = queryParams.get('reason') || 'Suspicious activity detected';
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showUnlockForm, setShowUnlockForm] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 3D Holographic Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Particle system for 3D effect
    interface Particle {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      size: number;
      opacity: number;
      color: string;
    }

    const particles: Particle[] = [];
    const particleCount = 150;

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * 1000,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        vz: Math.random() * 5 + 1,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.8 + 0.2,
        color: ['#00cec9', '#6d5dfc', '#ff4d4d', '#f1c40f'][Math.floor(Math.random() * 4)]
      });
    }

    // Holographic shield animation
    let shieldRotation = 0;
    let shieldPulse = 0;

    function animate() {
      ctx.fillStyle = 'rgba(41, 45, 50, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw particles
      particles.forEach((particle) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.z += particle.vz;

        // Wrap around
        if (particle.z > 1000) {
          particle.z = 0;
          particle.x = Math.random() * canvas.width;
          particle.y = Math.random() * canvas.height;
        }

        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Calculate perspective
        const perspective = 1000 / (1000 + particle.z);
        const size = particle.size * perspective;
        const opacity = particle.opacity * perspective;

        // Draw particle
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = particle.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw holographic shield
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2 - 100;
      const radius = 120;

      shieldRotation += 0.02;
      shieldPulse = Math.sin(Date.now() * 0.003) * 0.3 + 0.7;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(shieldRotation);

      // Outer ring
      ctx.strokeStyle = `rgba(0, 206, 201, ${0.8 * shieldPulse})`;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00cec9';
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner ring
      ctx.strokeStyle = `rgba(109, 93, 252, ${0.6 * shieldPulse})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#6d5dfc';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      // Center core
      ctx.fillStyle = `rgba(255, 77, 77, ${0.4 * shieldPulse})`;
      ctx.shadowColor = '#ff4d4d';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Shield icon
      ctx.restore();
      ctx.font = '60px monospace';
      ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * shieldPulse})`;
      ctx.textAlign = 'center';
      ctx.fillText('🛡️', centerX, centerY + 20);

      // Matrix-style digital rain effect
      const columns = Math.floor(canvas.width / 20);
      for (let i = 0; i < columns; i++) {
        const x = i * 20;
        const y = (Math.sin(Date.now() * 0.001 + i * 0.1) * 50) + canvas.height / 2 + 150;
        const opacity = Math.sin(Date.now() * 0.002 + i * 0.2) * 0.5 + 0.5;

        ctx.fillStyle = `rgba(0, 206, 201, ${opacity * 0.3})`;
        ctx.font = '14px monospace';
        ctx.fillText(String.fromCharCode(0x30A0 + Math.random() * 96), x, y);
      }

      requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleUnlockRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/security/unlock-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message })
      });

      if (response.ok) {
        alert('Unlock request submitted successfully. You will receive an email with further instructions.');
        setShowUnlockForm(false);
        setEmail('');
        setMessage('');
      } else {
        alert('Failed to submit unlock request. Please try again.');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#292d32] overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-0 opacity-60"
      />
      
      <div className="relative z-10 p-8 bg-[#292d32]/90 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,206,201,0.2)] max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src="/favicon.svg" alt="Error Watcher Logo" className="w-16 h-16 filter drop-shadow-[0_0_15px_rgba(255,77,77,0.5)]" />
          </div>
          
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#ff4d4d] to-[#ff9f43] mb-4 filter drop-shadow-lg">
            ACCESS BLOCKED
          </h1>
          
          <p className="text-gray-300 mb-6 font-mono text-sm">
            Your activity triggered our security defense system.
          </p>
          
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center text-red-400 mb-2">
              <AlertTriangle className="w-4 h-4 mr-2" />
              <span className="font-semibold">Reason:</span>
            </div>
            <p className="text-red-300 text-sm capitalize">
              {reason.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {!showUnlockForm ? (
            <>
              <Button
                onClick={() => setShowUnlockForm(true)}
                variant="primary"
                fullWidth
                icon={<Mail className="w-4 h-4" />}
                className="bg-gradient-to-r from-[#00cec9] to-[#6d5dfc] text-white border-none"
              >
                Request Access Restoration
              </Button>
              
              <Button
                onClick={() => navigate('/')}
                variant="secondary"
                fullWidth
                icon={<RefreshCw className="w-4 h-4" />}
                className="text-gray-300 border-gray-600"
              >
                Return to Home
              </Button>
            </>
          ) : (
            <form onSubmit={handleUnlockRequest} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#353940] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00cec9] focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Explanation
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-[#353940] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00cec9] focus:border-transparent resize-none"
                  placeholder="Please explain why you believe this block is an error..."
                />
              </div>
              
              <div className="flex space-x-3">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-[#00cec9] to-[#6d5dfc] text-white border-none"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  onClick={() => setShowUnlockForm(false)}
                  variant="secondary"
                  className="text-gray-300 border-gray-600"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-xs">
            This system is protected by the Fortress Security Layer
          </p>
          <p className="text-gray-600 text-xs mt-1">
            All security events are logged and monitored
          </p>
        </div>
      </div>
    </div>
  );
}