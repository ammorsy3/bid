// Shared definition of the company verification documents slot list.
// Used by:
//   - /onboarding/company-documents (during onboarding)
//   - /tenders/new (verification gate when an unverified user tries to create a tender)
//   - any future "verify your company" surface
//
// Labels and descriptions are i18n key references (read at render time via t()),
// not literal strings, so a single change here flows everywhere.

export interface DocumentSlot {
  type: string;
  labelKey: string; // resolves under onboardingPanel.*
  descKey: string;
  required: boolean;
}

export const COMPANY_DOCUMENT_SLOTS: DocumentSlot[] = [
  { type: 'cr_certificate', labelKey: 'docCrLabel', descKey: 'docCrDesc', required: true },
  { type: 'vat_certificate', labelKey: 'docVatLabel', descKey: 'docVatDesc', required: false },
  { type: 'gosi_certificate', labelKey: 'docGosiLabel', descKey: 'docGosiDesc', required: false },
  { type: 'national_address_certificate', labelKey: 'docNationalAddressLabel', descKey: 'docNationalAddressDesc', required: false },
];
