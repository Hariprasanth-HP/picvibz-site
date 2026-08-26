import { VideoPlayer } from './VideoPlayer';

interface MediaDisplayProps {
  type: 'image' | 'video' | 'gif';
  originalUrl?: string;
  previewUrl?: string;
  mediumUrl?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  previewVideoUrl?: string;
  width?: number | null;
  height?: number | null;
  alt?: string;
  className?: string;
  fill?: boolean;
  onLoad?: () => void;
}

export function MediaDisplay({
  type,
  originalUrl,
  previewUrl,
  mediumUrl,
  thumbnailUrl,
  videoUrl,
  posterUrl,
  previewVideoUrl,
  alt = '',
  className = '',
  fill = false,
  onLoad,
}: MediaDisplayProps) {
  const isVideo = type === 'video';
  const isGif = type === 'gif';

  const imageUrl = originalUrl || previewUrl || mediumUrl || thumbnailUrl;
  const poster = posterUrl || previewUrl || mediumUrl || thumbnailUrl || imageUrl;
  const videoSrc = videoUrl || originalUrl;

  if (isVideo) {
    return (
      <VideoPlayer
        src={videoSrc || ''}
        poster={poster}
        preview={previewVideoUrl}
        autoPlay={fill}
        muted={fill}
        loop={fill}
        playsInline={true}
        className={`w-full h-full ${fill ? 'object-cover' : 'object-contain'} ${className}`}
        onError={onLoad}
      />
    );
  }

  if (isGif) {
    return (
      <img
        src={originalUrl || previewUrl || mediumUrl || ''}
        alt={alt}
        className={`w-full h-full ${fill ? 'object-cover' : 'object-contain'} ${className}`}
        onLoad={onLoad}
      />
    );
  }

  return (
    <img
      src={imageUrl || ''}
      alt={alt}
      className={`w-full h-full ${fill ? 'object-cover' : 'object-contain'} ${className}`}
      onLoad={onLoad}
    />
  );
}