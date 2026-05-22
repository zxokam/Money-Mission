export default function DollarLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-4">
      <div className="relative w-48 h-48">
        {/* Hamster Wheel */}
        <svg
          viewBox="0 0 200 200"
          className="absolute inset-0 w-full h-full dollar-spin"
        >
          <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
          <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
          {[0, 30, 60, 90, 120, 150].map((angle) => (
            <line key={angle} x1="100" y1="20" x2="100" y2="180"
              stroke="rgba(255,255,255,0.1)" strokeWidth="3"
              transform={`rotate(${angle} 100 100)`} />
          ))}
          {[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340].map((angle) => (
            <line key={`rung-${angle}`} x1="100" y1="24" x2="100" y2="30"
              stroke="rgba(255,255,255,0.2)" strokeWidth="4" strokeLinecap="round"
              transform={`rotate(${angle} 100 100)`} />
          ))}
        </svg>

        {/* Wheel Stand */}
        <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
          <line x1="40" y1="100" x2="50" y2="190" stroke="rgba(255,255,255,0.15)" strokeWidth="6" strokeLinecap="round" />
          <line x1="160" y1="100" x2="150" y2="190" stroke="rgba(255,255,255,0.15)" strokeWidth="6" strokeLinecap="round" />
          <line x1="35" y1="190" x2="165" y2="190" stroke="rgba(255,255,255,0.15)" strokeWidth="6" strokeLinecap="round" />
          <circle cx="100" cy="100" r="8" fill="rgba(255,255,255,0.2)" />
        </svg>

        {/* Running Dollar Bill Character */}
        <div className="absolute top-[38%] left-1/2 -translate-x-1/2">
          <svg viewBox="0 0 80 100" className="w-[77px] h-24">
            <rect x="15" y="25" width="50" height="28" rx="3" fill="#22c55e" stroke="#15803d" strokeWidth="2" />
            <text x="40" y="45" textAnchor="middle" fill="#15803d" fontSize="18" fontWeight="bold" fontFamily="serif">$</text>
            <rect x="18" y="28" width="44" height="2" fill="#15803d" opacity="0.3" />
            <rect x="18" y="48" width="44" height="2" fill="#15803d" opacity="0.3" />
            <ellipse cx="30" cy="36" rx="3" ry="4" fill="white" />
            <ellipse cx="50" cy="36" rx="3" ry="4" fill="white" />
            <circle cx="31" cy="37" r="1.5" fill="#1f2937" className="dollar-blink" />
            <circle cx="51" cy="37" r="1.5" fill="#1f2937" className="dollar-blink" />
            <ellipse cx="58" cy="30" rx="2" ry="3" fill="#60a5fa" className="dollar-sweat" />
            <g className="dollar-arm-swing" style={{ transformOrigin: "20px 40px" }}>
              <line x1="15" y1="35" x2="5" y2="45" stroke="#15803d" strokeWidth="4" strokeLinecap="round" />
              <circle cx="5" cy="47" r="4" fill="#fcd34d" />
            </g>
            <g className="dollar-arm-swing-reverse" style={{ transformOrigin: "60px 40px" }}>
              <line x1="65" y1="35" x2="75" y2="45" stroke="#15803d" strokeWidth="4" strokeLinecap="round" />
              <circle cx="75" cy="47" r="4" fill="#fcd34d" />
            </g>
            <g className="dollar-leg-run" style={{ transformOrigin: "30px 53px" }}>
              <line x1="30" y1="53" x2="20" y2="75" stroke="#15803d" strokeWidth="5" strokeLinecap="round" />
              <line x1="20" y1="75" x2="15" y2="90" stroke="#15803d" strokeWidth="4" strokeLinecap="round" />
              <ellipse cx="12" cy="92" rx="6" ry="4" fill="#1f2937" />
            </g>
            <g className="dollar-leg-run-reverse" style={{ transformOrigin: "50px 53px" }}>
              <line x1="50" y1="53" x2="60" y2="75" stroke="#15803d" strokeWidth="5" strokeLinecap="round" />
              <line x1="60" y1="75" x2="65" y2="90" stroke="#15803d" strokeWidth="4" strokeLinecap="round" />
              <ellipse cx="68" cy="92" rx="6" ry="4" fill="#1f2937" />
            </g>
          </svg>
        </div>
      </div>

      <p className="mt-6 text-sm text-white/30 dollar-pulse">
        AI is evaluating your mission...
      </p>
    </div>
  );
}
