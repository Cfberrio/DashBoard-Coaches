export interface CoachTemplateData {
  COACH_NAME: string;
  COACH_EMAIL: string;
  COACH_PHONE: string;
  TEAM_NAME: string;
  TEAM_NAMES: string;
  SCHOOL_NAME: string;
  SCHOOL_LOCATION: string;
  SPORT: string;
}

/**
 * Reemplaza variables de template en el contenido del email
 */
export function replaceTemplateVariables(
  template: string,
  data: CoachTemplateData
): string {
  let result = template;

  // Reemplazar cada variable
  result = result.replace(/{COACH_NAME}/g, data.COACH_NAME || "");
  result = result.replace(/{COACH_EMAIL}/g, data.COACH_EMAIL || "");
  result = result.replace(/{COACH_PHONE}/g, data.COACH_PHONE || "");
  result = result.replace(/{TEAM_NAME}/g, data.TEAM_NAME || "");
  result = result.replace(/{TEAM_NAMES}/g, data.TEAM_NAMES || "");
  result = result.replace(/{SCHOOL_NAME}/g, data.SCHOOL_NAME || "");
  result = result.replace(/{SCHOOL_LOCATION}/g, data.SCHOOL_LOCATION || "");
  result = result.replace(/{SPORT}/g, data.SPORT || "");

  return result;
}


