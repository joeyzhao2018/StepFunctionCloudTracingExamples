import { join, dirname } from "path";

export const getCodeAssetsPath = (code_file: string) =>
  join(dirname(__filename), "code-assets", code_file);

export const DD_API_KEY = process.env.DD_API_KEY || "<MISSING DD_API_KEY Env>";

export const DD_APPLICATION_KEY =
  process.env.DD_APPLICATION_KEY || "<MISSING DD_APPLICATION_KEY Env>";
