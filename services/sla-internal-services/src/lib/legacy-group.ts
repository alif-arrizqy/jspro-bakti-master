export type LegacyLogGroup<T> = { date: string; data: T[] };

export const groupByDate = <T extends { ts: string }>(log: T[]): LegacyLogGroup<T>[] => {
  const groups = log.reduce<Record<string, T[]>>((acc, curr) => {
    const date = curr.ts.slice(0, 10);
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(curr);
    return acc;
  }, {});

  return Object.keys(groups).map((date) => ({
    date,
    data: groups[date],
  }));
};

