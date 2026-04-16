"use client";

import { useRef } from "react";

type CourseFiltersFormProps = {
  q?: string;
  state?: string;
  city?: string;
  difficulty?: string;
  courseType?: string;
  states: string[];
  difficulties: string[];
  types: string[];
};

export function CourseFiltersForm({
  q,
  state,
  city,
  difficulty,
  courseType,
  states,
  difficulties,
  types,
}: CourseFiltersFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const submitForm = () => {
    formRef.current?.requestSubmit();
  };

  return (
    <form
      ref={formRef}
      method="GET"
      className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-6"
    >
      <input
        name="q"
        defaultValue={q}
        placeholder="Search name"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 sm:col-span-2"
      />
      <select
        name="state"
        defaultValue={state ?? ""}
        onChange={submitForm}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      >
        <option value="">All states</option>
        {states.map((stateOption) => (
          <option key={stateOption} value={stateOption}>
            {stateOption}
          </option>
        ))}
      </select>
      <input
        name="city"
        defaultValue={city}
        placeholder="City"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      />
      <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">Apply</button>
      <div />

      <select
        name="courseDifficulty"
        defaultValue={difficulty ?? ""}
        onChange={submitForm}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      >
        <option value="">All difficulties</option>
        {difficulties.map((difficultyOption) => (
          <option key={difficultyOption} value={difficultyOption}>
            {difficultyOption}
          </option>
        ))}
      </select>
      <select
        name="courseType"
        defaultValue={courseType ?? ""}
        onChange={submitForm}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      >
        <option value="">All types</option>
        {types.map((typeOption) => (
          <option key={typeOption} value={typeOption}>
            {typeOption}
          </option>
        ))}
      </select>
    </form>
  );
}
