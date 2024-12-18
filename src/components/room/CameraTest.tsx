import { useEffect, useRef, useState } from 'react';

export function CameraTest() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    async function checkDevices() {
      try {
        // First enumerate devices
        const availableDevices = await navigator.mediaDevices.enumerateDevices();
        setDevices(availableDevices);
        
        const hasCamera = availableDevices.some(device => device.kind === 'videoinput');
        
        if (!hasCamera) {
          setError('No camera found on this device');
          setIsLoading(false);
          return;
        }

        // Try to access camera
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Camera setup failed:', err);
        setError(`Camera access failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    }

    checkDevices();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Device List */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-white mb-2">Available Devices:</h2>
        <ul className="text-sm text-gray-300">
          {devices.map((device, index) => (
            <li key={index}>
              {device.kind}: {device.label || `Device ${index + 1}`}
            </li>
          ))}
        </ul>
      </div>

      {/* Camera Display/Error */}
      <div className="relative aspect-video bg-black/50 rounded-lg overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
            <p className="text-white/90 text-center">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md text-white/90"
            >
              Retry
            </button>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover"
          />
        )}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/30" />
          </div>
        )}
      </div>
    </div>
  );
} 