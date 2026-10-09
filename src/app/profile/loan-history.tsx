import { CheckCircle, Clock, Info, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { BorrowRequest } from "@/features/users/types";

export function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return (
        <Badge
          variant="outline"
          className="border-border bg-surface-muted px-3 font-semibold text-muted-foreground"
        >
          <Clock className="h-3 w-3 mr-1" /> Pendiente
        </Badge>
      );
    case "approved":
      return (
        <Badge
          variant="outline"
          className="border-status-available/30 bg-status-available/10 px-3 font-semibold text-status-available"
        >
          <CheckCircle className="h-3 w-3 mr-1" /> Vigente
        </Badge>
      );
    case "rejected":
      return (
        <Badge
          variant="outline"
          className="border-destructive/30 bg-destructive/10 px-3 font-semibold text-destructive"
        >
          <XCircle className="h-3 w-3 mr-1" /> Rechazado
        </Badge>
      );
    case "returned":
      return (
        <Badge
          variant="outline"
          className="border-border bg-surface-muted px-3 font-semibold text-muted-foreground"
        >
          <Info className="h-3 w-3 mr-1" /> Devuelto
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="rounded-full">
          {status}
        </Badge>
      );
  }
}

function copyLabel(req: BorrowRequest) {
  if (req.copy) return req.copy.code;
  return req.status === "rejected" ? "Solicitud rechazada" : "Pendiente de asignar";
}

export function LoanHistory({ borrowHistory }: { borrowHistory: BorrowRequest[] }) {
  return (
    <Card className="surface overflow-hidden shadow-xs">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-muted/50">
                <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Libro
                </th>
                <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Estado
                </th>
                <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Ejemplar
                </th>
                <th className="px-8 py-6 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Vencimiento
                </th>
                <th className="px-8 py-6 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {borrowHistory.map((req) => (
                <tr key={req.id} className="transition-colors group hover:bg-surface-muted/60">
                  <td className="px-8 py-6">
                    <span className="font-semibold transition-colors group-hover:text-primary">
                      {req.book?.title}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    {getStatusBadge(req.status)}
                    {req.rejectionReason && (
                      <p className="mt-2 max-w-xs text-xs text-muted-foreground">
                        Motivo: {req.rejectionReason}
                      </p>
                    )}
                  </td>
                  <td className="px-8 py-6 font-mono text-xs text-muted-foreground">
                    {copyLabel(req)}
                  </td>
                  <td className="px-8 py-6 text-muted-foreground">
                    {req.dueDate ? new Date(req.dueDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-8 py-6 text-right font-medium text-muted-foreground">
                    {new Date(req.requestDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
