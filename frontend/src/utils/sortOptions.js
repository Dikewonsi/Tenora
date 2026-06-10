const text = (value) => String(value || '').trim().toLowerCase();

export const sortByOptionLabel = (records, getLabel) => (
  [...(records || [])].sort((firstRecord, secondRecord) => (
    text(getLabel(firstRecord)).localeCompare(text(getLabel(secondRecord)))
  ))
);

export const propertyLabel = (property) => (
  property?.property_name || property?.address || ''
);

export const tenantLabel = (tenant) => (
  tenant?.full_name || tenant?.email || tenant?.phone_number || ''
);

export const leaseLabel = (lease) => (
  `${lease?.tenant_name || ''} ${lease?.property_name || ''} ${lease?.unit_number || ''}`
);

export const demandLabel = (demand) => (
  `${demand?.tenant_name || ''} ${demand?.property_name || ''} ${demand?.demand_reference || ''}`
);
