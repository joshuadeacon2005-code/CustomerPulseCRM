import type { Customer } from "@shared/schema";

export interface NSCustomer {
  id: string;
  entityid: string;
  companyname?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  defaultaddress?: string;
  country?: { id: string };
}

export interface NSSalesOrder {
  id: string;
  tranid: string;
  entity: { id: string };
  total?: number;
  foreigntotal?: number;
  currency?: { id: string; refname?: string };
  trandate: string;
  status?: { id: string };
  item?: { items: NSOrderLine[] };
}

export interface NSOrderLine {
  item?: { id: string; refname?: string };
  quantity?: number;
  rate?: number;
  amount?: number;
}

export interface NSItem {
  id: string;
  itemid: string;
  displayname?: string;
  salesprice?: number;
  currency?: { id: string };
  itemtype?: string;
  isinactive?: boolean;
}

const NS_COUNTRY_MAP: Record<string, string> = {
  AU: "Australia",
  BN: "Brunei",
  CN: "China",
  HK: "Hong Kong",
  ID: "Indonesia",
  JP: "Japan",
  MO: "Macau",
  MY: "Malaysia",
  NZ: "New Zealand",
  PH: "Philippines",
  SG: "Singapore",
  KR: "South Korea",
  TW: "Taiwan",
  TH: "Thailand",
  VN: "Vietnam",
};

export function nsCustomerToCrmPatch(ns: NSCustomer): Partial<Customer> {
  const name =
    ns.companyname ||
    `${ns.firstname ?? ""} ${ns.lastname ?? ""}`.trim() ||
    ns.entityid;
  const country = ns.country?.id
    ? (NS_COUNTRY_MAP[ns.country.id.toUpperCase()] ?? "Other")
    : undefined;

  return {
    name,
    email: ns.email ?? undefined,
    phone: ns.phone ?? undefined,
    country,
    netsuiteUrl: `https://system.netsuite.com/app/common/entity/custjob.nl?id=${ns.id}`,
  };
}

export interface InsertNetsuiteOrder {
  nsOrderId: string;
  tranId: string | null;
  customerId: string | null;
  nsCustomerId: string;
  amount: string | null;
  currency: string;
  status: string | null;
  tranDate: Date | null;
  items: string | null;
}

export function nsSalesOrderToCrmOrder(
  ns: NSSalesOrder,
  crmCustomerId?: string
): InsertNetsuiteOrder {
  const lines = ns.item?.items ?? [];
  const itemsJson =
    lines.length > 0
      ? JSON.stringify(
          lines.map((l) => ({
            item: l.item?.refname ?? l.item?.id,
            qty: l.quantity,
            rate: l.rate,
            amount: l.amount,
          }))
        )
      : null;

  return {
    nsOrderId: ns.id,
    tranId: ns.tranid ?? null,
    customerId: crmCustomerId ?? null,
    nsCustomerId: ns.entity.id,
    amount:
      ns.total != null
        ? String(ns.total)
        : ns.foreigntotal != null
        ? String(ns.foreigntotal)
        : null,
    currency: ns.currency?.refname ?? ns.currency?.id ?? "USD",
    status: ns.status?.id ?? null,
    tranDate: ns.trandate ? new Date(ns.trandate) : null,
    items: itemsJson,
  };
}

export interface InsertNetsuiteProduct {
  nsItemId: string;
  itemId: string | null;
  displayName: string | null;
  salePrice: string | null;
  currency: string;
  itemType: string | null;
  isActive: boolean;
}

export function nsItemToCrmProduct(ns: NSItem): InsertNetsuiteProduct {
  return {
    nsItemId: ns.id,
    itemId: ns.itemid ?? null,
    displayName: ns.displayname ?? null,
    salePrice: ns.salesprice != null ? String(ns.salesprice) : null,
    currency: ns.currency?.id ?? "USD",
    itemType: ns.itemtype ?? null,
    isActive: !ns.isinactive,
  };
}
