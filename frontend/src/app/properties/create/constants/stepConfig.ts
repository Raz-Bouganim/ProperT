export const FORM_STEPS = [
  {
    step: 1,
    label: "Basic Info",
    fields: ["title", "description", "transactionType", "type", "address", "country", "city"] as const
  },
  {
    step: 2,
    label: "Details",
    fields: ["sqft", "beds", "baths", "yearBuilt"] as const
  },
  {
    step: 3,
    label: "Media",
    fields: [] as const
  },
  {
    step: 4,
    label: "Review",
    fields: ["price"] as const
  }
] as const;
