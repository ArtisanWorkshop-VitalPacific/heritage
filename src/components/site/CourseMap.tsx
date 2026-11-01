import { RUNG_GROUPS, getRung } from "@/lib/ladder";

/** The 40 rungs, grouped as the course teaches them. */
export function CourseMap() {
  return (
    <ol className="s-course" aria-label="The 40 rungs">
      {RUNG_GROUPS.map((g) => {
        const rungs = Array.from({ length: g.to - g.from + 1 }, (_, i) => getRung(g.from + i));
        return (
          <li key={`${g.label}-${g.from}`} className="s-course-group">
            <p className="s-course-label">
              <span>{g.label}</span>
              <small className="num">{g.from === g.to ? `Rung ${g.from}` : `Rungs ${g.from} to ${g.to}`}</small>
            </p>
            <ol className="s-course-rungs">
              {rungs.map((r) => (
                <li key={r.n} className="s-course-rung" title={r.title}>
                  <span className="num">{r.n}</span>
                  <b>{r.short}</b>
                  <span className="visually-hidden">{r.title}</span>
                </li>
              ))}
            </ol>
          </li>
        );
      })}
    </ol>
  );
}
