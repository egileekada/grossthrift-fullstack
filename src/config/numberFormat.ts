import formatter from "format-number";

export const formatNumber = (number: number, prefix = "$") => {
  return formatter({ prefix })(number);
};