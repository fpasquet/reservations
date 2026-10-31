'use client';

import { initialsOf, useMember } from './member-context';
import { Select } from './ui/select';

export function MemberPicker() {
  const { members, member, selectMember } = useMember();

  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="hidden size-8 shrink-0 place-items-center rounded-pill bg-primary-soft text-xs font-semibold text-primary sm:grid"
      >
        {member ? initialsOf(member.fullName) : '?'}
      </span>
      <div className="flex flex-col">
        <label htmlFor="member-picker" className="text-[11px] leading-none text-ink-subtle">
          Connecté en tant que
        </label>
        <Select
          id="member-picker"
          value={member ? String(member.id) : ''}
          disabled={members.status !== 'ready'}
          onChange={(event) => selectMember(event.target.value ? Number(event.target.value) : null)}
          className="-ml-1 h-7 w-auto border-transparent bg-transparent pl-1 font-medium shadow-none hover:bg-surface-muted"
        >
          <option value="">
            {members.status === 'loading'
              ? 'Chargement…'
              : members.status === 'error'
                ? 'Indisponible'
                : 'Choisir un membre'}
          </option>
          {members.data?.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.fullName}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
