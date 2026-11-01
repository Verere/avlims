export type LabTest = {
  id: string;
  name: string;
  category: string;
  price: number;
  requires_specimen_collection?: boolean;
  specimen_type?: "blood" | "serum" | "plasma" | "urine" | "stool" | "sputum" | "swab" | "tissue" | "semen" | "other";
  container_type?: string;
  collection_method?: string;
  collection_instructions?: string;
  collection_priority?: "routine" | "urgent" | "stat" | "other";
  collection_config_status?: "needs_review" | "configured";
};
