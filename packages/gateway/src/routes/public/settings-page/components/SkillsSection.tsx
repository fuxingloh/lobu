import { useSignal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import { useSettings } from "../app";
import { Section } from "./Section";

function ItemRow({
  name,
  description,
  children,
}: {
  name: string;
  description?: string;
  children?: ComponentChildren;
}) {
  return (
    <div class="flex items-center justify-between p-2 bg-white rounded border border-gray-100">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <span class="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 bg-purple-100 text-purple-700">
          skill
        </span>
        <div class="min-w-0">
          <p class="text-xs font-medium text-gray-800 truncate">{name}</p>
          {description && (
            <p class="text-xs text-gray-500 truncate">{description}</p>
          )}
        </div>
      </div>
      {children && (
        <div class="flex items-center gap-2 ml-2 flex-shrink-0">{children}</div>
      )}
    </div>
  );
}

function SubItem({
  badge,
  badgeColor,
  name,
  status,
  statusColor,
}: {
  badge: string;
  badgeColor: string;
  name: string;
  status: string;
  statusColor: string;
}) {
  return (
    <div class="flex items-center gap-2 py-0.5">
      <span
        class={`text-[9px] uppercase font-bold px-1 py-0.5 rounded ${badgeColor}`}
      >
        {badge}
      </span>
      <span class="text-[11px] text-gray-600 truncate">{name}</span>
      <span class={`text-[10px] ${statusColor}`}>{status}</span>
    </div>
  );
}

export function SkillsSection() {
  const ctx = useSettings();

  function toggleSkill(repo: string) {
    ctx.skills.value = ctx.skills.value.map((s) =>
      s.repo === repo ? { ...s, enabled: !s.enabled } : s
    );
  }

  function removeSkill(repo: string) {
    ctx.skills.value = ctx.skills.value.filter((s) => s.repo !== repo);
  }

  function updateSkillField(repo: string, field: string, value: string) {
    ctx.skills.value = ctx.skills.value.map((s) =>
      s.repo === repo ? { ...s, [field]: value || undefined } : s
    );
  }

  // Build flat model options from all providers
  const allModelOptions = Object.entries(ctx.providerModels)
    .flatMap(([, models]) => models)
    .filter((m, i, arr) => arr.findIndex((o) => o.value === m.value) === i);

  const openModelDropdown = useSignal<string | null>(null);

  const count = ctx.skills.value.length;
  const badge =
    count > 0 ? (
      <span class="text-xs text-gray-400">({count})</span>
    ) : undefined;

  return (
    <Section id="skills" title="Skills" icon="&#128218;" badge={badge}>
      <div class="space-y-2">
        {ctx.skillsError.value && (
          <div class="bg-red-100 text-red-800 px-3 py-2 rounded-lg text-xs">
            {ctx.skillsError.value}
          </div>
        )}

        {count === 0 && (
          <p class="text-xs text-gray-500">
            No skills installed. Ask your agent to find and install skills for
            you.
          </p>
        )}

        {ctx.skills.value.map((skill) => {
          const ownedIntegrations = (skill.integrations || []).map((ig) => {
            const status = ctx.integrationStatus.value[ig.id];
            return { ...ig, connected: !!status?.connected };
          });
          const ownedMcps = skill.mcpServers || [];
          const hasSubItems =
            ownedIntegrations.length > 0 || ownedMcps.length > 0;
          const fieldIdBase = skill.repo.replace(/[^a-zA-Z0-9_-]/g, "-");
          const modelInputId = `${fieldIdBase}-model`;
          const thinkingSelectId = `${fieldIdBase}-thinking`;

          return (
            <div key={`skill-${skill.repo}`} class="space-y-1">
              <ItemRow name={skill.name} description={skill.description}>
                <button
                  type="button"
                  onClick={() => toggleSkill(skill.repo)}
                  class={`px-2 py-1 text-xs rounded ${skill.enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}
                >
                  {skill.enabled ? "Enabled" : "Disabled"}
                </button>
                <button
                  type="button"
                  onClick={() => removeSkill(skill.repo)}
                  class="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                >
                  Remove
                </button>
              </ItemRow>

              {skill.enabled && (
                <div class="ml-6 pl-2 border-l-2 border-gray-100 space-y-1.5 py-1">
                  <div class="flex items-center gap-2">
                    <label
                      htmlFor={modelInputId}
                      class="text-[10px] text-gray-500 w-12 shrink-0"
                    >
                      Model
                    </label>
                    <div class="relative flex-1 min-w-0">
                      <input
                        id={modelInputId}
                        type="text"
                        value={skill.modelPreference || ""}
                        onInput={(e) => {
                          const val = (e.target as HTMLInputElement).value;
                          updateSkillField(skill.repo, "modelPreference", val);
                          openModelDropdown.value = skill.repo;
                        }}
                        onFocus={() => {
                          openModelDropdown.value = skill.repo;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape")
                            openModelDropdown.value = null;
                        }}
                        placeholder="default"
                        class="w-full text-[11px] px-1.5 py-0.5 rounded border border-gray-200 bg-white text-gray-700"
                      />
                      {openModelDropdown.value === skill.repo && (
                        <div class="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => {
                              updateSkillField(
                                skill.repo,
                                "modelPreference",
                                ""
                              );
                              openModelDropdown.value = null;
                            }}
                            class="w-full text-left px-2 py-1 text-[11px] hover:bg-gray-100 text-gray-500"
                          >
                            Default
                          </button>
                          {allModelOptions
                            .filter(
                              (m) =>
                                !skill.modelPreference ||
                                m.label
                                  .toLowerCase()
                                  .includes(
                                    (skill.modelPreference || "").toLowerCase()
                                  ) ||
                                m.value
                                  .toLowerCase()
                                  .includes(
                                    (skill.modelPreference || "").toLowerCase()
                                  )
                            )
                            .map((m) => (
                              <button
                                key={m.value}
                                type="button"
                                onClick={() => {
                                  updateSkillField(
                                    skill.repo,
                                    "modelPreference",
                                    m.value
                                  );
                                  openModelDropdown.value = null;
                                }}
                                class="w-full text-left px-2 py-1 text-[11px] hover:bg-gray-100 text-gray-800"
                              >
                                {m.label}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <label
                      htmlFor={thinkingSelectId}
                      class="text-[10px] text-gray-500 w-12 shrink-0"
                    >
                      Thinking
                    </label>
                    <select
                      id={thinkingSelectId}
                      class="text-[11px] px-1.5 py-0.5 rounded border border-gray-200 bg-white text-gray-700 flex-1 min-w-0"
                      value={skill.thinkingLevel || ""}
                      onChange={(e) =>
                        updateSkillField(
                          skill.repo,
                          "thinkingLevel",
                          (e.target as HTMLSelectElement).value
                        )
                      }
                    >
                      <option value="">Default</option>
                      <option value="off">Off</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              )}

              {hasSubItems && skill.enabled && (
                <div class="ml-6 pl-2 border-l-2 border-purple-100 space-y-1">
                  {ownedIntegrations.map((ig) => (
                    <SubItem
                      key={`skill-ig-${ig.id}`}
                      badge={ig.authType || "oauth"}
                      badgeColor="bg-amber-50 text-amber-600"
                      name={ig.label || ig.id}
                      status={ig.connected ? "connected" : "not connected"}
                      statusColor={
                        ig.connected ? "text-green-600" : "text-gray-400"
                      }
                    />
                  ))}
                  {ownedMcps.map((m) => (
                    <SubItem
                      key={`skill-mcp-${m.id}`}
                      badge="mcp"
                      badgeColor="bg-blue-50 text-blue-600"
                      name={m.name || m.id}
                      status="included"
                      statusColor="text-gray-500"
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
