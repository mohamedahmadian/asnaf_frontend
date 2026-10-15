import { getPageMeta } from "./page-meta";
import {
  isCaseDetailsLocation,
  isPlacesCaseBrowse,
  menuPathMatches,
  normalizeMenuPath,
  sidebarMenuPathname,
} from "./nav-path";

export type BreadcrumbNavMenu = {
  path: string;
  nameKey: string;
  label?: string;
};

export type BreadcrumbNavModule = {
  nameKey: string;
  menus: BreadcrumbNavMenu[];
};

export type PageBreadcrumbItem = {
  to?: string;
  titleKey: string;
  label?: string;
};

const HOME_TITLE_KEY = "nav.home";
const FALLBACK_TITLE_KEY = "menus.overview";

function findLongestMenu(pathname: string, modules: BreadcrumbNavModule[], search = "") {
  const path = sidebarMenuPathname(pathname, search);
  let best:
    | {
        moduleNameKey: string;
        menuNameKey: string;
        menuPath: string;
        label?: string;
      }
    | undefined;
  for (const mod of modules) {
    for (const menu of mod.menus) {
      if (!menuPathMatches(path, menu.path, search)) continue;
      const menuPath = normalizeMenuPath(menu.path);
      if (!best || menuPath.length > best.menuPath.length) {
        best = {
          moduleNameKey: mod.nameKey,
          menuNameKey: menu.nameKey,
          menuPath,
          label: menu.label,
        };
      }
    }
  }
  return best;
}

function menuExists(modules: BreadcrumbNavModule[], menuPath: string) {
  const target = normalizeMenuPath(menuPath);
  return modules.some((mod) => mod.menus.some((menu) => normalizeMenuPath(menu.path) === target));
}

function findMenuByPath(modules: BreadcrumbNavModule[], menuPath: string) {
  const target = normalizeMenuPath(menuPath);
  for (const mod of modules) {
    for (const menu of mod.menus) {
      if (normalizeMenuPath(menu.path) !== target) continue;
      return {
        moduleNameKey: mod.nameKey,
        menuNameKey: menu.nameKey,
        menuPath: target,
        label: menu.label,
      };
    }
  }
  return undefined;
}

function pushUnique(crumbs: PageBreadcrumbItem[], next: PageBreadcrumbItem) {
  const last = crumbs[crumbs.length - 1];
  if (
    last &&
    last.titleKey === next.titleKey &&
    (last.label ?? "") === (next.label ?? "")
  ) {
    if (!last.to && next.to) last.to = next.to;
    return;
  }
  crumbs.push(next);
}

export function getPageBreadcrumbs(
  pathname: string,
  modules: BreadcrumbNavModule[] = [],
  search = "",
): PageBreadcrumbItem[] {
  const path = normalizeMenuPath(pathname);
  if (path === "/" || path === "/dashboard") {
    return [{ titleKey: HOME_TITLE_KEY }];
  }

  const crumbs: PageBreadcrumbItem[] = [{ to: "/dashboard", titleKey: HOME_TITLE_KEY }];
  const details = isCaseDetailsLocation(path, search);
  const placesBrowse =
    isPlacesCaseBrowse(path, search) &&
    !menuExists(modules, "/cases") &&
    !menuExists(modules, "/cases/formation");
  const match = placesBrowse
    ?       findMenuByPath(modules, "/cases/places") ??
      findMenuByPath(modules, "/cases/management-reviews") ??
      findMenuByPath(modules, "/cases/issuance") ??
      findLongestMenu(path, modules, search)
    : findLongestMenu(path, modules, search);

  if (match) {
    if (match.moduleNameKey !== match.menuNameKey) {
      pushUnique(crumbs, { titleKey: match.moduleNameKey });
    }
    pushUnique(crumbs, {
      to: match.menuPath === path ? undefined : match.menuPath,
      titleKey: match.menuNameKey,
      label: match.label,
    });
  }

  const startLen = match ? match.menuPath.split("/").filter(Boolean).length : 0;
  const segments = path.split("/").filter(Boolean);
  for (let i = startLen + 1; i <= segments.length; i++) {
    const prefix = `/${segments.slice(0, i).join("/")}`;
    const meta = getPageMeta(prefix);
    const titleKey = details && prefix === "/cases/formation" ? "cases.details" : meta.titleKey;
    if (titleKey === FALLBACK_TITLE_KEY) continue;
    pushUnique(crumbs, {
      to: prefix === path ? undefined : prefix,
      titleKey,
    });
  }

  if (crumbs.length === 1) {
    const meta = getPageMeta(path);
    pushUnique(crumbs, { titleKey: meta.titleKey });
  }

  const last = crumbs[crumbs.length - 1];
  if (last) last.to = undefined;
  return crumbs;
}
