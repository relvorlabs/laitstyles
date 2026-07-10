"use client";

import {
  useFieldArray,
  useFormContext,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldError } from "@/components/ui/field";
import {
  SettingsSelectField,
  SettingsTextField,
  SettingsTextareaField,
} from "@/features/control-room/settings/settings-fields";
import { getSettingsFieldError } from "@/features/control-room/settings/settings-errors";
import { SettingsSectionFrame } from "@/features/control-room/settings/settings-section-frame";
import type {
  SaveStoreSettingsInput,
  TeamMemberBoundary,
  TeamRole,
} from "@/lib/control-room/types";

const roleOptions = [
  ["owner", "Owner"],
  ["manager", "Manager"],
  ["operations", "Operations"],
] as const;

const roleDescriptions: Record<TeamRole, string> = {
  owner: "Store-wide oversight and final business decisions.",
  manager: "Coordinates daily sales, catalogue and fulfilment work.",
  operations: "Handles assigned product, order and delivery tasks.",
};

export function TeamSection() {
  const {
    control,
    formState: { errors },
  } = useFormContext<SaveStoreSettingsInput>();
  const members = useFieldArray({ control, name: "team.members" });
  const team = useWatch({ control, name: "team" }) as SaveStoreSettingsInput["team"];
  const teamError = getSettingsFieldError(errors, "team.members");
  const ownerCount = team?.members?.filter((member) => member.role === "owner").length ?? 0;

  return (
    <SettingsSectionFrame
      aside={<TeamBoundaryPreview members={team?.members ?? []} />}
      section="team"
    >
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-sm font-medium">Prototype responsibility boundary</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Roles below document expected store responsibility only. They do not create accounts, send invitations, authenticate staff or enforce permissions.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">Store team</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Keep one owner and describe what each person is expected to handle.
          </p>
        </div>
        <Button
          onClick={() =>
            members.append({
              id: `team-member-${crypto.randomUUID()}`,
              name: "",
              email: "",
              role: "operations",
              status: "prototype-invite",
              responsibility: "",
            })
          }
          type="button"
          variant="outline"
        >
          Add team member
        </Button>
      </div>

      <div className="space-y-3">
        {members.fields.map((member, index) => {
          const current = team?.members?.[index] ?? member;
          const base = `team.members.${index}` as const;
          const soleOwner = current.role === "owner" && ownerCount <= 1;
          return (
            <Card className="gap-5 p-4 sm:p-5" key={member.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {current.name || `Team member ${index + 1}`}
                    </p>
                    <Badge variant={current.status === "active" ? "secondary" : "outline"}>
                      {current.status === "active" ? "Active record" : "Prototype invite"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                    {roleDescriptions[current.role as TeamRole]}
                  </p>
                </div>
                <Button
                  disabled={soleOwner || members.fields.length === 1}
                  onClick={() => members.remove(index)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Remove
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <SettingsTextField
                  autoComplete="name"
                  label="Name"
                  name={`${base}.name` as FieldPath<SaveStoreSettingsInput>}
                  placeholder="Team member name"
                />
                <SettingsTextField
                  autoComplete="email"
                  label="Email"
                  name={`${base}.email` as FieldPath<SaveStoreSettingsInput>}
                  placeholder="name@example.com"
                  type="email"
                />
                <SettingsSelectField
                  description="A responsibility label only; access is not enforced."
                  label="Role"
                  name={`${base}.role` as FieldPath<SaveStoreSettingsInput>}
                  options={roleOptions}
                />
                <SettingsTextField
                  description="Read-only prototype state for this team record."
                  label="Team status"
                  name={`${base}.status` as FieldPath<SaveStoreSettingsInput>}
                  readOnly
                />
                <div className="sm:col-span-2">
                  <SettingsTextareaField
                    description="Describe the work this person is expected to own or approve."
                    label="Store responsibility"
                    name={`${base}.responsibility` as FieldPath<SaveStoreSettingsInput>}
                    placeholder="Handles product intake and delivery handoff…"
                    rows={3}
                  />
                </div>
              </div>

              {soleOwner ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  This record cannot be removed unless another owner remains in the team.
                </p>
              ) : null}
            </Card>
          );
        })}
      </div>

      <Field data-invalid={Boolean(teamError)}>
        <FieldError>{teamError}</FieldError>
      </Field>
    </SettingsSectionFrame>
  );
}

function TeamBoundaryPreview({ members }: { members: TeamMemberBoundary[] }) {
  const roleCounts = members.reduce<Record<TeamRole, number>>(
    (counts, member) => ({
      ...counts,
      [member.role]: counts[member.role] + 1,
    }),
    { owner: 0, manager: 0, operations: 0 },
  );

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Responsibility map
        </p>
        <Badge variant="outline">{members.length} people</Badge>
      </div>
      <div className="grid gap-2">
        {roleOptions.map(([role, label]) => (
          <div
            className="flex items-center justify-between rounded-xl border border-border px-3 py-3"
            key={role}
          >
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                {roleDescriptions[role]}
              </p>
            </div>
            <span className="ml-3 text-sm font-semibold tabular-nums">
              {roleCounts[role]}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        This map helps the operator communicate ownership. It is not an authentication or permission system.
      </p>
    </Card>
  );
}
