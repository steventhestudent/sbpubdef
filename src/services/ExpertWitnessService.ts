import {
  SPHttpClient,
  SPHttpClientResponse
} from "@microsoft/sp-http";

export interface IExpert {
  id: number;
  name: string;
  expertise?: string;
  phone?: string;
  email?: string;
}

/**
 * Thin wrapper around the "Expert Directory" list on PD-Intranet
 */
export class ExpertWitnessService {
  public static async getExperts(
    siteUrl: string,
    spHttpClient: SPHttpClient
  ): Promise<IExpert[]> {
    const listTitle = "Expert Directory"; // must match your list title EXACTLY

    const url =
      `${siteUrl}` +
      `/_api/web/lists/getByTitle('${listTitle}')/items` +
      `?$select=Id,Title,Expertise,Phone,Email` +
      `&$top=500`;

    const response: SPHttpClientResponse = await spHttpClient.get(
      url,
      SPHttpClient.configurations.v1
    );

    const json = await response.json();

    console.log(
      "ExpertWitnessService: raw items",
      json.value?.length,
      json.value
    );

        const items: any[] = json.value || [];

    return items.map((i) => {
      const rawExpertise = i.Expertise;

      let expertiseText: string | undefined;
      if (Array.isArray(rawExpertise)) {
        // multi-choice returned as ['RJA', 'Psychology']
        expertiseText = rawExpertise.join(", ");
      } else if (typeof rawExpertise === "string") {
        // classic SharePoint multi-choice: "RJA;#Psychology;#"
        expertiseText = rawExpertise.replace(/;#/g, ", ").replace(/;+$/g, "");
      }

      const mapped: IExpert = {
        id: i.Id,
        // “Name” column is Title in the REST API
        name: i.Title,
        expertise: expertiseText,
        phone: i.Phone,
        email: i.Email
      };

      console.log("ExpertWitnessService: mapped expert", mapped);
      return mapped;
    });
  }
}

