import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface QuickActionsProps {
  navigation: any;
}

const QuickActions: React.FC<QuickActionsProps> = ({ navigation }) => {
  const actions = [
    { icon: 'account-plus', label: 'Add Employee', screen: 'AddEmployee' },
    { icon: 'file-document', label: 'Create Report', screen: 'CreateReport' },
    { icon: 'calendar-clock', label: 'Attendance', screen: 'Attendance' },
    { icon: 'chart-bar', label: 'Analytics', screen: 'Analytics' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Actions</Text>

      <View style={styles.actionsGrid}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionButton}
            onPress={() => navigation.navigate(action.screen)}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name={action.icon as any}
                size={24}
                color="#1565C0"
              />
            </View>

            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default QuickActions;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  actionLabel: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
  },
});
