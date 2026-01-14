import React, { useState } from 'react';
import { BrutalButton } from '@/components/ui/brutal-button';
import { BrutalCard, BrutalCardContent, BrutalCardHeader, BrutalCardTitle } from '@/components/ui/brutal-card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotificationSystem } from '@/hooks/useNotificationSystem';
import { Bell, Check, CheckCheck, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const notificationIcons = {
  info: <Info className="h-4 w-4 text-blue-500" />,
  success: <CheckCircle className="h-4 w-4 text-green-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />
};

const notificationColors = {
  info: 'border-l-blue-500 bg-blue-50',
  success: 'border-l-green-500 bg-green-50',
  warning: 'border-l-orange-500 bg-orange-50',
  error: 'border-l-red-500 bg-red-50'
};

export function AdvancedNotificationCenter() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotificationSystem();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = notifications.filter(notification => 
    filter === 'all' || !notification.is_read
  );

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <BrutalButton 
          variant="outline" 
          size="sm"
          className="relative"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </BrutalButton>
      </DialogTrigger>
      
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Notifications ({unreadCount})
            </DialogTitle>
            <div className="flex space-x-2">
              <BrutalButton
                variant="outline"
                size="sm"
                onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
              >
                {filter === 'all' ? 'Non lues' : 'Toutes'}
              </BrutalButton>
              {unreadCount > 0 && (
                <BrutalButton
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Tout lire
                </BrutalButton>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-96">
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Chargement des notifications...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-l-4 rounded-r-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                    notificationColors[notification.type]
                  } ${!notification.is_read ? 'border-foreground/20' : 'opacity-75'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        {notificationIcons[notification.type]}
                        <h4 className={`text-sm font-medium truncate ${
                          !notification.is_read ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${
                        !notification.is_read ? 'text-foreground/80' : 'text-muted-foreground'
                      }`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { 
                          addSuffix: true,
                          locale: fr 
                        })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <BrutalButton
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="ml-2 flex-shrink-0"
                      >
                        <Check className="h-3 w-3" />
                      </BrutalButton>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}