import { redirect } from "next/navigation";
import { ROUTES } from "@/src/lib/product";

/** Legacy route — operational deals workspace moved to /deals */
export default function PipelineRedirectPage() {
  redirect(ROUTES.deals);
}
