const Logo = ({ isExpanded = true, subtitle = "Employee Dashboard", showSubtitle = true }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: isExpanded ? '12px' : '0' }}>
      {/* Hexagon Icon - Exact design from login page */}
      <svg
        width="44"
        height="50"
        viewBox="0 0 44 50"
        fill="none"
        style={{ minWidth: '44px', minHeight: '50px' }}
      >
        {/* Hexagon outline - Light Blue for sidebar visibility */}
        <polygon
          points="22,5 9,12.5 9,27.5 22,35 35,27.5 35,12.5"
          stroke="#3FABC6"
          strokeWidth="3.4"
          strokeLinejoin="round"
        />
        {/* Pink/Magenta rectangle in center */}
        <rect x="17" y="15.5" width="10" height="10" rx="2.6" fill="#de37a3" />
        {/* Curved path at bottom */}
        <path
          d="M11 40 Q22 49 33 40"
          stroke="#de37a3"
          strokeWidth="3.4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {/* Text Content */}
      {isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'baseline' }}>
            <span
              style={{
                fontSize: '17px',
                fontWeight: 'bold',
                color: '#1B2536',
                letterSpacing: '-0.5px',
              }}
            >
              ABY
            </span>
            <span
              style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#8A93A6',
                letterSpacing: '-0.3px',
              }}
            >
              INVENTORY
            </span>
          </div>
          {showSubtitle && (
            <span
              style={{
                fontSize: '14px',
                color: '#6A788D',
                fontWeight: '500',
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
