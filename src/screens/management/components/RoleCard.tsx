import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Role } from '@/types';
import styles from '../styles';

interface RoleCardProps {
  role: Role;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  loadingRoleDetails: boolean;
  isTablet: boolean;
  isLargeTablet: boolean;
}

const RoleCard: React.FC<RoleCardProps> = ({
  role,
  onView,
  onEdit,
  onDelete,
  loadingRoleDetails,
  isTablet,
  isLargeTablet,
}) => {
  return (
    <View style={[styles.roleCard, isTablet && styles.roleCardTablet]}>
      <View style={styles.roleHeader}>
        <View style={[
          styles.roleIconContainer,
          role.role_type === 1 && styles.employeeIconContainer,
          role.role_type === 2 && styles.managerIconContainer,
          role.role_type === 4 && styles.superAdminIconContainer,
        ]}>
          <MaterialCommunityIcons
            name={
              role.role_type === 1 ? "account" :
              role.role_type === 2 ? "account-tie" :
              "shield-account"
            }
            size={isTablet ? 28 : 24}
            color={
              role.role_type === 1 ? "#C084FC" :
              role.role_type === 2 ? "#8B5CF6" :
              "#10B981"
            }
          />
        </View>
        <View style={styles.roleInfo}>
          <View style={styles.roleTitleRow}>
            <Text style={[styles.roleName, isTablet && styles.roleNameTablet]}>{role.role_name}</Text>
            {role.is_system_role && (
              <View style={styles.systemBadge}>
                <MaterialCommunityIcons name="shield-check" size={12} color="#FFFFFF" />
                <Text style={styles.systemBadgeText}>System</Text>
              </View>
            )}
          </View>
          <Text style={styles.roleDescription} numberOfLines={2}>
            {role.description || 'No description'}
          </Text>
          <View style={styles.roleMeta}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="layers" size={12} color="#64748B" />
              <Text style={styles.metaText}>
                {role.role_type === 1 ? 'Employee' :
                 role.role_type === 2 ? 'Manager' :
                 'Super Admin'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="chart-line" size={12} color="#64748B" />
              <Text style={styles.metaText}>Level {role.role_level}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="calendar" size={12} color="#64748B" />
              <Text style={styles.metaText}>
                {new Date(role.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.roleActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton]}
          onPress={onView}
          disabled={loadingRoleDetails}
        >
          <MaterialCommunityIcons name="eye" size={16} color="#64748B" />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={onEdit}
          disabled={role.is_system_role}
        >
          <MaterialCommunityIcons name="pencil" size={16} color="#64748B" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={onDelete}
          disabled={role.is_system_role}
        >
          <MaterialCommunityIcons name="delete" size={16} color="#EF4444" />
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RoleCard;