import { ChevronLeft, Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { currentPersianYear, formatNumber } from "../../lib/datetime";
import {
  getPageBreadcrumbs,
  type BreadcrumbNavModule,
} from "../../lib/page-breadcrumb";

export function PageBreadcrumb({
  pathname,
  modules,
}: {
  pathname: string;
  modules: BreadcrumbNavModule[];
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.split("-")[0] ?? "fa";
  const year = formatNumber(currentPersianYear(), locale);
  const crumbs = getPageBreadcrumbs(pathname, modules);

  return (
    <nav aria-label={t("nav.breadcrumb")} className="min-w-0 flex-1">
      <ol className="hidden min-w-0 flex-wrap items-center gap-x-1 gap-y-1 text-sm lg:flex">
        {crumbs.map((crumb, index) => {
          const label = crumb.label ?? t(crumb.titleKey, { year });
          const isLast = index === crumbs.length - 1;
          return (
            <li
              key={`${crumb.titleKey}-${index}`}
              className="flex min-w-0 max-w-full items-center gap-1"
            >
              {index > 0 ? (
                <ChevronLeft
                  className="size-3.5 shrink-0 text-ink-300 ltr:rotate-180"
                  aria-hidden
                />
              ) : null}
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  className="inline-flex max-w-[14rem] items-center gap-1 truncate rounded-lg px-1 py-0.5 text-ink-500 transition hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                >
                  {index === 0 ? (
                    <Home className="size-3.5 shrink-0" aria-hidden />
                  ) : null}
                  <span className="truncate">{label}</span>
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={`inline-flex max-w-[16rem] items-center gap-1 truncate px-1 py-0.5 ${
                    isLast ? "font-medium text-ink-900" : "text-ink-500"
                  }`}
                >
                  {index === 0 ? (
                    <Home
                      className={`size-3.5 shrink-0 ${isLast ? "text-teal-600" : ""}`}
                      aria-hidden
                    />
                  ) : null}
                  <span className="truncate">{label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
