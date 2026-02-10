export const AnimatedNoiseIcon = (props: { triggerAnimation?: boolean }) => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 -4 24 24"
      fill="currentColor"
      stroke="none"
      overflow="visible"
      xmlns="http://www.w3.org/2000/svg"
      class={`animated-noise-icon ${props.triggerAnimation ? 'animating' : ''}`}
    >
      <title>Animated noise icon</title>
      <style>{`
        @keyframes grow-shrink {
          30% {
            transform: scaleY(.4);
          }
          40% {
            transform: scaleY(1);
          }
          80% {
            transform: scaleY(1);
          }
          90% {
            transform: scaleY(.4);
          }
        }
        .animated-noise-icon {
          .bars {
            opacity: 0
          }
        }
        .animated-noise-icon.animating {
          .bars {
            opacity: 1;
            animation: noise-cycle-left 0.2s linear infinite;
          }
          .line {
            opacity: 0;
          }
          .bar-1 {
            transform-origin: 3px 8px;
            animation: grow-shrink 0.8s ease-in-out infinite;
          }
          .bar-2 {
            transform-origin: 7px 8px;
            animation: grow-shrink 0.8s ease-in-out .5s infinite;
          }
          .bar-3 {
            transform-origin: 11px 8px;
            animation: grow-shrink 0.8s ease-in-out .1s infinite;
          }
          .bar-4 {
            transform-origin: 15px 8px;
            animation: grow-shrink 0.8s ease-in-out .4s infinite;
          }
          .bar-5 {
            transform-origin: 19px 8px;
            animation: grow-shrink 0.8s ease-in-out .2s infinite;
          }
          .bar-6 {
            transform-origin: 23px 8px;
            animation: grow-shrink 0.8s ease-in-out .3s infinite;
          }
        }
      `}</style>
      <path
        class="line"
        d="M23.4133 9H24V6.99h-1.72l-2.4585-5.1542-1.9462 7.1692-1.5063-4.3015-2.0261 2.3585L11.7836 0 9.8374 8.4556l-1.7062-5.32-2.1328 5.0118-1.8928-4.449L1.7729 7H0v2.01h2.9592l.9331-.7152 2.1061 4.9447 1.8662-4.3819L10.1573 16l2.0528-8.9514 1.4397 3.9263 1.9728-2.3317 2.4927 7.0888 2.0528-7.5712L20.92 9z"
      />
      <g class="bars">
        <rect class="bar-1" x="2" y="6" width="2" height="4"/>
        <rect class="bar-2" x="6" y="3.25" width="2" height="9.5"/>
        <rect class="bar-3" x="10" y="0" width="2" height="16"/>
        <rect class="bar-4" x="14" y="5" width="2" height="6"/>
        <rect class="bar-5" x="18" y="1.5" width="2" height="13"/>
        <rect class="bar-6" x="22" y="7" width="2" height="2"/>
      </g>
    </svg>
  );
};
