 // components/AdminCard.tsx
 import React from 'react';
 import { View, Text, TouchableOpacity } from 'react-native';
 import { MaterialCommunityIcons } from '@expo/vector-icons';
 import { Admin } from '@/types';
 import styles from '../styles';
 
 interface AdminCardProps {
   admin: Admin;
   onView: () => void;
   onEdit: () => void;
   onDelete: () => void;
   onToggleStatus: () => void;
   onChangePhone: () => void;
   onChangeMPIN: () => void;
   onUpdateReportsTo: () => void;
   loadingAdminDetails: boolean;
   isTablet: boolean;
   isLargeTablet: boolean;
 }
 
 const AdminCard: React.FC<AdminCardProps> = ({
   admin,
   onView,
   onEdit,
   onDelete,
   onToggleStatus,
   onChangePhone,
   onChangeMPIN,
   onUpdateReportsTo,
   loadingAdminDetails,
   isTablet,
   isLargeTablet,
 }) => {
   return (
     <View style={[styles.adminCard, isTablet && styles.adminCardTablet]}>
       <View style={styles.adminHeader}>
         <View style={[
           styles.adminIconContainer,
           admin.role_type === 1 && styles.employeeIconContainer,
           admin.role_type === 2 && styles.managerIconContainer,
           admin.role_type === 4 && styles.superAdminIconContainer,
         ]}>
           <MaterialCommunityIcons
             name={
               admin.role_type === 1 ? "account" :
               admin.role_type === 2 ? "account-tie" :
               "shield-account"
             }
             size={isTablet ? 28 : 24}
             color={
               admin.role_type === 1 ? "#C084FC" :
               admin.role_type === 2 ? "#8B5CF6" :
               "#10B981"
             }
           />
         </View>
         <View style={styles.adminInfo}>
           <View style={styles.adminTitleRow}>
             <Text style={[styles.adminName, isTablet && styles.adminNameTablet]}>
               {admin.full_name}
             </Text>
             <View style={styles.adminStatusContainer}>
               {admin.is_active ? (
                 <View style={styles.activeBadge}>
                   <MaterialCommunityIcons name="check-circle" size={12} color="#10B981" />
                   <Text style={styles.activeBadgeText}>Active</Text>
                 </View>
               ) : (
                 <View style={styles.inactiveBadge}>
                   <MaterialCommunityIcons name="close-circle" size={12} color="#EF4444" />
                   <Text style={styles.inactiveBadgeText}>Inactive</Text>
                 </View>
               )}
             </View>
           </View>
           <Text style={styles.adminUsername} numberOfLines={1}>
             @{admin.username}
           </Text>
           <View style={styles.adminMeta}>
             <View style={styles.metaItem}>
               <MaterialCommunityIcons name="shield" size={12} color="#64748B" />
               <Text style={styles.metaText}>
                 {admin.role_name}
               </Text>
             </View>
             <View style={styles.metaItem}>
               <MaterialCommunityIcons name="calendar" size={12} color="#64748B" />
               <Text style={styles.metaText}>
                 {new Date(admin.admin_created_at).toLocaleDateString()}
               </Text>
             </View>
             <View style={styles.metaItem}>
               <MaterialCommunityIcons name="clock" size={12} color="#64748B" />
               <Text style={styles.metaText}>
                 {admin.last_login ? new Date(admin.last_login).toLocaleDateString() : 'Never'}
               </Text>
             </View>
           </View>
           {admin.reports_to_name && (
             <View style={styles.reportsToContainer}>
               <MaterialCommunityIcons name="account-arrow-right" size={12} color="#8B5CF6" />
               <Text style={styles.reportsToText}>
                 Reports to: {admin.reports_to_name}
               </Text>
             </View>
           )}
         </View>
       </View>
       <View style={styles.adminActions}>
         <TouchableOpacity
           style={[styles.actionButton, styles.viewButton]}
           onPress={onView}
           disabled={loadingAdminDetails}
         >
           <MaterialCommunityIcons name="eye" size={16} color="#64748B" />
           <Text style={styles.actionButtonText}>View</Text>
         </TouchableOpacity>
         <TouchableOpacity
           style={[styles.actionButton, styles.editButton]}
           onPress={onEdit}
         >
           <MaterialCommunityIcons name="pencil" size={16} color="#64748B" />
           <Text style={styles.actionButtonText}>Edit</Text>
         </TouchableOpacity>
         <TouchableOpacity
           style={[styles.actionButton, styles.settingsButton]}
           onPress={onChangePhone}
         >
           <MaterialCommunityIcons name="phone" size={16} color="#64748B" />
           <Text style={styles.actionButtonText}>Phone</Text>
         </TouchableOpacity>
       </View>
     </View>
   );
 };
 
 export default AdminCard;