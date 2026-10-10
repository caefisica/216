import { Page, PageTitle, SectionTitle } from "@/components/ui/page";
import { requireStaffPage } from "@/features/auth/protected-action";
import { DonorSettings } from "@/features/books/components/donor-settings";
import { LocationSettings } from "@/features/books/components/location-settings";
import { getFacetsService } from "@/features/books/service";
import { UserRoles } from "@/features/users/components/user-roles";
import { listUsers } from "@/features/users/repository";

export default async function SettingsPage() {
  const { user } = await requireStaffPage();
  const [facets, users] = await Promise.all([
    getFacetsService(),
    user.role === "admin" ? listUsers() : null,
  ]);

  return (
    <Page width="prose">
      <PageTitle className="mb-6">Ajustes</PageTitle>
      <div className="grid gap-10">
        <LocationSettings locations={facets.locations} categories={facets.categories} />
        <DonorSettings donors={facets.donors} />
        {users && (
          <section aria-labelledby="personas" className="grid gap-3">
            <SectionTitle id="personas">Personas ({users.length})</SectionTitle>
            <UserRoles users={users} selfId={user.id} />
          </section>
        )}
      </div>
    </Page>
  );
}
