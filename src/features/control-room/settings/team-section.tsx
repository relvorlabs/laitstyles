"use client";

import { type FieldPath, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldError } from "@/components/ui/field";
import { getSettingsFieldError } from "@/features/control-room/settings/settings-errors";
import {
  SettingsSelectField,
  SettingsTextareaField,
  SettingsTextField,
} from "@/features/control-room/settings/settings-fields";
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
    register,
    formState: { errors },
  } = useFormContext<SaveStoreSettingsInput>();
  const members = useFieldArray({
    control,
    name: "team.members",
    keyName: "fieldKey",
  });
  const team = useWatch({
    control,
    name: "team",
  }) as SaveStoreSettingsInput["team"];
  const teamError = getSettingsFieldError(errors, "team.members");
  const ownerCount = team?.members?.filter((member) => member.role === "owner").length ?? 0;

  return (
    <SettingsSectionFrame
      aside={<TeamBoundaryPreview members={team?.members ?? []} />}
      section="team"
    >
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-sm font-medium">Responsibility guide</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Use this section to document who is expected to handle store work. Phase 10 enforces
          access from Supabase store memberships; invitation sending and editable membership records
          land with the Phase 11 schema.
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
          className="h-11"
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
          const statusLabel =
            current.status === "active" ? "Current team member" : "Invite not sent";
          return (
            <Card className="gap-5 p-4 sm:p-5" key={member.fieldKey}>
              <input
                {...register(`${base}.status` as FieldPath<SaveStoreSettingsInput>)}
                type="hidden"
              />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {current.name || `Team member ${index + 1}`}
                    </p>
                    <Badge variant={current.status === "active" ? "secondary" : "outline"}>
                      {statusLabel}
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
                  description="This describes expected responsibility; it does not grant access."
                  label="Role"
                  name={`${base}.role` as FieldPath<SaveStoreSettingsInput>}
                  options={roleOptions}
                />
                <div>
                  <p className="text-sm font-medium">Team status</p>
                  <div className="mt-2 flex h-11 items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                    {statusLabel}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Shows whether this person already belongs to the store record.
                  </p>
                </div>
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
    (counts, member) => {
      counts[member.role] += 1;
      return counts;
    },
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
            <span className="ml-3 text-sm font-semibold tabular-nums">{roleCounts[role]}</span>
          </div>
        ))}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        This map helps the operator communicate ownership. Actual staff access is checked from the
        Supabase membership records before Control Room data is shown.
      </p>
    </Card>
  );
}
