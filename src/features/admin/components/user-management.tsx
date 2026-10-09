"use client";

import { useEffect, useState } from "react";
import { getAllUsers, updateUserRole, suspendUser } from "../../users/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast, toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import {
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldX,
  UserCheck,
  Mail,
  Search,
  Filter,
  Loader2,
} from "lucide-react";
import type { Role } from "@/lib/db/schema";
import type { User } from "@/features/users/types";

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Form state for invite dialog
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "user" as Role,
  });

  const fetchUsers = async () => {
    const result = await getAllUsers();
    if (isErr(result)) toastActionError(result.error);
    else setUsers(result.value);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users;

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, roleFilter]);

  const handleInviteUser = async () => {
    toast({
      title: "Próximamente",
      description:
        "El sistema de invitaciones se está migrando. Por ahora, los usuarios pueden registrarse directamente.",
    });
  };

  const handleRoleChange = async (userId: string, newRole: Role) => {
    const result = await updateUserRole({ userId, newRole });
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    toast({ title: "Rol actualizado", description: `Rol actualizado a ${newRole}` });
    fetchUsers();
  };

  const handleSuspendUser = async (userId: string) => {
    const result = await suspendUser({ userId });
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    toast({ title: "Usuario suspendido", description: "Usuario suspendido exitosamente" });
    fetchUsers();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <ShieldCheck className="h-4 w-4" />;
      case "librarian":
        return <Shield className="h-4 w-4" />;
      case "suspended":
        return <ShieldX className="h-4 w-4" />;
      default:
        return <UserCheck className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (
    role: string,
  ): "default" | "secondary" | "destructive" | "soft" | null => {
    switch (role) {
      case "admin":
        return "default";
      case "librarian":
        return "secondary";
      case "suspended":
        return "destructive";
      default:
        return "soft";
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "librarian":
        return "Bibliotecario";
      case "suspended":
        return "Suspendido";
      default:
        return "Usuario";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Cargando directorio de usuarios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Gestión de usuarios</h2>
          <p className="text-sm text-muted-foreground">
            Administra roles y permisos de acceso al sistema
          </p>
        </div>

        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-xs font-bold rounded-xl">
              <UserPlus className="h-4 w-4 mr-2" />
              Invitar usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-106.25">
            <DialogHeader>
              <DialogTitle>Invitar nuevo usuario</DialogTitle>
              <DialogDescription>
                Envía una invitación para que el usuario pueda registrarse con un rol específico.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="invite-name">Nombre completo</Label>
                <Input
                  id="invite-name"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-email">Correo electrónico</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="juan@fisica.edu"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-role">Rol</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value: Role) =>
                    setInviteForm((prev) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="librarian">Bibliotecario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleInviteUser} className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Enviar invitación
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nombre o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-2xl border-input shadow-xs"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-50 h-12 rounded-2xl border-input shadow-xs">
            <SelectValue placeholder="Filtrar por rol" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="admin">Administradores</SelectItem>
            <SelectItem value="librarian">Bibliotecarios</SelectItem>
            <SelectItem value="user">Usuarios</SelectItem>
            <SelectItem value="suspended">Suspendidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Grid */}
      {filteredUsers.length === 0 ? (
        <Card className="border-dashed py-12 rounded-3xl">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Filter className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">No se encontraron usuarios</h3>
            <p className="text-sm text-muted-foreground">Intenta con otros criterios de búsqueda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((u) => (
            <Card
              key={u.id}
              className="group transition-all duration-300 overflow-hidden rounded-3xl border border-border bg-surface shadow-xs hover:border-primary hover:shadow-xl"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border bg-surface-muted/30 p-6 pb-3">
                <div className="flex items-center space-x-3 truncate">
                  <Avatar className="h-10 w-10 overflow-hidden rounded-xl border-2 border-background shadow-xs">
                    <AvatarFallback className="bg-primary font-black text-xs text-primary-foreground">
                      {u.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="truncate">
                    <CardTitle className="text-sm font-bold truncate text-foreground">
                      {u.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground font-medium truncate">{u.email}</p>
                  </div>
                </div>
                <Badge
                  variant={getRoleBadgeVariant(u.role)}
                  className="h-7 gap-1 text-[9px] uppercase tracking-widest border-none px-3 font-black rounded-full"
                >
                  {getRoleIcon(u.role)}
                  {getRoleText(u.role)}
                </Badge>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-5">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-black uppercase tracking-tighter pb-3 border-b border-border">
                    <span>Desde: {new Date(u.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {u.role !== "admin" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-xl border-input text-[10px] font-bold transition-colors hover:bg-foreground hover:text-background"
                        onClick={() => handleRoleChange(u.id, "admin")}
                      >
                        Admin
                      </Button>
                    )}
                    {u.role !== "librarian" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-xl border-input text-[10px] font-bold transition-colors hover:bg-foreground hover:text-background"
                        onClick={() => handleRoleChange(u.id, "librarian")}
                      >
                        Biliotecario
                      </Button>
                    )}
                    {u.role !== "user" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-xl border-input text-[10px] font-bold transition-colors hover:bg-foreground hover:text-background"
                        onClick={() => handleRoleChange(u.id, "user")}
                      >
                        Usuario
                      </Button>
                    )}
                    {u.role !== "suspended" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-[10px] font-bold rounded-xl text-destructive hover:bg-destructive/10"
                          >
                            Suspender
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-bold">
                              ¿Suspender usuario?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground font-medium">
                              Esta acción restringirá el acceso de{" "}
                              <span className="font-bold text-foreground">{u.name}</span> al
                              sistema.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="mt-6">
                            <AlertDialogCancel className="rounded-2xl border-none bg-surface-muted font-bold">
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleSuspendUser(u.id)}
                              className="h-10 rounded-2xl bg-destructive px-6 font-bold hover:bg-destructive/90"
                            >
                              Confirmar suspensión
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
