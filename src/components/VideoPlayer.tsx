import { useRef, useEffect, useState } from 'react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  preview?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  className?: string;
  onError?: () => void;
}

export function VideoPlayer({
  src,
  poster,
  preview,
  autoPlay = false,
  muted = true,
  loop = true,
  playsInline = true,
  className = '',
  onError,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setHasError(false);

    const handleError = () => {
      setHasError(true);
      onError?.();
    };

    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('error', handleError);
    };
  }, [src, onError]);

  if (hasError) {
    return (
      <div className={`relative bg-gray-900 ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center p-4">
            <p className="text-red-400 text-sm">Unable to play video</p>
            <button
              onClick={() => videoRef.current?.load()}
              className="mt-2 text-xs text-white bg-[#a855f7] px-3 py-1 rounded hover:bg-[#a855f7]/80"
            >
              Retry
            </button>
          </div>
        </div>
        {poster && <img src={poster} alt="" className="w-full h-full object-cover opacity-50" />}
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      playsInline={playsInline}
      controls={!autoPlay}
      className={`w-full h-full object-contain ${className}`}
      preload="metadata"
    >
      {preview && <source src={preview} type="video/mp4" />}
    </video>
  );
}