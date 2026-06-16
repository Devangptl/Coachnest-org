import { Fragment } from "react";
import { requireOrgPermission } from "@/lib/org-auth";
import {
  ORG_ROLES,
  ORG_ROLE_LABEL,
  ORG_ROLE_DESCRIPTION,
  ALL_ORG_PERMISSIONS,
  ORG_PERMISSION_META,
  ORG_PERMISSION_GROUPS,
  can,
} from "@/lib/org-permissions";
import { Check, Minus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OrgRolesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireOrgPermission(slug, "members:view", { allowExpired: true });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Roles &amp; permissions</h1>
        <p className="text-muted-foreground mt-1">
          What each organization role can do. Assign roles on the Members page.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {ORG_ROLES.map((r) => (
          <div key={r} className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm font-semibold text-foreground">{ORG_ROLE_LABEL[r]}</p>
            <p className="text-xs text-muted-foreground mt-1">{ORG_ROLE_DESCRIPTION[r]}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left font-medium text-muted-foreground px-4 py-3 sticky left-0 bg-card">
                Permission
              </th>
              {ORG_ROLES.map((r) => (
                <th
                  key={r}
                  className="px-3 py-3 text-[11px] font-medium text-muted-foreground whitespace-nowrap text-center"
                >
                  {ORG_ROLE_LABEL[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ORG_PERMISSION_GROUPS.map((group) => {
              const perms = ALL_ORG_PERMISSIONS.filter(
                (p) => ORG_PERMISSION_META[p].group === group,
              );
              if (perms.length === 0) return null;
              return (
                <Fragment key={group}>
                  <tr>
                    <td
                      colSpan={ORG_ROLES.length + 1}
                      className="px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 sticky left-0 bg-card"
                    >
                      {group}
                    </td>
                  </tr>
                  {perms.map((p) => (
                    <tr key={p} className="border-t border-border/60">
                      <td className="px-4 py-2.5 text-foreground sticky left-0 bg-card">
                        {ORG_PERMISSION_META[p].label}
                      </td>
                      {ORG_ROLES.map((r) => (
                        <td key={r} className="px-3 py-2.5 text-center">
                          {can(r, p) ? (
                            <Check className="w-4 h-4 text-green-500 inline-block" />
                          ) : (
                            <Minus className="w-3.5 h-3.5 text-muted-foreground/30 inline-block" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
