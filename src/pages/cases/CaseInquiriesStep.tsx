import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  CalendarCheck,
  Check,
  Clock,
  Download,
  FileText,
  Mic,
  Paperclip,
  Phone,
  Printer,
  RotateCcw,
  ScanSearch,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button, FormField, fieldClassName } from "../../components/ui/Form";
import { confirmToast } from "../../components/ui/confirmToast";
import { FileDropField } from "../../components/ui/FileDropField";
import { DateText } from "../../components/ui/DateText";
import {
  FormCard,
  FormEmptyHint,
  FormFactTile,
  formCardBodyClassName,
} from "../../components/ui/FormLayout";
import { FormTabs } from "../../components/ui/FormTabs";
import { LoadingState } from "../../components/ui/LoadingState";
import { api, getApiErrorMessage } from "../../lib/api";
import { formatNumber } from "../../lib/datetime";
import { inquiryElapsedLabel } from "./inquiry-elapsed";
import { PLACES_FORMATION_STEP } from "./formation-types";
import {
  downloadInquiryLetter,
  inquiryLetterFilename,
  openInquiryFile,
  printInquiryLetters,
  submitInquiryDecision,
} from "./inquiry-api";
import { InquiryLetterModal } from "./InquiryLetterModal";

export { InquiryLetterModal };
import type { CaseInquiryLetter, CaseInquiryRow } from "./inquiry-types";

const frame: Record<CaseInquiryRow["status"], string> = {
  PENDING: "border-[#f6e4e7] bg-[#fff7f8]",
  APPROVED: "border-emerald-200 bg-emerald-50/50",
  REJECTED: "border-red-200 bg-red-50/50",
};

const statusBadgeClass: Record<CaseInquiryRow["status"], string> = {
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  APPROVED: "bg-teal-50 text-teal-800 ring-teal-200",
  REJECTED: "bg-red-50 text-red-700 ring-red-200",
};

const decisionButtonClassName = "min-w-40 px-8 disabled:opacity-60";

/** تب تعیین‌تکلیف‌نشده فعال می‌ماند؛ بعد از ثبت نتیجه، تب باز بعدی انتخاب می‌شود. */
export function usePendingTab<T extends { id: string; status: string }>(
  items: T[],
  loading: boolean,
) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const previousStatus = useRef(new Map<string, string>());
  const pendingId = items.find((item) => item.status === "PENDING")?.id ?? null;

  useEffect(() => {
    if (loading) return;
    if (selectedId) {
      const current = items.find((item) => item.id === selectedId);
      const previous = previousStatus.current.get(selectedId);
      const openNext =
        !current ||
        (previous === "PENDING" &&
          current.status !== "PENDING" &&
          pendingId != null);
      if (openNext) setSelectedId(null);
    }
    previousStatus.current = new Map(
      items.map((item) => [item.id, item.status]),
    );
  }, [items, loading, pendingId, selectedId]);

  const activeId = items.some((item) => item.id === selectedId)
    ? selectedId!
    : (pendingId ?? items[0]?.id ?? "");
  return { activeId, selectTab: setSelectedId };
}

export function CaseInquiriesStep({
  caseId,
  items,
  loading,
  autoAdvance,
  showAdvance = true,
  documentsPending = false,
  locked = false,
  headerAction,
  onAdvanced,
  onRewound,
  onAutoAdvance,
  actorId,
  adminDecide = false,
  closed = false,
}: {
  caseId: string;
  items: CaseInquiryRow[];
  loading: boolean;
  autoAdvance: boolean;
  /** در تمدید و تغییر مکان، ادامه را صفحهٔ فرایند می‌زند */
  showAdvance?: boolean;
  documentsPending?: boolean;
  locked?: boolean;
  headerAction?: ReactNode;
  onAdvanced: (formationStep: number) => void;
  onRewound: () => void;
  /** اگر همه استعلام‌ها تعیین‌تکلیف شده باشند، به‌جای مرحلهٔ صدور به گام بعدی همین فرایند برو */
  onAutoAdvance?: () => void;
  /** مسئول مرکز، یا مدیر، نتیجه را ثبت می‌کند */
  actorId?: string;
  adminDecide?: boolean;
  closed?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const locale = i18n.language.split("-")[0] ?? "fa";
  const pending = items.some((item) => item.status === "PENDING");
  const { activeId, selectTab } = usePendingTab(items, loading);
  const [printId, setPrintId] = useState<string | null>(null);
  const [printingAll, setPrintingAll] = useState(false);
  const autoAdvanceStarted = useRef(false);

  const advance = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ formationStep: number }>(
        "/cases/formation/step",
        {
          caseId,
          step: PLACES_FORMATION_STEP,
        },
      );
      return data.formationStep;
    },
    onSuccess: (formationStep) => {
      toast.success(t("cases.inquiriesAdvanced"));
      onAdvanced(formationStep);
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, t("cases.saveFailed"))),
  });

  useEffect(() => {
    if (!autoAdvance || loading) return;
    if (documentsPending || pending || items.length === 0) {
      autoAdvanceStarted.current = false;
      return;
    }
    if (autoAdvanceStarted.current || advance.isPending) return;
    autoAdvanceStarted.current = true;
    if (onAutoAdvance) onAutoAdvance();
    else advance.mutate();
  }, [
    advance,
    autoAdvance,
    documentsPending,
    items.length,
    loading,
    onAutoAdvance,
    pending,
  ]);

  async function refresh() {
    await queryClient.invalidateQueries({
      queryKey: ["cases", "formation-inquiries", caseId],
    });
  }

  async function printAll() {
    if (printingAll || items.length === 0) return;
    setPrintingAll(true);
    try {
      const letters: CaseInquiryLetter[] = [];
      for (const item of items) {
        letters.push(
          (await api.get<CaseInquiryLetter>(`/cases/inquiries/${item.id}/letter`)).data,
        );
      }
      await printInquiryLetters(letters, locale);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("cases.saveFailed")));
    } finally {
      setPrintingAll(false);
    }
  }

  const doneCount = items.filter((item) => item.status !== "PENDING").length;
  const tabs = items.map((item) => ({
    id: item.id,
    label: item.center.name,
    approved: item.status === "APPROVED",
    pending: item.status === "PENDING",
  }));

  return (
    <FormCard
      icon={ScanSearch}
      title={t("cases.steps.inquiries")}
      titleExtra={
        items.length > 0 ? (
          <InquiryProgressChart
            done={doneCount}
            total={items.length}
            locale={locale}
          />
        ) : null
      }
      action={
        headerAction ??
        (showAdvance || documentsPending ? (
          <div className="flex flex-col items-end gap-2">
            {showAdvance ? (
              <Button
                type="button"
                className="whitespace-nowrap"
                disabled={loading || pending || advance.isPending}
                onClick={() => advance.mutate()}
              >
                <Check className="size-4" aria-hidden />
                {t("cases.inquiriesContinue")}
              </Button>
            ) : null}
            {documentsPending ? (
              <p className="max-w-xs rounded-xl border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-start text-[11px] leading-5 text-orange-800">
                {t("cases.inquiriesDocumentsHint")}
              </p>
            ) : null}
          </div>
        ) : undefined)
      }
    >
      {loading ? (
        <div className={formCardBodyClassName}>
          <LoadingState variant="inline" />
        </div>
      ) : null}
      {!loading && items.length === 0 ? (
        <div className={formCardBodyClassName}>
          <FormEmptyHint>{t("cases.inquiriesEmpty")}</FormEmptyHint>
        </div>
      ) : null}
      {items.length > 0 ? (
        <>
          <div className="flex flex-wrap items-end gap-x-3 border-b border-teal-100">
            <div className="min-w-0 flex-1 overflow-x-auto [&_[role=tablist]]:border-b-0">
              <FormTabs tabs={tabs} value={activeId ?? ""} onChange={selectTab} />
            </div>
            <div className="mb-2 pe-4 sm:pe-6">
              <Button
                type="button"
                variant="ghost"
                className="whitespace-nowrap"
                disabled={loading || printingAll}
                onClick={() => void printAll()}
              >
                <Printer className="size-4" aria-hidden />
                {t("cases.inquiriesPrintAll")}
              </Button>
            </div>
          </div>
          <div className={formCardBodyClassName}>
            {items.map((item) => (
              <div
                key={item.id}
                id={`form-panel-${item.id}`}
                role="tabpanel"
                aria-labelledby={`form-tab-${item.id}`}
                hidden={item.id !== activeId}
              >
                <InquiryCard
                  item={item}
                  locale={locale}
                  locked={
                    actorId == null && !adminDecide
                      ? locked
                      : closed ||
                        !(adminDecide || item.center.officerId === actorId)
                  }
                  allowReopen={adminDecide && !closed}
                  onChanged={() => void refresh()}
                  onReopened={onRewound}
                  onPrint={() => setPrintId(item.id)}
                />
              </div>
            ))}
          </div>
        </>
      ) : null}
      {printId ? (
        <InquiryLetterModal
          inquiryId={printId}
          locale={locale}
          onClose={() => setPrintId(null)}
        />
      ) : null}
    </FormCard>
  );
}

export function InquiryProgressChart({
  done,
  total,
  locale,
}: {
  done: number;
  total: number;
  locale: string;
}) {
  const { t } = useTranslation();
  const label = t("cases.inquiryProgress", {
    done: formatNumber(done, locale),
    total: formatNumber(total, locale),
  });
  const size = 36;
  const radius = 16;
  const center = size / 2;
  const doneSweep = total === 0 ? 0 : (done / total) * Math.PI * 2;

  return (
    <span
      className="inline-flex items-center gap-2"
      role="img"
      aria-label={label}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
      >
        {done <= 0 || total === 0 ? (
          <circle cx={center} cy={center} r={radius} fill="#d9f3ef" />
        ) : done >= total ? (
          <circle cx={center} cy={center} r={radius} fill="#10b981" />
        ) : (
          <>
            <path
              d={pieSlice(
                center,
                center,
                radius,
                -Math.PI / 2,
                -Math.PI / 2 + doneSweep,
              )}
              fill="#10b981"
            />
            <path
              d={pieSlice(
                center,
                center,
                radius,
                -Math.PI / 2 + doneSweep,
                -Math.PI / 2 + Math.PI * 2,
              )}
              fill="#d9f3ef"
            />
          </>
        )}
      </svg>
      <span className="text-xs font-medium text-ink-600">{label}</span>
    </span>
  );
}

function pieSlice(
  cx: number,
  cy: number,
  radius: number,
  start: number,
  end: number,
) {
  const point = (angle: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  });
  const from = point(start);
  const to = point(end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${from.x} ${from.y} A ${radius} ${radius} 0 ${large} 1 ${to.x} ${to.y} Z`;
}

export function InquiryCard({
  item,
  locale,
  onChanged,
  onReopened,
  onPrint,
  decisionUrl = `/cases/formation/inquiries/${item.id}/decision`,
  reopenUrl = `/cases/formation/inquiries/${item.id}/reopen`,
  letterUrl = `/cases/inquiries/${item.id}/letter`,
  filesPath = "/cases/inquiries/files",
  attachmentLabelKey = "cases.inquiryAddAttachment",
  locked = false,
  allowReopen = true,
}: {
  item: CaseInquiryRow;
  locale: string;
  onChanged: () => void;
  onReopened?: () => void;
  onPrint: () => void;
  decisionUrl?: string;
  reopenUrl?: string;
  letterUrl?: string;
  filesPath?: string;
  attachmentLabelKey?: string;
  locked?: boolean;
  allowReopen?: boolean;
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState(item.note ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function decide(status: "APPROVED" | "REJECTED") {
    if (status === "REJECTED" && !note.trim()) {
      toast.error(t("cases.inquiryRejectNote"));
      return;
    }
    setSaving(true);
    try {
      await submitInquiryDecision(decisionUrl, status, note, file);
      toast.success(t("cases.inquiryDecided"));
      setFile(null);
      setAttachmentOpen(false);
      onChanged();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("cases.saveFailed")));
    } finally {
      setSaving(false);
    }
  }

  const placesDecision = Boolean(decisionUrl?.includes("/places/"));

  function askApprove() {
    confirmToast({
      title: t(
        placesDecision
          ? "cases.placesApproveConfirm"
          : "cases.inquiryApproveConfirm",
        {
          name: item.center.name,
        },
      ),
      confirmLabel: t("cases.inquiryApprove"),
      cancelLabel: t("common.cancel"),
      onConfirm: () => void decide("APPROVED"),
    });
  }

  function askReject() {
    if (!note.trim()) {
      toast.error(
        t(
          placesDecision ? "cases.placesRejectNote" : "cases.inquiryRejectNote",
        ),
      );
      return;
    }
    confirmToast({
      title: t(
        placesDecision
          ? "cases.placesRejectConfirm"
          : "cases.inquiryRejectConfirm",
      ),
      confirmLabel: t("cases.inquiryReject"),
      cancelLabel: t("common.cancel"),
      confirmVariant: "danger",
      onConfirm: () => void decide("REJECTED"),
    });
  }

  function askReopen() {
    confirmToast({
      title: t("cases.inquiryReopenConfirm"),
      confirmLabel: t("cases.inquiryReopen"),
      cancelLabel: t("common.cancel"),
      onConfirm: () => void reopen(),
    });
  }

  async function reopen() {
    setSaving(true);
    try {
      await api.post(reopenUrl);
      toast.success(t("cases.inquiryReopened"));
      setNote("");
      setFile(null);
      setAttachmentOpen(false);
      onChanged();
      onReopened?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("cases.saveFailed")));
    } finally {
      setSaving(false);
    }
  }

  async function download() {
    setDownloading(true);
    try {
      const { data } = await api.get<CaseInquiryLetter>(letterUrl);
      await downloadInquiryLetter(
        inquiryLetterFilename(data.centerName),
        data,
        locale,
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("cases.saveFailed")));
    } finally {
      setDownloading(false);
    }
  }

  const statusIcon =
    item.status === "APPROVED" ? Check : item.status === "REJECTED" ? X : Clock;
  const onRemove = locked
    ? undefined
    : async (fileId: string) => {
        await api.delete(`${filesPath}/${fileId}`);
        onChanged();
      };

  return (
    <article
      className={`space-y-3 rounded-2xl border p-4 ${frame[item.status]}`}
    >
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          className="min-w-32 disabled:opacity-60"
          disabled={downloading}
          onClick={() => void download()}
        >
          <Download className="size-4" aria-hidden />
          {t("cases.inquiryDownload")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-w-32"
          onClick={onPrint}
        >
          <Printer className="size-4" aria-hidden />
          {t("cases.inquiryPrint")}
        </Button>
      </div>
      <div
        className={`grid gap-2 ${item.center.phone ? "sm:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3"}`}
      >
        <FormFactTile
          icon={statusIcon}
          label={t("cases.inquiryStatus")}
          tone="teal"
          value={
            <span className="flex flex-col items-start gap-1">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${statusBadgeClass[item.status]}`}
              >
                {t(`cases.inquiryStatuses.${item.status}`)}
              </span>
              {item.channel ? (
                <span className="text-[11px] font-medium text-ink-500">
                  {t(`cases.inquiryChannels.${item.channel}`)}
                </span>
              ) : null}
            </span>
          }
        />
        <FormFactTile
          icon={CalendarCheck}
          label={t("cases.placesReferredAt")}
          tone="mint"
          empty={!item.referredAt}
          value={
            item.referredAt ? (
              <DateText value={item.referredAt} withTime />
            ) : (
              "—"
            )
          }
        />
        <FormFactTile
          icon={UserRound}
          label={t("cases.inquiryHandlingOfficer")}
          tone="teal"
          empty={!item.center.officerName}
          value={item.center.officerName || t("cases.inquiryNoOfficer")}
        />
        {item.center.phone ? (
          <FormFactTile
            icon={Phone}
            label={t("users.phone")}
            copyValue={item.center.phone}
            tone="mint"
          />
        ) : null}
      </div>
      {item.status === "PENDING" && locked ? (
        <InquiryFiles
          files={item.files}
          filesPath={filesPath}
          onRemove={onRemove}
        />
      ) : item.status === "PENDING" ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label
                htmlFor={`inquiry-note-${item.id}`}
                className="flex items-center gap-2 text-sm font-medium text-ink-900"
              >
                <FileText className="size-4 text-teal-600" aria-hidden />
                {t("cases.inquiryNote")}
              </label>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAttachmentOpen((open) => !open)}
              >
                <Paperclip className="size-4" aria-hidden />
                {t(attachmentLabelKey)}
              </Button>
            </div>
            <textarea
              id={`inquiry-note-${item.id}`}
              className={fieldClassName}
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          {attachmentOpen ? (
            <FormField
              icon={Paperclip}
              label={t("cases.inquiryAttachment")}
              htmlFor={`inquiry-file-${item.id}`}
            >
              <FileDropField
                id={`inquiry-file-${item.id}`}
                accept="image/*,audio/*,application/pdf"
                allowCamera
                onFile={setFile}
                onClear={() => setFile(null)}
              />
            </FormField>
          ) : null}
          <InquiryFiles
            files={item.files}
            filesPath={filesPath}
            onRemove={onRemove}
          />
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              className={decisionButtonClassName}
              disabled={saving}
              onClick={askApprove}
            >
              <Check className="size-4" aria-hidden />
              {t("cases.inquiryApprove")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={decisionButtonClassName}
              disabled={saving}
              onClick={askReject}
            >
              <X className="size-4" aria-hidden />
              {t("cases.inquiryReject")}
            </Button>
          </div>
        </div>
      ) : item.status === "APPROVED" ? (
        <ApprovedInquirySummary
          item={item}
          locale={locale}
          saving={saving}
          filesPath={filesPath}
          onRemove={onRemove}
          onReopen={locked || !allowReopen ? undefined : askReopen}
        />
      ) : (
        <div className="space-y-2">
          {item.note ? (
            <p className="text-sm whitespace-pre-wrap text-ink-800">
              {item.note}
            </p>
          ) : null}
          {item.decidedBy ? (
            <p className="text-xs text-ink-500">{item.decidedBy.fullName}</p>
          ) : null}
          <InquiryFiles
            files={item.files}
            filesPath={filesPath}
            onRemove={onRemove}
          />
          {locked || !allowReopen ? null : (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={askReopen}
              >
                <RotateCcw className="size-4" aria-hidden />
                {t("cases.inquiryReopen")}
              </Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function ApprovedInquirySummary({
  item,
  locale,
  saving,
  filesPath,
  onRemove,
  onReopen,
}: {
  item: CaseInquiryRow;
  locale: string;
  saving: boolean;
  filesPath: string;
  onRemove?: (fileId: string) => Promise<void>;
  onReopen?: () => void;
}) {
  const { t } = useTranslation();
  const elapsed =
    item.decidedAt != null
      ? inquiryElapsedLabel(
          item.referredAt || item.createdAt,
          item.decidedAt,
          t,
          locale,
        )
      : null;

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <FormFactTile
          icon={CalendarCheck}
          label={t("cases.inquiryDecidedAt")}
          tone="mint"
          value={
            <span className="flex flex-wrap items-center gap-2">
              <DateText value={item.decidedAt} withTime />
              {elapsed ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-200">
                  <Clock className="size-3" aria-hidden />
                  {elapsed}
                </span>
              ) : null}
            </span>
          }
        />
        {item.decidedBy ? (
          <FormFactTile
            icon={UserRound}
            label={t("cases.inquiryDecidedBy")}
            value={item.decidedBy.fullName}
            tone="teal"
          />
        ) : null}
        {item.note ? (
          <FormFactTile
            icon={FileText}
            label={t("cases.inquiryNote")}
            value={item.note}
            tone="ink"
            className="sm:col-span-2"
          />
        ) : null}
      </div>
      <InquiryFiles
        files={item.files}
        filesPath={filesPath}
        onRemove={onRemove}
      />
      {onReopen ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={onReopen}
          >
            <RotateCcw className="size-4" aria-hidden />
            {t("cases.inquiryReopen")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

const IMAGE_NAME = /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i;
const AUDIO_NAME = /\.(webm|ogg|mp3|m4a|wav|aac)$/i;

function inquiryFileKind(
  file: CaseInquiryRow["files"][number],
): "image" | "audio" | "other" {
  const mime = file.mimeType?.toLowerCase() ?? "";
  const name = file.originalName ?? "";
  if (mime.startsWith("image/") || IMAGE_NAME.test(name)) return "image";
  if (
    mime.startsWith("audio/") ||
    (!mime.startsWith("video/") && AUDIO_NAME.test(name))
  )
    return "audio";
  return "other";
}

function useInquiryObjectUrl(href: string | null) {
  const [src, setSrc] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!href) {
      setSrc(undefined);
      setFailed(false);
      return;
    }
    let objectUrl: string | undefined;
    let cancelled = false;
    setFailed(false);
    void api
      .get<Blob>(href, { responseType: "blob" })
      .then((response) => {
        if (cancelled) return;
        const header = String(response.headers["content-type"] ?? "");
        const mime =
          header.split(";")[0].trim() ||
          response.data.type ||
          "application/octet-stream";
        const blob =
          response.data.type && response.data.type.split(";")[0] === mime
            ? response.data
            : new Blob([response.data], { type: mime });
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setSrc(undefined);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [href]);

  return { src, failed };
}

export function InquiryFiles({
  files,
  filesPath,
  onRemove,
}: {
  files: CaseInquiryRow["files"];
  filesPath: string;
  onRemove?: (fileId: string) => Promise<void>;
}) {
  if (!files.length) return null;
  return (
    <div className="flex flex-wrap items-start gap-3">
      {files.map((file) => (
        <InquiryFilePreview
          key={file.id}
          file={file}
          filesPath={filesPath}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

function InquiryFilePreview({
  file,
  filesPath,
  onRemove,
}: {
  file: CaseInquiryRow["files"][number];
  filesPath: string;
  onRemove?: (fileId: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const kind = inquiryFileKind(file);
  const label = file.originalName || t("cases.inquiryAttachment");
  const media = useInquiryObjectUrl(
    kind === "other" ? null : `${filesPath}/${file.id}`,
  );
  const src = media.src;
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);

  function askRemove() {
    confirmToast({
      title: t("cases.inquiryRemoveAttachmentConfirm"),
      confirmLabel: t("cases.inquiryRemoveAttachment"),
      cancelLabel: t("common.cancel"),
      confirmVariant: "danger",
      onConfirm: () => void remove(),
    });
  }

  async function remove() {
    if (!onRemove) return;
    try {
      await onRemove(file.id);
      toast.success(t("cases.inquiryAttachmentRemoved"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("cases.saveFailed")));
    }
  }

  const removeButton = onRemove ? (
    <Button
      type="button"
      variant="ghost"
      icon
      aria-label={t("cases.inquiryRemoveAttachment")}
      title={t("cases.inquiryRemoveAttachment")}
      onClick={askRemove}
    >
      <Trash2 className="size-4" aria-hidden />
    </Button>
  ) : null;

  if (kind === "image" && !broken && !media.failed) {
    return (
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          className="group relative size-28 cursor-zoom-in overflow-hidden rounded-2xl bg-white shadow-[0_6px_16px_rgba(46,189,182,0.12)] ring-1 ring-teal-200"
          aria-label={t("cases.inquiryDocEnlarge")}
          title={label}
          disabled={!src}
          onClick={() => setOpen(true)}
        >
          {src ? (
            <img
              src={src}
              alt=""
              className="size-full object-contain"
              onError={() => setBroken(true)}
            />
          ) : (
            <span className="block size-full animate-pulse bg-teal-50" />
          )}
        </button>
        {removeButton}
        {open && src ? (
          <InquiryImageLightbox
            src={src}
            alt={label}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </div>
    );
  }

  if (kind === "audio" && !media.failed) {
    return (
      <div className="flex items-start gap-1.5">
        <div className="flex min-w-64 max-w-sm flex-1 items-center gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-teal-200">
          <Mic className="size-4 shrink-0 text-teal-600" aria-hidden />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-[11px] text-ink-500">{label}</p>
            {src ? (
              <audio
                src={src}
                controls
                preload="metadata"
                className="h-10 w-full"
                dir="ltr"
              />
            ) : (
              <div
                className="h-10 animate-pulse rounded-xl bg-teal-50"
                aria-hidden
              />
            )}
          </div>
        </div>
        {removeButton}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-1.5">
      <button
        type="button"
        className="inline-flex max-w-full cursor-pointer items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm text-teal-800 ring-1 ring-teal-200"
        onClick={() => void openInquiryFile(file.id, filesPath)}
      >
        <FileText className="size-4 shrink-0 text-teal-600" aria-hidden />
        <span className="max-w-48 truncate">{label}</span>
      </button>
      {removeButton}
    </div>
  );
}

function InquiryImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat) return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-900/75 p-4"
      data-nested-dialog
      role="dialog"
      aria-modal="true"
      aria-label={t("cases.inquiryDocEnlarge")}
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute end-4 top-4 z-10 inline-flex size-10 cursor-pointer items-center justify-center rounded-full bg-white text-ink-800 shadow-md"
        aria-label={t("common.close")}
        onClick={onClose}
      >
        <X className="size-5" aria-hidden />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[min(92vw,72rem)] rounded-2xl object-contain shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      />
    </div>,
    document.body,
  );
}
