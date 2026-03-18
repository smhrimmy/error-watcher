export interface DeviceFingerprint {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  cpuCores: number;
  memory: number;
  canvasFingerprint: string;
  webglFingerprint: string;
  audioFingerprint: string;
  fonts: string[];
  plugins: string[];
}

export async function generateDeviceFingerprint(): Promise<DeviceFingerprint> {
  const fingerprint: DeviceFingerprint = {
    userAgent: navigator.userAgent,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    cpuCores: navigator.hardwareConcurrency || 0,
    memory: (navigator as any).deviceMemory || 0,
    canvasFingerprint: await generateCanvasFingerprint(),
    webglFingerprint: await generateWebGLFingerprint(),
    audioFingerprint: await generateAudioFingerprint(),
    fonts: await getFonts(),
    plugins: Array.from(navigator.plugins).map(p => p.name)
  };

  return fingerprint;
}

async function generateCanvasFingerprint(): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'unknown';

  canvas.width = 300;
  canvas.height = 150;
  
  ctx.fillStyle = '#f60';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = '#069';
  ctx.font = '16pt Arial';
  ctx.fillText('Device Fingerprint', 10, 40);
  
  ctx.strokeStyle = '#000';
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  
  return canvas.toDataURL();
}

async function generateWebGLFingerprint(): Promise<string> {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
  if (!gl) return 'unknown';

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (!debugInfo) return 'unknown';

  const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
  const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
  
  return `${vendor}|${renderer}`;
}

async function generateAudioFingerprint(): Promise<string> {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const analyser = audioContext.createAnalyser();
    const gainNode = audioContext.createGain();
    const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    oscillator.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(gainNode);
    gainNode.connect(audioContext.destination);

    return new Promise((resolve) => {
      scriptProcessor.onaudioprocess = (event) => {
        const data = event.inputBuffer.getChannelData(0);
        const fingerprint = Array.from(data).slice(0, 100).join(',');
        oscillator.stop();
        audioContext.close();
        resolve(fingerprint);
      };
      
      oscillator.start();
    });
  } catch {
    return 'unknown';
  }
}

async function getFonts(): Promise<string[]> {
  const baseFonts = ['monospace', 'sans-serif', 'serif'];
  const testString = 'mmmmmmmmmmwwwwwwwwww';
  const testSize = '72px';
  const h = document.getElementsByTagName('body')[0];
  
  const span = document.createElement('span');
  span.style.fontSize = testSize;
  span.style.position = 'absolute';
  span.style.left = '-9999px';
  span.style.top = '-9999px';
  
  const defaultWidth: { [key: string]: number } = {};
  const defaultHeight: { [key: string]: number } = {};
  
  for (const baseFont of baseFonts) {
    span.style.fontFamily = baseFont;
    h.appendChild(span);
    defaultWidth[baseFont] = span.offsetWidth;
    defaultHeight[baseFont] = span.offsetHeight;
    h.removeChild(span);
  }
  
  const fontList = [
    'Arial', 'Arial Black', 'Arial Narrow', 'Arial Rounded MT Bold', 'Book Antiqua', 'Bookman Old Style',
    'Calibri', 'Cambria', 'Cambria Math', 'Century', 'Century Gothic', 'Century Schoolbook',
    'Comic Sans MS', 'Consolas', 'Courier New', 'Franklin Gothic Medium', 'Garamond', 'Georgia',
    'Impact', 'Lucida Bright', 'Lucida Console', 'Lucida Sans Unicode', 'Microsoft Sans Serif',
    'Monotype Corsiva', 'Palatino Linotype', 'Segoe Print', 'Segoe Script', 'Segoe UI', 'Segoe UI Light',
    'Segoe UI Semibold', 'Segoe UI Symbol', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Wingdings'
  ];
  
  const detectedFonts: string[] = [];
  
  for (const font of fontList) {
    let detected = false;
    for (const baseFont of baseFonts) {
      span.style.fontFamily = `'${font}', ${baseFont}`;
      h.appendChild(span);
      const matched = span.offsetWidth !== defaultWidth[baseFont] || span.offsetHeight !== defaultHeight[baseFont];
      h.removeChild(span);
      if (matched) {
        detected = true;
        break;
      }
    }
    if (detected) {
      detectedFonts.push(font);
    }
  }
  
  return detectedFonts;
}