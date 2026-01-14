import React, { useState } from 'react';
import { UserCreationRequestForm } from './UserCreationRequestForm';
import { UserCreationRequestsList } from './UserCreationRequestsList';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserPlus, FileText, Building } from 'lucide-react';

export function DirectorCampusManagement() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRequestSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <BrutalCard>
        <BrutalCardHeader>
          <BrutalCardTitle className="flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Gestion du Campus
          </BrutalCardTitle>
        </BrutalCardHeader>
        <BrutalCardContent>
          <p className="text-muted-foreground">
            En tant que directeur de campus, vous pouvez demander la création de nouveaux utilisateurs 
            (enseignants ou autres directeurs) pour votre campus. Ces demandes seront traitées par l'administration.
          </p>
        </BrutalCardContent>
      </BrutalCard>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="requests" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Mes Demandes
          </TabsTrigger>
          <TabsTrigger value="new-request" className="flex items-center">
            <UserPlus className="h-4 w-4 mr-2" />
            Nouvelle Demande
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <UserCreationRequestsList 
            key={refreshKey}
            viewMode="director" 
            onRefresh={() => setRefreshKey(prev => prev + 1)}
          />
        </TabsContent>

        <TabsContent value="new-request">
          <UserCreationRequestForm onSuccess={handleRequestSuccess} />
        </TabsContent>
      </Tabs>
    </div>
  );
}