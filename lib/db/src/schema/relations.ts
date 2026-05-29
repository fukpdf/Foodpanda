import { relations } from "drizzle-orm";
import { assignmentAttempts } from "./assignment-attempts.js";
import { authSessions } from "./auth-sessions.js";
import { auditLogs } from "./audit-logs.js";
import { customerAddresses } from "./customer-addresses.js";
import { deliveryProofs } from "./delivery-proofs.js";
import { dispatchEvents } from "./dispatch-events.js";
import { dispatches } from "./dispatches.js";
import { ordersFoundation } from "./orders.js";
import { paymentAttempts } from "./payment-attempts.js";
import { paymentEvents } from "./payment-events.js";
import { payments } from "./payments.js";
import { permissions, rolePermissions, userPermissions } from "./permissions.js";
import { refreshTokens } from "./refresh-tokens.js";
import { refunds } from "./refunds.js";
import { riderLocations } from "./rider-locations.js";
import { riders } from "./riders.js";
import { roles, userRoles } from "./roles.js";
import { userProfiles } from "./user-profiles.js";
import { users } from "./users.js";
import { vendorBranches } from "./vendor-branches.js";
import { vendors } from "./vendors.js";

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  sessions: many(authSessions),
  refreshTokens: many(refreshTokens),
  userRoles: many(userRoles),
  userPermissions: many(userPermissions),
  addresses: many(customerAddresses),
  vendor: one(vendors, {
    fields: [users.id],
    references: [vendors.ownerUserId],
  }),
  rider: one(riders, {
    fields: [users.id],
    references: [riders.userId],
  }),
  auditLogs: many(auditLogs),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
  referredBy: one(users, {
    fields: [userProfiles.referredByUserId],
    references: [users.id],
  }),
}));

export const authSessionsRelations = relations(authSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [authSessions.userId],
    references: [users.id],
  }),
  refreshTokens: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
  session: one(authSessions, {
    fields: [refreshTokens.sessionId],
    references: [authSessions.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userPermissions: many(userPermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, {
    fields: [userPermissions.userId],
    references: [users.id],
  }),
  permission: one(permissions, {
    fields: [userPermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  owner: one(users, {
    fields: [vendors.ownerUserId],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [vendors.approvedById],
    references: [users.id],
  }),
  branches: many(vendorBranches),
}));

export const vendorBranchesRelations = relations(vendorBranches, ({ one, many }) => ({
  vendor: one(vendors, {
    fields: [vendorBranches.vendorId],
    references: [vendors.id],
  }),
  orders: many(ordersFoundation),
}));

export const ridersRelations = relations(riders, ({ one, many }) => ({
  user: one(users, {
    fields: [riders.userId],
    references: [users.id],
  }),
  verifiedBy: one(users, {
    fields: [riders.verifiedById],
    references: [users.id],
  }),
  orders: many(ordersFoundation),
}));

export const customerAddressesRelations = relations(customerAddresses, ({ one, many }) => ({
  user: one(users, {
    fields: [customerAddresses.userId],
    references: [users.id],
  }),
  orders: many(ordersFoundation),
}));

export const ordersFoundationRelations = relations(ordersFoundation, ({ one }) => ({
  customer: one(users, {
    fields: [ordersFoundation.customerId],
    references: [users.id],
  }),
  vendorBranch: one(vendorBranches, {
    fields: [ordersFoundation.vendorBranchId],
    references: [vendorBranches.id],
  }),
  rider: one(riders, {
    fields: [ordersFoundation.riderId],
    references: [riders.id],
  }),
  deliveryAddress: one(customerAddresses, {
    fields: [ordersFoundation.deliveryAddressId],
    references: [customerAddresses.id],
  }),
  cancelledBy: one(users, {
    fields: [ordersFoundation.cancelledById],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  order: one(ordersFoundation, {
    fields: [payments.orderId],
    references: [ordersFoundation.id],
  }),
  customer: one(users, {
    fields: [payments.customerId],
    references: [users.id],
  }),
  attempts: many(paymentAttempts),
  events: many(paymentEvents),
  refunds: many(refunds),
}));

export const paymentAttemptsRelations = relations(paymentAttempts, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentAttempts.paymentId],
    references: [payments.id],
  }),
  order: one(ordersFoundation, {
    fields: [paymentAttempts.orderId],
    references: [ordersFoundation.id],
  }),
}));

export const paymentEventsRelations = relations(paymentEvents, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentEvents.paymentId],
    references: [payments.id],
  }),
  order: one(ordersFoundation, {
    fields: [paymentEvents.orderId],
    references: [ordersFoundation.id],
  }),
}));

export const refundsRelations = relations(refunds, ({ one }) => ({
  payment: one(payments, {
    fields: [refunds.paymentId],
    references: [payments.id],
  }),
  order: one(ordersFoundation, {
    fields: [refunds.orderId],
    references: [ordersFoundation.id],
  }),
  initiatedBy: one(users, {
    fields: [refunds.initiatedById],
    references: [users.id],
  }),
}));

export const dispatchesRelations = relations(dispatches, ({ one, many }) => ({
  order: one(ordersFoundation, {
    fields: [dispatches.orderId],
    references: [ordersFoundation.id],
  }),
  currentRider: one(riders, {
    fields: [dispatches.currentRiderId],
    references: [riders.id],
  }),
  events: many(dispatchEvents),
  attempts: many(assignmentAttempts),
  proofs: many(deliveryProofs),
}));

export const dispatchEventsRelations = relations(dispatchEvents, ({ one }) => ({
  dispatch: one(dispatches, {
    fields: [dispatchEvents.dispatchId],
    references: [dispatches.id],
  }),
  rider: one(riders, {
    fields: [dispatchEvents.riderId],
    references: [riders.id],
  }),
  actor: one(users, {
    fields: [dispatchEvents.actorId],
    references: [users.id],
  }),
}));

export const riderLocationsRelations = relations(riderLocations, ({ one }) => ({
  rider: one(riders, {
    fields: [riderLocations.riderId],
    references: [riders.id],
  }),
  order: one(ordersFoundation, {
    fields: [riderLocations.orderId],
    references: [ordersFoundation.id],
  }),
}));

export const assignmentAttemptsRelations = relations(assignmentAttempts, ({ one }) => ({
  dispatch: one(dispatches, {
    fields: [assignmentAttempts.dispatchId],
    references: [dispatches.id],
  }),
  rider: one(riders, {
    fields: [assignmentAttempts.riderId],
    references: [riders.id],
  }),
}));

export const deliveryProofsRelations = relations(deliveryProofs, ({ one }) => ({
  dispatch: one(dispatches, {
    fields: [deliveryProofs.dispatchId],
    references: [dispatches.id],
  }),
  rider: one(riders, {
    fields: [deliveryProofs.riderId],
    references: [riders.id],
  }),
}));
