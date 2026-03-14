/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as cases from "../cases.js";
import type * as doctors from "../doctors.js";
import type * as expenses from "../expenses.js";
import type * as inventory from "../inventory.js";
import type * as invoices from "../invoices.js";
import type * as payments from "../payments.js";
import type * as rates from "../rates.js";
import type * as reports from "../reports.js";
import type * as settings from "../settings.js";
import type * as shades from "../shades.js";
import type * as tasks from "../tasks.js";
import type * as technicians from "../technicians.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  cases: typeof cases;
  doctors: typeof doctors;
  expenses: typeof expenses;
  inventory: typeof inventory;
  invoices: typeof invoices;
  payments: typeof payments;
  rates: typeof rates;
  reports: typeof reports;
  settings: typeof settings;
  shades: typeof shades;
  tasks: typeof tasks;
  technicians: typeof technicians;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
