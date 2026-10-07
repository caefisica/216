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
    if (status === "rejected") return "bg-red-100 text-red-800 border-red-200";
    switch (type) {
      case "request":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "borrow":
        return "bg-green-100 text-green-800 border-green-200";
      case "return":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No hay actividad para mostrar</p>
            </div>
          ) : (
            <div className="space-y-6">
              {events.map((event, index) => (
                <div key={event.id} className="flex items-start space-x-4 relative">
                  <div className="relative z-10">
                    <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center bg-white overflow-hidden">
                      {event.anonymized ? (
                        getEventIcon(event.type)
                      ) : (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-gray-100 font-bold">
                            {event.userInitials}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                    {index < events.length - 1 && (
                      <div className="absolute top-10 left-1/2 w-px h-10 bg-gray-200 -z-10" />
                    )}
                  </div>
                  <div className="flex-1 pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900">
                        {event.anonymized ? "Un usuario" : event.userName}
                        <span className="font-normal text-gray-500 ml-1">
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
                    <p className="text-xs text-gray-400">{formatTimestamp(event.timestamp)}</p>
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
