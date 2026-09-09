import { base } from "./en/base";
import { management } from "./en/management";
import { collab } from "./en/collab";
import { people } from "./en/people";
import { commerce } from "./en/commerce";

export const EN: Record<string, string> = {
  ...base,
  ...management,
  ...collab,
  ...people,
  ...commerce,
};