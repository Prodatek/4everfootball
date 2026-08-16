// Well-known Payment.subjectType values for purpose=ADD_ON — see the
// schema comment on Payment.subjectType for why this is plain text rather
// than a typed FK per subject kind. PaymentsService.fulfilPayment()
// branches on these; MediaPacksService is the only caller that sets them
// today (imports from here rather than the reverse, matching the existing
// MediaPacksModule -> PaymentsModule dependency direction).
export const MEDIA_PACK_ORGANISATION_SUBJECT_TYPE = 'MEDIA_PACK_ORGANISATION';
export const MEDIA_PACK_COMPETITION_SUBJECT_TYPE = 'MEDIA_PACK_COMPETITION';
