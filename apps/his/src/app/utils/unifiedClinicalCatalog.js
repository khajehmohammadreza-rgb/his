/**
 * Bastiyan HIS Unified Clinical Catalog Bridge
 * Bridges legacy imports to the unified clinical catalog engine.
 */
export * from './unifiedClinicalCatalog440.js?b=r24-514-1405';
import {
  classifyService440,
  catalogLabel440,
  makeCatalogEntry440,
  makeClinicalOrder440,
  makeServiceLine440,
  makeProductLine440,
  makeAppointment440,
  resolveDoctorNextStatus440,
  resolveNurseNextStatus440,
} from './unifiedClinicalCatalog440.js?b=r24-514-1405';

export const classifyService = classifyService440;
export const catalogLabel = catalogLabel440;
export const makeCatalogEntry = makeCatalogEntry440;
export const makeClinicalOrder = makeClinicalOrder440;
export const makeServiceLine = makeServiceLine440;
export const makeProductLine = makeProductLine440;
export const makeAppointment = makeAppointment440;
export const resolveDoctorNextStatus = resolveDoctorNextStatus440;
export const resolveNurseNextStatus = resolveNurseNextStatus440;
