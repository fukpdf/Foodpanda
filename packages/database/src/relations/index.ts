import { relations } from "drizzle-orm";
import { authSessions } from "../schemas/auth-sessions.js";
import { auditLogs } from "../schemas/audit-logs.js";
import { customerAddresses } from "../schemas/customer-addresses.js";
import { ordersFoundation } from "../schemas/orders.js";
import { permissions, rolePermissions, userPermissions } from "../schemas/permissions.js";
import { refreshTokens } from "../schemas/refresh-tokens.js";
import { riders } from "../schemas/riders.js";
import { roles, userRoles } from "../schemas/roles.js";
import { userProfiles } from "../schemas/user-profiles.js";
import { users } from "../schemas/users.js";
import { vendorBranches } from "../schemas/vendor-branches.js";
import { vendors } from "../schemas/vendors.js";

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
