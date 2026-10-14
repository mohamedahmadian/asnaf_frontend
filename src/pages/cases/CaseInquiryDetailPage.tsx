import { useState } from "react";
import {
  CalendarCheck,
  Check,
  CircleCheck,
  CircleX,
  Download,
  FileText,
  Files,
  MapPin,
  MessageSquareText,
  Paperclip,
  Printer,
  Radio,
  Landmark,
  ScanSearch,
  ClipboardCheck,
  UserCheck,
  UserRound,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Button,
  FormField,
  PageHeader,
  caseShellClassName,
  fieldClassName,
} from "../../components/ui/Form";
import { confirmToast } from "../../components/ui/confirmToast";
import { FileDropField } from "../../components/ui/FileDropField";
import { DateText } from "../../components/ui/DateText";
import {
  FormCard,
  FormFactTile,
  FormSectionTitle,
  formCardBodyClassName,
} from "../../components/ui/FormLayout";
import { FormTabs } from "../../components/ui/FormTabs";
import { CaseInquiryDossier } from "./CaseInquiryDossier";
import { InquiryFiles } from "./CaseInquiriesStep";
import { LoadingState } from "../../components/ui/LoadingState";
import { api, getApiErrorMessage } from "../../lib/api";
import {
  downloadInquiryLetter,
  inquiryLetterFilename,
  printInquiryLetter,
  submitInquiryDecision,
} from "./inquiry-api";
import type { CaseInquiryLetter, CaseInquiryRow } from "./inquiry-types";

const statusBadgeClass: Record<CaseInquiryRow["status"], string> = {
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  APPROVED: "bg-teal-50 text-teal-800 ring-teal-200",
  REJECTED: "bg-red-50 text-red-700 ring-red-200",
};

type InquiryDetail = CaseInquiryRow & {
  applicant: {
    fullName: string;
    gender: "MALE" | "FEMALE" | null;
    nationalId: string | null;
    trackingCode: string | null;
    phone: string | null;
    unitTitle: string | null;
    jobTitle: string | null;
  } | null;
};

function DecisionBadge({
  children,
  tone = "teal",
}: {
  children: string;
  tone?: "teal" | "mint";
}) {
  const toneClass =
    tone === "mint" ? "bg-mint-500 text-white" : "bg-teal-500 text-white";
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-base font-bold leading-6 ${toneClass}`}
    >
      {children}
    </span>
  );
}

function applicantConfirmName(
  fullName: string,
  gender: "MALE" | "FEMALE" | null | undefined,
  honorific: (
    key: "cases.inquiryHonorificMale" | "cases.inquiryHonorificFemale",
  ) => string,
) {
  const name = fullName.trim();
  if (!name) return "";
  if (gender === "MALE")
    return `${honorific("cases.inquiryHonorificMale")} ${name}`;
  if (gender === "FEMALE")
    return `${honorific("cases.inquiryHonorificFemale")} ${name}`;
  return name;
}

export function CaseInquiryDetailPage({
  apiBase = "/cases/inquiries",
  variant = "inquiry",
}: {
  apiBase?: string;
  variant?: "inquiry" | "places";
} = {}) {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation();
  const places = variant === "places";
  const PageIcon = places ? Landmark : ScanSearch;
  const copy = {
    details: places ? "cases.placesDetails" : "cases.inquiryDetails",
    decision: places ? "cases.placesDecision" : "cases.inquiryDecision",
    result: places ? "cases.placesResult" : "cases.inquiryResult",
    approveConfirm: places
      ? "cases.placesApproveConfirm"
      : "cases.inquiryApproveConfirm",
    rejectConfirm: places
      ? "cases.placesRejectConfirm"
      : "cases.inquiryRejectConfirm",
    rejectNote: places ? "cases.placesRejectNote" : "cases.inquiryRejectNote",
    decided: places ? "cases.placesDecided" : "cases.inquiryDecided",
    addAttachment: places
      ? "cases.placesAddAttachment"
      : "cases.inquiryAddAttachment",
  };
  const locale = i18n.language.split("-")[0] ?? "fa";
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [letterBusy, setLetterBusy] = useState<"print" | "download" | null>(
    null,
  );
  const [dossierTab, setDossierTab] = useState("identity");
  const query = useQuery({
    queryKey: ["cases", variant, id],
    enabled: Boolean(id),
    queryFn: async () =>
      (await api.get<InquiryDetail>(`${apiBase}/${id}`)).data,
  });
  const item = query.data;

  const applicantName = applicantConfirmName(
    item?.applicant?.fullName ?? "",
    item?.applicant?.gender,
    t,
  );

  function askApprove() {
    confirmToast({
      title: t(copy.approveConfirm, { name: applicantName }).trim(),
      confirmLabel: t("cases.inquiryApprove"),
      cancelLabel: t("common.cancel"),
      onConfirm: () => void decide("APPROVED"),
    });
  }

  function askReject() {
    confirmToast({
      title: t(copy.rejectConfirm),
      confirmLabel: t("cases.inquiryReject"),
      cancelLabel: t("common.cancel"),
      confirmVariant: "danger",
      onConfirm: () => void decide("REJECTED"),
    });
  }

  async function decide(status: "APPROVED" | "REJECTED") {
    if (!item) return;
    if (status === "REJECTED" && !note.trim()) {
      toast.error(t(copy.rejectNote));
      return;
    }
    setSaving(true);
    try {
      await submitInquiryDecision(
        `${apiBase}/${item.id}/decision`,
        status,
        note,
        file,
      );
      toast.success(t(copy.decided));
      setFile(null);
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["cases", variant, id] });
      await queryClient.invalidateQueries({
        queryKey: ["cases", variant === "places" ? "places" : "inquiries"],
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("cases.saveFailed")));
    } finally {
      setSaving(false);
    }
  }

  async function removeAttachment(fileId: string) {
    await api.delete(`${apiBase}/files/${fileId}`);
    await queryClient.invalidateQueries({ queryKey: ["cases", variant, id] });
    await queryClient.invalidateQueries({
      queryKey: ["cases", variant === "places" ? "places" : "inquiries"],
    });
  }

  async function runLetter(action: "print" | "download") {
    if (!item) return;
    setLetterBusy(action);
    try {
      const { data } = await api.get<CaseInquiryLetter>(
        `${apiBase}/${item.id}/letter`,
      );
      if (action === "print") await printInquiryLetter(data, locale);
      else
        await downloadInquiryLetter(
          inquiryLetterFilename(data.centerName),
          data,
          locale,
        );
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("cases.saveFailed")));
    } finally {
      setLetterBusy(null);
    }
  }

  return (
    <div className={caseShellClassName}>
      <PageHeader
        icon={PageIcon}
        title={t(copy.details)}
        subtitle={item?.applicant?.fullName}
      />
      {query.isLoading ? <LoadingState /> : null}
      {item ? (
        <FormCard
          icon={PageIcon}
          title={item.center.name}
          subtitle={t(`cases.inquiryStatuses.${item.status}`)}
        >
          <div className="border-b border-teal-100 p-5 sm:p-6">
            {item.status === "PENDING" ? (
              <section className="space-y-4 rounded-[22px] border border-teal-200 bg-gradient-to-b from-teal-50/70 to-white p-4 shadow-[0_10px_28px_rgba(46,189,182,0.08)] sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5 text-xl font-semibold leading-8 text-ink-900">
                    {places ? (
                      t(copy.decision)
                    ) : (
                      <>
                        <span>{t("cases.inquiryDecisionLead")}</span>
                        {item.applicant?.unitTitle?.trim() ? (
                          <DecisionBadge>
                            {item.applicant.unitTitle.trim()}
                          </DecisionBadge>
                        ) : null}
                        <span>{t("cases.inquiryDecisionFor")}</span>
                        {item.applicant?.gender === "MALE" ? (
                          <span>{t("cases.inquiryHonorificMale")}</span>
                        ) : null}
                        {item.applicant?.gender === "FEMALE" ? (
                          <span>{t("cases.inquiryHonorificFemale")}</span>
                        ) : null}
                        {item.applicant?.fullName?.trim() ? (
                          <DecisionBadge tone="mint">
                            {item.applicant.fullName.trim()}
                          </DecisionBadge>
                        ) : null}
                      </>
                    )}
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setAttachmentOpen((open) => !open)}
                  >
                    <Paperclip className="size-4" aria-hidden />
                    {t(copy.addAttachment)}
                  </Button>
                </div>
                <FormField
                  icon={FileText}
                  label={t("cases.inquiryNote")}
                  htmlFor="inquiry-decision-note"
                >
                  <textarea
                    id="inquiry-decision-note"
                    className={fieldClassName}
                    rows={4}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </FormField>
                {attachmentOpen ? (
                  <FormField
                    icon={Paperclip}
                    label={t("cases.inquiryAttachment")}
                    htmlFor="inquiry-decision-file"
                  >
                    <FileDropField
                      id="inquiry-decision-file"
                      accept="image/*,audio/*,application/pdf"
                      allowCamera
                      onFile={setFile}
                      onClear={() => setFile(null)}
                    />
                  </FormField>
                ) : null}
                <InquiryFiles
                  files={item.files}
                  filesPath={`${apiBase}/files`}
                  onRemove={removeAttachment}
                />
                <div className="flex flex-wrap justify-center gap-3">
                  <Button
                    type="button"
                    variant="primary"
                    className="min-w-40"
                    disabled={saving}
                    onClick={askApprove}
                  >
                    <Check className="size-4" aria-hidden />
                    {t(copy.approveConfirm, { name: applicantName }).trim()}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-w-40"
                    disabled={saving}
                    onClick={askReject}
                  >
                    <X className="size-4" aria-hidden />
                    {t("cases.inquiryReject")}
                  </Button>
                </div>
              </section>
            ) : (
              <div className="space-y-3">
                <FormSectionTitle icon={ClipboardCheck}>
                  {t(copy.result)}
                </FormSectionTitle>
                <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                  <FormFactTile
                    icon={item.status === "REJECTED" ? CircleX : CircleCheck}
                    label={t("cases.inquiryStatus")}
                    tone={item.status === "APPROVED" ? "teal" : "ink"}
                    value={
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${statusBadgeClass[item.status]}`}
                      >
                        {t(`cases.inquiryStatuses.${item.status}`)}
                      </span>
                    }
                  />
                  {item.channel ? (
                    <FormFactTile
                      icon={Radio}
                      label={t("cases.inquiryChannel")}
                      value={t(`cases.inquiryChannels.${item.channel}`)}
                      tone="mint"
                    />
                  ) : null}
                  {item.referredAt ? (
                    <FormFactTile
                      icon={CalendarCheck}
                      label={t(
                        places
                          ? "cases.placesReferredAt"
                          : "cases.inquiryReferredAt",
                      )}
                      value={<DateText value={item.referredAt} withTime />}
                    />
                  ) : null}
                  <FormFactTile
                    icon={CalendarCheck}
                    label={t("cases.inquiryDecidedAt")}
                    value={<DateText value={item.decidedAt} withTime />}
                  />
                  {item.decidedBy ? (
                    <FormFactTile
                      icon={UserCheck}
                      label={t("cases.inquiryDecidedBy")}
                      value={item.decidedBy.fullName}
                    />
                  ) : null}
                  {item.note ? (
                    <FormFactTile
                      icon={MessageSquareText}
                      label={t("cases.inquiryNote")}
                      className="sm:col-span-2"
                      value={
                        <span className="whitespace-pre-wrap font-normal">
                          {item.note}
                        </span>
                      }
                    />
                  ) : null}
                </div>
                <InquiryFiles
                  files={item.files}
                  filesPath={`${apiBase}/files`}
                  onRemove={removeAttachment}
                />
              </div>
            )}
          </div>
          <FormTabs
            value={dossierTab}
            onChange={setDossierTab}
            tabs={[
              {
                id: "identity",
                label: t("cases.identityTab"),
                icon: UserRound,
              },
              { id: "documents", label: t("cases.documentsTab"), icon: Files },
              {
                id: "location",
                label: t("cases.steps.location"),
                icon: MapPin,
              },
            ]}
          />
          <div className={`${formCardBodyClassName} space-y-6`}>
            <div
              role="tabpanel"
              id={`form-panel-${dossierTab}`}
              aria-labelledby={`form-tab-${dossierTab}`}
            >
              <CaseInquiryDossier
                inquiryId={item.id}
                apiBase={apiBase}
                tab={dossierTab}
                createdAt={item.referredAt ?? ""}
                createdAtLabel={
                  places ? "cases.placesReferredAt" : "cases.inquiryReferredAt"
                }
                applicant={item.applicant}
              />
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                className="min-w-40"
                disabled={letterBusy !== null}
                onClick={() => void runLetter("print")}
              >
                <Printer className="size-4" aria-hidden />
                {t("cases.inquiryPrintLetter")}
              </Button>
              <Button
                type="button"
                className="min-w-40"
                disabled={letterBusy !== null}
                onClick={() => void runLetter("download")}
              >
                <Download className="size-4" aria-hidden />
                {t("cases.inquiryDownloadLetter")}
              </Button>
            </div>
          </div>
        </FormCard>
      ) : null}
    </div>
  );
}
