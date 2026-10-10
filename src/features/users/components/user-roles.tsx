"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Select } from "@/components/ui/field";
import { toast, toastActionError } from "@/hooks/use-toast";
import { isErr } from "@/lib/result";
import type { Role } from "@/lib/db/schema";
import { updateUserRole } from "../actions";
import type { User } from "../types";

const ROLE_LABELS: Record<Role, string> = {
  user: "Lector",
  librarian: "Bibliotecario",
  admin: "Administrador",
  suspended: "Suspendido",
};

const SEARCH_FROM = 8;

export function UserRoles({ users, selfId }: { users: User[]; selfId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const needle = query.trim().toLowerCase();
  const shown = needle
    ? users.filter(
        (user) =>
          user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle),
      )
    : users;

  async function change(user: User, newRole: Role) {
    setSaving(user.id);
    const result = await updateUserRole({ userId: user.id, newRole });
    setSaving(null);
    if (isErr(result)) {
      toastActionError(result.error);
      return;
    }
    toast({ title: `${user.name}: ${ROLE_LABELS[newRole].toLowerCase()}` });
    router.refresh();
  }

  return (
    <div className="grid gap-2">
      {users.length >= SEARCH_FROM && (
        <Input
          type="search"
          aria-label="Buscar persona"
          placeholder="Nombre o correo"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      )}
      {shown.length === 0 ? (
        <p className="py-3 text-muted-foreground">Nadie coincide con esa búsqueda.</p>
      ) : (
        <ul className="divide-y border-y">
          {shown.map((user) => (
            <li
              key={user.id}
              className="grid gap-2 py-3 sm:grid-cols-[1fr_12rem] sm:items-center sm:gap-6"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{user.name}</p>
                <p className="truncate text-muted-foreground">{user.email}</p>
              </div>
              <Select
                aria-label={`Rol de ${user.name}`}
                value={user.role}
                disabled={user.id === selfId || saving === user.id}
                onChange={(event) => change(user, event.target.value as Role)}
              >
                {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </Select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
