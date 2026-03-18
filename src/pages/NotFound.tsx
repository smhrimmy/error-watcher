import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simple Matrix-like "digital rain" effect for a cyber feel
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%""\'#&_(),.;:?!\\|{}<>[]^~';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops: number[] = [];

    for (let x = 0; x < columns; x++) {
      drops[x] = 1;
    }

    const draw = () => {
      ctx.fillStyle = 'rgba(41, 45, 50, 0.1)'; // Matches dark theme bg
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00cec9'; // Cyan
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = letters.charAt(Math.floor(Math.random() * letters.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#292d32] overflow-hidden text-center">
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-0 opacity-40"
      />
      
      <div className="relative z-10 p-10 bg-[#292d32]/80 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,206,201,0.2)] max-w-lg w-full mx-4">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-red-500/10 shadow-[0_0_30px_rgba(255,77,77,0.4)]">
            <ShieldAlert className="w-16 h-16 text-[#ff4d4d]" />
          </div>
        </div>
        
        <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#00cec9] to-[#6d5dfc] mb-2 filter drop-shadow-lg">
          404
        </h1>
        <h2 className="text-2xl font-bold text-white mb-4 tracking-widest uppercase">
          Sector Not Found
        </h2>
        
        <p className="text-gray-400 mb-8 font-mono text-sm">
          &gt; ERR_CRITICAL_MISSING<br/>
          &gt; The requested node is offline or does not exist.<br/>
          &gt; Initiating fallback protocols...
        </p>

        <Link to="/">
          <Button variant="primary" size="lg" icon={<Home className="w-5 h-5" />} fullWidth className="bg-[#292d32] border border-[#00cec9]/30 text-[#00cec9] hover:bg-[#00cec9]/10">
            Return to Command Center
          </Button>
        </Link>
      </div>
    </div>
  );
}