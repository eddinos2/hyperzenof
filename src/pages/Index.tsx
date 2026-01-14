import React from 'react';
import { CreateTestUsers } from '@/components/auth/CreateTestUsers';

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Bienvenue sur AURLOM BTS+</h1>
        <p className="text-xl text-muted-foreground mb-8">Système de gestion scolaire</p>
        <CreateTestUsers />
      </div>
    </div>
  );
};

export default Index;
