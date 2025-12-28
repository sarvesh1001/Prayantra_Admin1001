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
  '#C084FC', // Purple
  '#A855F7',
  '#9333EA',
  '#7C3AED',
  '#6D28D9',
  '#5B21B6',
  '#4C1D95',
  '#3B0764',
  '#7E22CE',
  '#6B21A8',
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