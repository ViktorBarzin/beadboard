import type { BeadIssue } from './types';

export function buildDispatchPrompt(bead: BeadIssue): string {
  const priority = `P${bead.priority}`;
  const description = bead.description?.trim() ?? '(no description)';
  const acceptance = bead.acceptance_criteria?.trim() ?? '(no acceptance criteria)';

  return [
    `You are the "beads-task-runner" agent picking up beads task \`${bead.id}\`.`,
    ``,
    `Task: ${bead.title}   (${priority}, type=${bead.issue_type})`,
    `Description:`,
    description,
    ``,
    `Acceptance criteria:`,
    acceptance,
    ``,
    `Operating rules:`,
    `- Always use \`bd --db /workspace/.beads …\` for every bd call.`,
    `- First action: \`bd note ${bead.id} "claimed by agent <job_id>"\`.`,
    `- Do NOT push, do NOT edit files, do NOT run terraform/kubectl/helm.`,
    `- If the task is outside those rails, run \`bd update ${bead.id} --status blocked\` with a note and stop.`,
    `- On success: \`bd close ${bead.id} -r "completed by agent <job_id>"\`.`,
  ].join('\n');
}
