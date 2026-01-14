import React from 'react';

export function Footer() {
  return (
    <footer className="border-t-2 border-foreground bg-surface py-4 mt-8">
      <div className="container-brutal">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 <span className="font-semibold text-brand-aurlom">Hyperzen</span> - Module Profs développé par 
            <span className="font-semibold"> DSI AURLOM BTS+</span>
          </p>
        </div>
      </div>
    </footer>
  );
}