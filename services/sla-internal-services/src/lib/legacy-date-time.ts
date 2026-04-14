const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

export const millisToSec = (ts1: string, ts2: string): number => {
  const date1 = new Date(ts1);
  const date2 = new Date(ts2);
  return (date2.getTime() - date1.getTime()) / 1000;
};

export const secToString = (sec: number | string): string => {
  let msec = Number(sec);
  let day = Math.floor(msec / 60 / 60 / 24);
  msec -= day * 60 * 60 * 24;
  let hh = Math.floor(msec / 60 / 60);
  msec -= hh * 60 * 60;
  let mm = Math.floor(msec / 60);
  msec -= mm * 60;
  let ss = Math.floor(msec);

  return day > 0
    ? `${pad(day)}d ${pad(hh)}h ${pad(mm)}m ${pad(ss)}s`
    : `${pad(hh)}h ${pad(mm)}m ${pad(ss)}s`;
};

export const monthFormater = (value: string): string => {
  const month = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const date = new Date(value);
  return `${month[date.getMonth()]} ${date.getFullYear()}`;
};
