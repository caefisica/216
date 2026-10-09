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
          className="bg-yellow-50 text-yellow-700 border-yellow-200 font-bold rounded-full px-3"
        >
          <Clock className="h-3 w-3 mr-1" /> Pendiente
        </Badge>
      );
    case "approved":
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200 font-bold rounded-full px-3"
        >
          <CheckCircle className="h-3 w-3 mr-1" /> Vigente
        </Badge>
      );
    case "rejected":
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200 font-bold rounded-full px-3"
        >
          <XCircle className="h-3 w-3 mr-1" /> Rechazado
        </Badge>
      );
    case "returned":
      return (
        <Badge
          variant="outline"
          className="bg-gray-50 text-gray-500 border-gray-200 font-bold rounded-full px-3"
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
    <Card className="rounded-3xl border-gray-100 shadow-xs overflow-hidden bg-white">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">
                  Libro
                </th>
                <th className="px-8 py-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">
                  Estado
                </th>
                <th className="px-8 py-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">
                  Ejemplar
                </th>
                <th className="px-8 py-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">
                  Vencimiento
                </th>
                <th className="px-8 py-6 font-black text-gray-400 uppercase tracking-widest text-[10px] text-right">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {borrowHistory.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {req.book?.title}
                    </span>
                  </td>
                  <td className="px-8 py-6">{getStatusBadge(req.status)}</td>
                  <td className="px-8 py-6 font-mono text-xs text-gray-600">{copyLabel(req)}</td>
                  <td className="px-8 py-6 text-gray-600">
                    {req.dueDate ? new Date(req.dueDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-8 py-6 text-right font-medium text-gray-400">
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
