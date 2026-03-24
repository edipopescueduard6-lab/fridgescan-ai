export interface AllergyOption {
  id: string;
  label: string;
  icon: string;
}

export interface MedicalCondition {
  id: string;
  label: string;
  description: string;
}

export interface DietPreference {
  id: string;
  label: string;
  description: string;
}

export const ALLERGY_OPTIONS: AllergyOption[] = [
  { id: "gluten", label: "Gluten", icon: "nutrition" },
  { id: "lactoza", label: "Lactoză", icon: "water" },
  { id: "nuci", label: "Nuci", icon: "leaf" },
  { id: "arahide", label: "Arahide", icon: "ellipse" },
  { id: "crustacee", label: "Crustacee", icon: "fish" },
  { id: "peste", label: "Pește", icon: "fish" },
  { id: "oua", label: "Ouă", icon: "egg" },
  { id: "soia", label: "Soia", icon: "leaf" },
  { id: "susan", label: "Susan", icon: "ellipse" },
];

export const MEDICAL_CONDITIONS: MedicalCondition[] = [
  {
    id: "diabet_tip2",
    label: "Diabet tip 2",
    description: "Necesită monitorizarea glucidelor și indicelui glicemic",
  },
  {
    id: "hipertensiune",
    label: "Hipertensiune",
    description: "Necesită limitarea sodiului și grăsimilor saturate",
  },
  {
    id: "boala_celiaca",
    label: "Boală celiacă",
    description: "Necesită eliminarea completă a glutenului",
  },
  {
    id: "guta",
    label: "Gută",
    description: "Necesită limitarea purinelor și fructozei",
  },
  {
    id: "boala_renala",
    label: "Boală renală",
    description: "Necesită limitarea proteinelor, potasiului și fosforului",
  },
  {
    id: "ibs",
    label: "IBS (Sindromul intestinului iritabil)",
    description: "Necesită evitarea alimentelor FODMAP ridicate",
  },
];

export const DIET_PREFERENCES: DietPreference[] = [
  {
    id: "vegetarian",
    label: "Vegetarian",
    description: "Fără carne, dar include lactate și ouă",
  },
  {
    id: "vegan",
    label: "Vegan",
    description: "Fără produse de origine animală",
  },
  {
    id: "keto",
    label: "Keto",
    description: "Carbohidrați foarte puțini, grăsimi ridicate",
  },
  {
    id: "paleo",
    label: "Paleo",
    description: "Alimente neprocesate, fără cereale sau lactate",
  },
  {
    id: "mediteraneean",
    label: "Mediteraneean",
    description: "Bazat pe legume, fructe, pește și ulei de măsline",
  },
];

export const ACTIVITY_LEVELS = [
  { id: "sedentar", label: "Sedentar", multiplier: 1.2, description: "Activitate minimă" },
  { id: "usor_activ", label: "Ușor activ", multiplier: 1.375, description: "Exerciții 1-3 zile/săptămână" },
  { id: "moderat_activ", label: "Moderat activ", multiplier: 1.55, description: "Exerciții 3-5 zile/săptămână" },
  { id: "activ", label: "Activ", multiplier: 1.725, description: "Exerciții 6-7 zile/săptămână" },
  { id: "foarte_activ", label: "Foarte activ", multiplier: 1.9, description: "Exerciții intense zilnice" },
] as const;

export const FOOD_CATEGORIES = [
  { id: "toate", label: "Toate" },
  { id: "proteine", label: "Proteine" },
  { id: "lactate", label: "Lactate" },
  { id: "legume", label: "Legume" },
  { id: "fructe", label: "Fructe" },
  { id: "altele", label: "Altele" },
] as const;

export type FoodCategory = (typeof FOOD_CATEGORIES)[number]["id"];

export const SEVERITY_LEVELS = {
  high: { label: "Ridicat", color: "#D32F2F", icon: "alert-circle" },
  medium: { label: "Mediu", color: "#F57C00", icon: "warning" },
  low: { label: "Scăzut", color: "#5C6BC0", icon: "information-circle" },
} as const;

export type SeverityLevel = keyof typeof SEVERITY_LEVELS;

export const MEDICAL_DISCLAIMER =
  "Atenție: Informațiile nutriționale și recomandările medicale furnizate de FridgeScan AI au caracter informativ și nu înlocuiesc sfatul medical profesionist. Consultați întotdeauna medicul dumneavoastră înainte de a face schimbări semnificative în dietă, în special dacă aveți condiții medicale preexistente sau luați medicamente.";

export const COMMON_MEDICATIONS = [
  "Metformin",
  "Insulină",
  "Enalapril",
  "Amlodipină",
  "Atorvastatină",
  "Omeprazol",
  "Aspirin",
  "Warfarină",
  "Levotiroxină",
  "Metoprolol",
];
