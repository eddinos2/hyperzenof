import React from 'react';

// Composants de décoration saisonnière
export function HalloweenDecorations() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Particules flottantes */}
      <div className="absolute top-10 left-10 animate-bounce opacity-20 seasonal-particle">
        <div className="text-4xl">🎃</div>
      </div>
      <div className="absolute top-20 right-20 animate-pulse opacity-30 seasonal-particle">
        <div className="text-3xl">🕷️</div>
      </div>
      <div className="absolute top-32 left-1/3 animate-bounce opacity-25 seasonal-particle" style={{ animationDelay: '1s' }}>
        <div className="text-2xl">🦇</div>
      </div>
      <div className="absolute top-40 right-1/3 animate-pulse opacity-20 seasonal-particle" style={{ animationDelay: '2s' }}>
        <div className="text-3xl">👻</div>
      </div>
      <div className="absolute bottom-20 left-20 animate-bounce opacity-15 seasonal-particle">
        <div className="text-4xl">🕸️</div>
      </div>
      
      {/* Étoiles scintillantes */}
      <div className="absolute top-16 left-1/2 w-2 h-2 bg-orange-500 rounded-full animate-ping opacity-30"></div>
      <div className="absolute top-60 right-1/4 w-1 h-1 bg-orange-400 rounded-full animate-pulse opacity-40"></div>
    </div>
  );
}

export function ChristmasDecorations() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Flocons de neige */}
      <div className="absolute top-10 left-10 animate-bounce opacity-30">
        <div className="text-4xl">🎄</div>
      </div>
      <div className="absolute top-20 right-20 animate-pulse opacity-25">
        <div className="text-3xl">❄️</div>
      </div>
      <div className="absolute top-32 left-1/4 animate-bounce opacity-20" style={{ animationDelay: '0.5s' }}>
        <div className="text-2xl">⭐</div>
      </div>
      <div className="absolute top-40 right-1/3 animate-pulse opacity-30" style={{ animationDelay: '1.5s' }}>
        <div className="text-3xl">🎁</div>
      </div>
      <div className="absolute bottom-20 left-1/3 animate-bounce opacity-25">
        <div className="text-4xl">🔔</div>
      </div>
      <div className="absolute top-60 left-20 animate-pulse opacity-20">
        <div className="text-2xl">🕯️</div>
      </div>
      
      {/* Particules dorées */}
      <div className="absolute top-24 right-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-40"></div>
      <div className="absolute bottom-32 left-1/2 w-1 h-1 bg-red-500 rounded-full animate-pulse opacity-50"></div>
    </div>
  );
}

export function NewYearDecorations() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Feux d'artifice et confettis */}
      <div className="absolute top-10 left-10 animate-pulse opacity-30">
        <div className="text-4xl">🎊</div>
      </div>
      <div className="absolute top-20 right-20 animate-bounce opacity-25">
        <div className="text-3xl">✨</div>
      </div>
      <div className="absolute top-32 left-1/3 animate-pulse opacity-35" style={{ animationDelay: '1s' }}>
        <div className="text-2xl">🎆</div>
      </div>
      <div className="absolute top-40 right-1/4 animate-bounce opacity-30" style={{ animationDelay: '2s' }}>
        <div className="text-3xl">🥂</div>
      </div>
      <div className="absolute bottom-20 left-1/4 animate-pulse opacity-25">
        <div className="text-4xl">🎉</div>
      </div>
      
      {/* Particules scintillantes */}
      <div className="absolute top-16 right-1/3 w-3 h-3 bg-gold rounded-full animate-ping opacity-50" style={{ background: 'gold' }}></div>
      <div className="absolute bottom-40 left-1/2 w-2 h-2 bg-blue-400 rounded-full animate-pulse opacity-40"></div>
      <div className="absolute top-50 left-1/5 w-1 h-1 bg-silver rounded-full animate-ping opacity-30" style={{ background: 'silver' }}></div>
    </div>
  );
}

export function ValentineDecorations() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Cœurs flottants */}
      <div className="absolute top-10 left-10 animate-bounce opacity-25">
        <div className="text-4xl">💝</div>
      </div>
      <div className="absolute top-20 right-20 animate-pulse opacity-30">
        <div className="text-3xl">💕</div>
      </div>
      <div className="absolute top-32 left-1/3 animate-bounce opacity-20" style={{ animationDelay: '1s' }}>
        <div className="text-2xl">💖</div>
      </div>
      <div className="absolute top-40 right-1/4 animate-pulse opacity-35" style={{ animationDelay: '1.5s' }}>
        <div className="text-3xl">🌹</div>
      </div>
      <div className="absolute bottom-20 left-1/4 animate-bounce opacity-25">
        <div className="text-4xl">💐</div>
      </div>
      <div className="absolute top-60 right-1/3 animate-pulse opacity-20">
        <div className="text-2xl">💌</div>
      </div>
      
      {/* Particules roses */}
      <div className="absolute top-24 left-1/2 w-2 h-2 bg-pink-400 rounded-full animate-ping opacity-40"></div>
      <div className="absolute bottom-32 right-1/4 w-1 h-1 bg-red-400 rounded-full animate-pulse opacity-50"></div>
    </div>
  );
}

export function SpringDecorations() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Fleurs et nature */}
      <div className="absolute top-10 left-10 animate-bounce opacity-30">
        <div className="text-4xl">🌸</div>
      </div>
      <div className="absolute top-20 right-20 animate-pulse opacity-25">
        <div className="text-3xl">🌺</div>
      </div>
      <div className="absolute top-32 left-1/4 animate-bounce opacity-20" style={{ animationDelay: '0.8s' }}>
        <div className="text-2xl">🌻</div>
      </div>
      <div className="absolute top-40 right-1/3 animate-pulse opacity-30" style={{ animationDelay: '1.2s' }}>
        <div className="text-3xl">🦋</div>
      </div>
      <div className="absolute bottom-20 left-1/3 animate-bounce opacity-25">
        <div className="text-4xl">🌷</div>
      </div>
      <div className="absolute top-60 left-20 animate-pulse opacity-20">
        <div className="text-2xl">🐝</div>
      </div>
      
      {/* Particules vertes */}
      <div className="absolute top-16 right-1/4 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-35"></div>
      <div className="absolute bottom-40 left-1/2 w-1 h-1 bg-lime-400 rounded-full animate-pulse opacity-45"></div>
    </div>
  );
}

export function SummerDecorations() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Soleil et plage */}
      <div className="absolute top-10 left-10 animate-pulse opacity-30">
        <div className="text-4xl">☀️</div>
      </div>
      <div className="absolute top-20 right-20 animate-bounce opacity-25">
        <div className="text-3xl">🏖️</div>
      </div>
      <div className="absolute top-32 left-1/3 animate-pulse opacity-20" style={{ animationDelay: '1s' }}>
        <div className="text-2xl">🌊</div>
      </div>
      <div className="absolute top-40 right-1/4 animate-bounce opacity-35" style={{ animationDelay: '1.5s' }}>
        <div className="text-3xl">🐚</div>
      </div>
      <div className="absolute bottom-20 left-1/4 animate-pulse opacity-25">
        <div className="text-4xl">🌴</div>
      </div>
      <div className="absolute top-60 right-1/3 animate-bounce opacity-20">
        <div className="text-2xl">⛵</div>
      </div>
      
      {/* Particules bleues et jaunes */}
      <div className="absolute top-24 left-1/2 w-3 h-3 bg-blue-400 rounded-full animate-ping opacity-40"></div>
      <div className="absolute bottom-32 right-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-pulse opacity-50"></div>
    </div>
  );
}

// Composant principal qui affiche les décorations selon le thème actuel
export function SeasonalDecorations({ theme }: { theme: string }) {
  switch (theme) {
    case 'halloween':
      return <HalloweenDecorations />;
    case 'christmas':
      return <ChristmasDecorations />;
    case 'newyear':
      return <NewYearDecorations />;
    case 'valentine':
      return <ValentineDecorations />;
    case 'spring':
      return <SpringDecorations />;
    case 'summer':
      return <SummerDecorations />;
    default:
      return null;
  }
}