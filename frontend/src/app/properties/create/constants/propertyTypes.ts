import { Building, Home, Briefcase, Tag, LandPlot } from "lucide-react";

export const PROPERTY_TYPES = [
  { id: "APARTMENT", label: "Apartment", icon: Building },
  { id: "HOUSE", label: "House", icon: Home },
  { id: "OFFICE", label: "Office", icon: Briefcase },
] as const;

export const TRANSACTION_TYPES = [
  {
    id: "FOR_SALE",
    label: "For Sale",
    description: "I want to sell this property",
    icon: Tag
  },
  {
    id: "FOR_RENT",
    label: "For Rent",
    description: "I want to rent out this property",
    icon: LandPlot
  },
] as const;
