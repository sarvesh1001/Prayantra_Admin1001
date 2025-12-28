import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface StatsOverviewProps {
  dailyQuota: {
    limit: number;
    remaining: number;
    used: number;
  };
  permissions: number;
  departments: number;
  isLoading: boolean;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({
  dailyQuota,
  permissions,
  departments,
  isLoading,
}) => {
  const stats = [
    {
      icon: 'shield-check',
      label: 'Permissions',
      value: permissions.toString(),
      color: '#10B981',
      bgColor: '#D1FAE5',
    },
    {
      icon: 'office-building',
      label: 'Departments',
      value: departments.toString(),
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
    },
    {
      icon: 'chart-bar',
      label: 'Quota Used',
      value: dailyQuota.used.toString(),
      color: '#F59E0B',
      bgColor: '#FEF3C7',
    },
    {
      icon: 'clock-outline',
      label: 'Quota Left',
      value: dailyQuota.remaining.toString(),
      color: '#3B82F6',
      bgColor: '#DBEAFE',
    },
  ];

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading stats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Overview</Text>

      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: stat.bgColor },
              ]}
            >
              <MaterialCommunityIcons
                name={stat.icon as any}
                size={20}
                color={stat.color}
              />
            </View>

            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default StatsOverview;

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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
  },
});
