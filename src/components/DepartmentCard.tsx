import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DepartmentCardProps {
  department: string;
  index: number;
  onPress: () => void;
}

const departmentIcons: Record<string, string> = {
  HR: 'account-group',
  Finance: 'cash',
  Accounting: 'calculator',
  Procurement: 'cart',
  Inventory: 'warehouse',
  Logistics: 'truck',
  Sales: 'chart-line',
  Marketing: 'bullhorn',
  'Customer Support': 'headset',
  Operations: 'cog',
  IT: 'desktop-classic',
  Production: 'factory',
  'Quality Control': 'check-circle',
  'Quality Assurance': 'shield-check',
  'R&D': 'flask',
  Administration: 'office-building',
  'Employee Management': 'account-multiple',
  'Manager Management': 'account-tie',
  'Company Management': 'domain',
  'Super Admin Management': 'security',
};

const departmentColors = [
  '#3B82F6',
  '#10B981',
  '#8B5CF6',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
  '#F97316',
  '#6366F1',
];

const DepartmentCard: React.FC<DepartmentCardProps> = ({
  department,
  index,
  onPress,
}) => {
  const icon = departmentIcons[department] || 'folder';
  const color = departmentColors[index % departmentColors.length];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        <MaterialCommunityIcons name={icon as any} size={28} color={color} />
      </View>

      <Text style={styles.departmentName} numberOfLines={2}>
        {department}
      </Text>

      <View style={styles.arrowContainer}>
        <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: '1%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  departmentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    minHeight: 40,
  },
  arrowContainer: {
    alignItems: 'flex-end',
  },
});

export default React.memo(DepartmentCard);
