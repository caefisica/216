"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getBorrowingHistory } from "../actions";
import { toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import { Clock, BookOpen, TrendingUp, Loader2 } from "lucide-react";

interface TimelineEvent {
  id: string;
  type: "borrow" | "return" | "request";
  timestamp: string;
  bookTitle: string;
  userName?: string;
  userInitials?: string;
  status: string;
  anonymized?: boolean;
}

export function BorrowingTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnonymized, setShowAnonymized] = useState(false);

  const fetchTimelineEvents = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getBorrowingHistory({ limit: 50 });
      if (isErr(result)) {
        toastActionError(result.error);
        return;
      }

      const timelineEvents: TimelineEvent[] = [];

      result.value.forEach((request) => {
        const userName = showAnonymized ? undefined : request.user?.name;
        const userInitials = userName
          ? userName
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
          : "U";

        // Request event
        timelineEvents.push({
          id: `${request.id}-request`,
          type: "request",
          timestamp: request.requestDate!.toISOString(),
          bookTitle: request.book?.title || "Libro desconocido",
          userName,
          userInitials,
          status: request.status,
          anonymized: showAnonymized,
        });

        // Approval/Borrow event
        if (request.approvedDate && request.status !== "rejected") {
          timelineEvents.push({
            id: `${request.id}-borrow`,
            type: "borrow",
            timestamp: request.approvedDate.toISOString(),
            bookTitle: request.book?.title || "Libro desconocido",
            userName,
            userInitials,
            status: request.status,
            anonymized: showAnonymized,
          });
        }

        // Return event
        if (request.returnDate) {
          timelineEvents.push({
            id: `${request.id}-return`,
            type: "return",
            timestamp: request.returnDate.toISOString(),
            bookTitle: request.book?.title || "Libro desconocido",
            userName,
            userInitials,
            status: "returned",
            anonymized: showAnonymized,
          });
        }
      });

      timelineEvents.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      setEvents(timelineEvents);
    } finally {
      setLoading(false);
    }
  }, [showAnonymized]);

  useEffect(() => {
    fetchTimelineEvents();
  }, [fetchTimelineEvents]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case "request":
        return <Clock className="h-4 w-4" />;
      case "borrow":
        return <BookOpen className="h-4 w-4" />;
      case "return":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: string, status: string) => {
    if (status === "rejected") return "bg-destructive/10 text-destructive border-destructive/30";
    switch (type) {
      case "request":
        return "bg-accent text-accent-foreground border-border";
      case "borrow":
        return "bg-status-borrowed-muted text-status-borrowed-foreground border-status-borrowed-border";
      case "return":
        return "bg-status-returned-muted text-status-returned-foreground border-status-returned-border";
      default:
        return "bg-surface-muted text-foreground border-border";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) return `hace ${Math.floor(diffInHours)}h`;
    if (diffInHours < 24 * 7) return `hace ${Math.floor(diffInHours / 24)}d`;
    return date.toLocaleDateString("es-ES");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5" /> Cronograma de actividad
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="anonymize"
                  checked={showAnonymized}
                  onCheckedChange={setShowAnonymized}
                />
                <Label htmlFor="anonymize" className="text-sm">
                  Anonimizar
                </Label>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay actividad para mostrar</p>
            </div>
          ) : (
            <div className="space-y-6">
              {events.map((event, index) => (
                <div key={event.id} className="flex items-start space-x-4 relative">
                  <div className="relative z-10">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-surface">
                      {event.anonymized ? (
                        getEventIcon(event.type)
                      ) : (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-surface-muted text-xs font-bold">
                            {event.userInitials}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                    {index < events.length - 1 && (
                      <div className="absolute top-10 left-1/2 -z-10 h-10 w-px bg-border" />
                    )}
                  </div>
                  <div className="flex-1 pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-foreground">
                        {event.anonymized ? "Un usuario" : event.userName}
                        <span className="font-normal text-muted-foreground ml-1">
                          {event.type === "request"
                            ? "solicitó"
                            : event.type === "borrow"
                              ? "tomó prestado"
                              : "devolvió"}
                        </span>
                        <span className="ml-1">&quot;{event.bookTitle}&quot;</span>
                      </p>
                      <Badge className={getEventColor(event.type, event.status)} variant="outline">
                        {event.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(event.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
