import { requireStepAccess } from "@/lib/access";
import Step1Client from "./Step1Client";

const VARIANT_STEP = {
  talking: 11,
  dance: 12,
  fly: 13,
  interview: 14,
};

export default async function Step1Page({ searchParams }) {
  const sp = (await searchParams) || {};
  const v = typeof sp.v === "string" && VARIANT_STEP[sp.v] ? sp.v : "talking";
  const stepCode = VARIANT_STEP[v];
  await requireStepAccess([stepCode, 1]);
  return <Step1Client variant={v} />;
}
