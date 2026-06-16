export default function CameraView({ videoRef, canvasRef, cameraActive }) {
  return (
    <div className="relative w-full max-w-lg mx-auto aspect-[4/3] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
      {!cameraActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
          <svg
            className="w-16 h-16 mb-3 opacity-40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm">Cámara apagada</p>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)', display: cameraActive ? 'block' : 'none' }}
      />

      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full"
        style={{ transform: 'scaleX(-1)' }}
      />

      {cameraActive && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-white/70 font-medium">EN VIVO</span>
        </div>
      )}
    </div>
  )
}
