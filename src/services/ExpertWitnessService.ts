import { WebPartContext } from "@microsoft/sp-webpart-base";
import {
  SPHttpClient,
  SPHttpClientResponse,
} from "@microsoft/sp-http";

export interface IExpert {
  id: number;
  name: string;
  expertise: string[];
  phone?: string;
  email?: string;
  department?: string;
}

/**
 * reading experts from the "expert directory" shareppoint list.
 * list: /sites/PD-Intranet/Lists/Expert%20Directory
 */
export class ExpertWitnessService {
  public static async getExperts(
    context: WebPartContext,
  ): Promise<IExpert[]> {
    const webUrl = context.pageContext.web.absoluteUrl;

    // note: no $select here to not break on column name differences
    const url =
      `${webUrl}/_api/web/lists/getbytitle('Expert Directory')/items`;

    const response: SPHttpClientResponse =
      await context.spHttpClient.get(
        url,
        SPHttpClient.configurations.v1,
      );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        "Expert Directory REST error",
        response.status,
        text,
      );
      throw new Error(
        `Failed to load experts. HTTP ${response.status}`,
      );
    }

    const data = (await response.json()) as { value?: any[] };
    const items = data.value || [];

    return items.map((item) => {
      // try to be defensive with field names.
      const rawExpertise =
        item.Expertise ??
        item.expertise ??
        item.Expertise0 ??
        "";

      let expertise: string[] = [];
      if (Array.isArray(rawExpertise)) {
        expertise = rawExpertise.map((e: any) =>
          typeof e === "string" ? e : String(e.Value ?? e),
        );
      } else if (typeof rawExpertise === "string") {
        expertise = rawExpertise
          .split(/[;,]/)
          .map((t) => t.trim())
          .filter(Boolean);
      }

      return {
        id: item.Id,
        name: item.Title ?? "",
        expertise,
        phone: item.Phone ?? "",
        email: item.Email ?? "",
        department: item.PDDepartment ?? "",
      } as IExpert;
    });
  }
}

export default ExpertWitnessService;
